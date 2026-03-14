import type {
  ArtistMetadataCache,
  CatalogRelease,
  CollectionGap,
  LibraryAlbum,
  LibraryArtist,
  LibraryInventory,
  MissingDiscographyItem,
  NewReleaseItem,
  ScanReport,
  SimilarArtistItem,
  WishlistItem
} from "@/lib/types";
import { normalizeText, sameAlbum, sameArtist } from "@/lib/normalize";

const ARTIST_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function genreCounts(albums: LibraryAlbum[]) {
  const counts = new Map<string, number>();

  for (const album of albums) {
    if (!album.genre) {
      continue;
    }

    counts.set(album.genre, (counts.get(album.genre) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, count]) => ({ name, count }));
}

export function buildInventory(albums: LibraryAlbum[]): LibraryInventory {
  const artistMap = new Map<string, LibraryArtist>();

  for (const album of albums) {
    const key = album.artist.toLowerCase();
    const existing = artistMap.get(key);

    if (existing) {
      existing.albums.push(album);
      existing.albumCount += 1;
      if (album.genre && !existing.genres.includes(album.genre)) {
        existing.genres.push(album.genre);
      }
      continue;
    }

    artistMap.set(key, {
      id: album.artistId || album.id,
      name: album.artist,
      albumCount: 1,
      albums: [album],
      genres: album.genre ? [album.genre] : []
    });
  }

  const artists = [...artistMap.values()].sort((left, right) => right.albumCount - left.albumCount);

  return {
    artists,
    albums,
    genres: genreCounts(albums)
  };
}

export function isArtistCacheStale(fetchedAt?: string): boolean {
  if (!fetchedAt) {
    return true;
  }

  const timestamp = new Date(fetchedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > ARTIST_CACHE_TTL_MS;
}

function isRecentRelease(date: string | undefined, recentWindowDays: number): boolean {
  if (!date) {
    return false;
  }

  const releaseDate = new Date(date);
  if (Number.isNaN(releaseDate.getTime())) {
    return false;
  }

  const cutoff = Date.now() - recentWindowDays * 24 * 60 * 60 * 1000;
  return releaseDate.getTime() >= cutoff;
}

function buildCollectionGaps(
  inventory: LibraryInventory,
  missing: MissingDiscographyItem[],
  newReleases: NewReleaseItem[],
  wishlist: WishlistItem[]
): CollectionGap[] {
  const gaps: CollectionGap[] = [];
  const oneAlbumArtists = inventory.artists.filter((artist) => artist.albumCount === 1);

  if (missing.length) {
    const totalMissing = missing.reduce((count, item) => count + item.missing.length, 0);
    gaps.push({
      title: "Completion pass waiting",
      detail: `${missing.length} artists are incomplete across the full library, with ${totalMissing} missing releases queued for review.`
    });
  }

  if (oneAlbumArtists.length >= 5) {
    gaps.push({
      title: "One-album footholds",
      detail: `${oneAlbumArtists.length} artists only have one album in your library, which is a strong signal for essential-album recommendations.`
    });
  }

  if (newReleases.length) {
    gaps.push({
      title: "Fresh releases not in hand",
      detail: `${newReleases.length} recent releases from artists you already collect are still missing from the library.`
    });
  }

  if (!wishlist.length && (missing.length || newReleases.length)) {
    gaps.push({
      title: "No acquisition queue yet",
      detail: "Start saving albums and artists to the wishlist so the dashboard can feed the rest of your stack."
    });
  }

  if (!gaps.length) {
    gaps.push({
      title: "Healthy baseline",
      detail: "No major collection gaps surfaced right now, so discovery rows can do more of the work."
    });
  }

  return gaps;
}

export function buildScanReport(params: {
  inventory: LibraryInventory;
  cache: ArtistMetadataCache;
  wishlist: WishlistItem[];
  recentReleaseWindowDays: number;
}): ScanReport {
  const { inventory, cache, wishlist, recentReleaseWindowDays } = params;
  const ownedArtistNames = inventory.artists.map((artist) => artist.name);
  const missingDiscography: MissingDiscographyItem[] = [];
  const newReleases: NewReleaseItem[] = [];
  const similarArtists: SimilarArtistItem[] = [];
  let catalogCoverageArtists = 0;

  for (const artist of inventory.artists) {
    const entry = cache[normalizeText(artist.name)] || null;
    const catalog = entry?.catalog || [];

    if (catalog.length) {
      catalogCoverageArtists += 1;

      const ownedAlbums = artist.albums.map((album) => album.title);
      const missing = catalog.filter(
        (release) => !ownedAlbums.some((ownedTitle) => sameAlbum(ownedTitle, release.title))
      );

      if (missing.length) {
        missingDiscography.push({
          artist: artist.name,
          ownedCount: ownedAlbums.length,
          knownCount: catalog.length,
          ownedAlbums,
          missing: missing.slice(0, 6)
        });
      }

      for (const release of missing) {
        if (isRecentRelease(release.date, recentReleaseWindowDays)) {
          newReleases.push({
            artist: artist.name,
            title: release.title,
            type: release.type,
            date: release.date || "Unknown",
            source: "musicbrainz"
          });
        }
      }
    }

    for (const candidate of entry?.similarArtists || []) {
      if (ownedArtistNames.some((owned) => sameArtist(owned, candidate.name))) {
        continue;
      }

      const duplicate = similarArtists.some(
        (existing) => sameArtist(existing.artist, candidate.name) && sameArtist(existing.seedArtist, artist.name)
      );

      if (!duplicate) {
        similarArtists.push({
          seedArtist: artist.name,
          artist: candidate.name,
          source: candidate.source,
          reason:
            candidate.source === "navidrome"
              ? `Navidrome linked ${candidate.name} to ${artist.name}.`
              : `Last.fm linked ${candidate.name} to ${artist.name}.`
        });
      }
    }
  }

  const dedupedNewReleases = newReleases.filter(
    (release, index, list) =>
      index ===
      list.findIndex(
        (entry) => sameArtist(entry.artist, release.artist) && sameAlbum(entry.title, release.title)
      )
  );

  const sortedMissing = missingDiscography
    .sort((left, right) => right.missing.length - left.missing.length || right.knownCount - left.knownCount)
    .slice(0, 24);
  const totalMissingReleaseCount = missingDiscography.reduce((count, item) => count + item.missing.length, 0);

  const sortedSimilar = similarArtists.slice(0, 36);

  const notes = [
    `Scanned the full Navidrome library: ${inventory.artists.length} artists and ${inventory.albums.length} albums.`,
    `${catalogCoverageArtists} artists currently have cached external metadata powering completion and release tracking.`,
    "Metadata refresh runs in the background and the dashboard updates itself as cached artist data gets refreshed."
  ];

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalArtists: inventory.artists.length,
      totalAlbums: inventory.albums.length,
      catalogCoverageArtists,
      missingReleases: totalMissingReleaseCount,
      newReleases: dedupedNewReleases.length,
      wishlistCount: wishlist.length
    },
    overview: {
      topGenres: inventory.genres.slice(0, 8),
      topArtists: inventory.artists.slice(0, 12).map((artist) => ({
        name: artist.name,
        albumCount: artist.albumCount
      }))
    },
    missingDiscography: sortedMissing,
    newReleases: dedupedNewReleases
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 24),
    similarArtists: sortedSimilar,
    collectionGaps: buildCollectionGaps(inventory, sortedMissing, dedupedNewReleases, wishlist),
    notes
  };
}

import type {
  ArtistMetadataCache,
  ArtistTopTrackItem,
  CatalogRelease,
  CollectionGap,
  LibraryAlbum,
  LibraryArtist,
  LibraryInventory,
  LibraryTrack,
  MissingDiscographyItem,
  NewReleaseItem,
  RecommendedSongItem,
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
  similarSongs: RecommendedSongItem[],
  similarArtists: SimilarArtistItem[],
  wishlist: WishlistItem[]
): CollectionGap[] {
  const gaps: CollectionGap[] = [];
  const oneAlbumArtists = inventory.artists.filter((artist) => artist.albumCount === 1);

  if (similarSongs.length < 12) {
    gaps.push({
      title: "Recommendation depth can grow",
      detail: "Star a few songs in Navidrome and add a Last.fm API key to unlock stronger track-to-track recommendations."
    });
  }

  if (oneAlbumArtists.length >= 8) {
    gaps.push({
      title: "Lots of artists with only one album",
      detail: `${oneAlbumArtists.length} artists are just footholds in your library, which is a good place to surface deeper track picks next.`
    });
  }

  if (!wishlist.length && (similarSongs.length || similarArtists.length)) {
    gaps.push({
      title: "Discovery is not feeding your queue yet",
      detail: "Save songs or artists from the recommendation rows so discovery turns into a real wanted list."
    });
  }

  if (!gaps.length) {
    gaps.push({
      title: "Recommendation coverage looks healthy",
      detail: "The current library has enough metadata to keep the discovery rows populated."
    });
  }

  return gaps;
}

function buildSimilarArtists(
  inventory: LibraryInventory,
  cache: ArtistMetadataCache
): SimilarArtistItem[] {
  const ownedArtistNames = inventory.artists.map((artist) => artist.name);
  const similarArtists: SimilarArtistItem[] = [];

  for (const artist of inventory.artists.slice(0, 18)) {
    const entry = cache[normalizeText(artist.name)] || null;

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
              ? `If you like ${artist.name}, Navidrome points toward ${candidate.name}.`
              : `Last.fm listeners who play ${artist.name} also drift toward ${candidate.name}.`
        });
      }
    }
  }

  return similarArtists.slice(0, 30);
}

function buildArtistTopTracks(
  inventory: LibraryInventory,
  cache: ArtistMetadataCache
): ArtistTopTrackItem[] {
  const picks: ArtistTopTrackItem[] = [];

  for (const artist of inventory.artists.slice(0, 16)) {
    const entry = cache[normalizeText(artist.name)] || null;

    for (const track of entry?.topTracks || []) {
      const duplicate = picks.some(
        (existing) => sameArtist(existing.artist, track.artist) && normalizeText(existing.title) === normalizeText(track.title)
      );

      if (!duplicate) {
        picks.push({
          artist: track.artist,
          title: track.title,
          playcount: track.playcount,
          listeners: track.listeners,
          source: "lastfm"
        });
      }
    }
  }

  return picks.slice(0, 28);
}

function buildSimilarSongs(
  starredSongs: LibraryTrack[],
  similarSongSeeds: RecommendedSongItem[]
): RecommendedSongItem[] {
  const seeds = starredSongs.slice(0, 8);
  const deduped: RecommendedSongItem[] = [];

  for (const item of similarSongSeeds) {
    const duplicate = deduped.some(
      (existing) =>
        sameArtist(existing.artist, item.artist) && normalizeText(existing.title) === normalizeText(item.title)
    );

    const isAlreadyStarred = seeds.some(
      (seed) => sameArtist(seed.artist, item.artist) && normalizeText(seed.title) === normalizeText(item.title)
    );

    if (!duplicate && !isAlreadyStarred) {
      deduped.push(item);
    }
  }

  return deduped
    .sort((left, right) => (right.matchScore || 0) - (left.matchScore || 0))
    .slice(0, 30);
}

export function buildScanReport(params: {
  inventory: LibraryInventory;
  cache: ArtistMetadataCache;
  wishlist: WishlistItem[];
  recentReleaseWindowDays: number;
  starredSongs: LibraryTrack[];
  similarSongSeeds: RecommendedSongItem[];
}): ScanReport {
  const { inventory, cache, wishlist, recentReleaseWindowDays, starredSongs, similarSongSeeds } = params;
  const missingDiscography: MissingDiscographyItem[] = [];
  const newReleases: NewReleaseItem[] = [];
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
          missing: missing.slice(0, 4)
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
  }

  const dedupedNewReleases = newReleases.filter(
    (release, index, list) =>
      index ===
      list.findIndex(
        (entry) => sameArtist(entry.artist, release.artist) && sameAlbum(entry.title, release.title)
      )
  );

  const similarArtists = buildSimilarArtists(inventory, cache);
  const artistTopTracks = buildArtistTopTracks(inventory, cache);
  const similarSongs = buildSimilarSongs(starredSongs, similarSongSeeds);

  const notes = [
    `Scanned the full Navidrome library: ${inventory.artists.length} artists and ${inventory.albums.length} albums.`,
    `${catalogCoverageArtists} artists currently have cached external metadata.`,
    starredSongs.length
      ? `Using ${Math.min(starredSongs.length, 8)} starred songs as taste seeds for similar-song recommendations.`
      : "No starred songs found in Navidrome yet, so similar-song rows will stay lighter until you seed a few favorites."
  ];

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalArtists: inventory.artists.length,
      totalAlbums: inventory.albums.length,
      catalogCoverageArtists,
      missingReleases: missingDiscography.reduce((count, item) => count + item.missing.length, 0),
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
    missingDiscography: missingDiscography
      .sort((left, right) => right.missing.length - left.missing.length)
      .slice(0, 10),
    newReleases: dedupedNewReleases
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 12),
    similarArtists,
    similarSongs,
    artistTopTracks,
    starredSongs: starredSongs.slice(0, 12),
    collectionGaps: buildCollectionGaps(inventory, similarSongs, similarArtists, wishlist),
    notes
  };
}

import type {
  AppConfig,
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
import { sameAlbum, sameArtist } from "@/lib/normalize";
import { fetchSimilarArtists } from "@/lib/lastfm";
import { fetchArtistCatalog } from "@/lib/musicbrainz";
import { NavidromeClient } from "@/lib/navidrome";

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
      detail: `${missing.length} of your scanned artists are incomplete, with ${totalMissing} missing releases worth reviewing first.`
    });
  }

  if (oneAlbumArtists.length >= 5) {
    gaps.push({
      title: "A lot of one-album footholds",
      detail: `${oneAlbumArtists.length} artists only have one album in your library, which is a great place to surface essentials or deeper cuts next.`
    });
  }

  if (newReleases.length) {
    gaps.push({
      title: "Fresh releases not in hand",
      detail: `${newReleases.length} recent release groups from artists you already collect are missing from the library.`
    });
  }

  if (!wishlist.length && (missing.length || newReleases.length)) {
    gaps.push({
      title: "No acquisition queue yet",
      detail: "Start saving albums and artists to the wishlist so your discovery feed turns into an actual collection backlog."
    });
  }

  if (!gaps.length) {
    gaps.push({
      title: "Healthy baseline",
      detail: "Your scan did not find any obvious collection gaps in the sampled artists, so you can lean into discovery next."
    });
  }

  return gaps;
}

async function fetchSimilarArtistCandidates(
  navidrome: NavidromeClient,
  artist: LibraryArtist,
  config: AppConfig,
  ownedArtistNames: string[]
): Promise<SimilarArtistItem[]> {
  const recommendations: SimilarArtistItem[] = [];
  let navidromeResults: string[] = [];

  if (artist.id) {
    try {
      navidromeResults = await navidrome.similarArtists(artist.id, 5);
    } catch {
      navidromeResults = [];
    }
  }

  for (const similar of navidromeResults) {
    if (ownedArtistNames.some((owned) => sameArtist(owned, similar))) {
      continue;
    }

    recommendations.push({
      seedArtist: artist.name,
      artist: similar,
      source: "navidrome",
      reason: `Navidrome surfaced ${similar} from ${artist.name}'s similarity graph.`
    });
  }

  if (!recommendations.length && config.integrations.lastfmApiKey) {
    try {
      const lastfmResults = await fetchSimilarArtists(artist.name, config.integrations.lastfmApiKey, 5);

      for (const similar of lastfmResults) {
        if (ownedArtistNames.some((owned) => sameArtist(owned, similar))) {
          continue;
        }

        recommendations.push({
          seedArtist: artist.name,
          artist: similar,
          source: "lastfm",
          reason: `Last.fm found ${similar} as a strong neighbor to ${artist.name}.`
        });
      }
    } catch {
      return recommendations;
    }
  }

  return recommendations;
}

export async function buildScanReport(params: {
  albums: LibraryAlbum[];
  config: AppConfig;
  wishlist: WishlistItem[];
}): Promise<ScanReport> {
  const { albums, config, wishlist } = params;
  const inventory = buildInventory(albums);
  const navidrome = new NavidromeClient(config.navidrome);
  const ownedArtistNames = inventory.artists.map((artist) => artist.name);
  const scannedArtists = inventory.artists.slice(0, config.preferences.artistScanLimit);
  const missingDiscography: MissingDiscographyItem[] = [];
  const newReleases: NewReleaseItem[] = [];
  const similarArtists: SimilarArtistItem[] = [];
  const notes: string[] = [
    `Scanned ${scannedArtists.length} artists with the deepest album counts to keep external lookups practical.`,
    "MusicBrainz powers release completion and new-release checks. Similar artists come from Navidrome if available, then Last.fm if you add an API key."
  ];

  for (const artist of scannedArtists) {
    let catalog: CatalogRelease[] = [];

    try {
      catalog = await fetchArtistCatalog(artist.name);
    } catch {
      notes.push(`MusicBrainz lookup failed for ${artist.name}, so that artist was skipped.`);
      catalog = [];
    }

    if (catalog.length) {
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
          missing: missing.slice(0, 8)
        });
      }

      for (const release of missing) {
        if (isRecentRelease(release.date, config.preferences.recentReleaseWindowDays)) {
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

    const candidates = await fetchSimilarArtistCandidates(navidrome, artist, config, ownedArtistNames);

    for (const candidate of candidates) {
      const duplicate = similarArtists.some(
        (existing) => sameArtist(existing.artist, candidate.artist) && sameArtist(existing.seedArtist, candidate.seedArtist)
      );

      if (!duplicate) {
        similarArtists.push(candidate);
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

  return {
    generatedAt: new Date().toISOString(),
    stats: {
      totalArtists: inventory.artists.length,
      totalAlbums: inventory.albums.length,
      scannedArtists: scannedArtists.length,
      missingReleases: missingDiscography.reduce((count, item) => count + item.missing.length, 0),
      newReleases: dedupedNewReleases.length,
      wishlistCount: wishlist.length
    },
    overview: {
      topGenres: inventory.genres.slice(0, 5),
      topArtists: inventory.artists.slice(0, 8).map((artist) => ({
        name: artist.name,
        albumCount: artist.albumCount
      }))
    },
    missingDiscography: missingDiscography.slice(0, 8),
    newReleases: dedupedNewReleases
      .sort((left, right) => right.date.localeCompare(left.date))
      .slice(0, 10),
    similarArtists: similarArtists.slice(0, 16),
    collectionGaps: buildCollectionGaps(inventory, missingDiscography, dedupedNewReleases, wishlist),
    notes
  };
}

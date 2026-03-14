import crypto from "node:crypto";

import { buildInventory, buildScanReport, isArtistCacheStale } from "@/lib/analysis";
import {
  getArtistCacheKey,
  loadArtistCache,
  saveArtistCache,
  upsertArtistCacheEntry
} from "@/lib/artist-cache-store";
import { hasNavidromeConfig, loadConfig, toDisplayConfig } from "@/lib/config-store";
import { fetchArtistTopTracks, fetchSimilarArtists, fetchSimilarTracks } from "@/lib/lastfm";
import { fetchArtistCatalog } from "@/lib/musicbrainz";
import { NavidromeClient } from "@/lib/navidrome";
import { loadReport, saveReport } from "@/lib/report-store";
import { dispatchWishlistItem } from "@/lib/request-target";
import { loadScanState, saveScanState } from "@/lib/scan-state-store";
import type {
  ArtistMetadataCacheEntry,
  LibraryTrack,
  RecommendedSongItem,
  ScanState,
  StoredState,
  WishlistItem
} from "@/lib/types";
import { loadWishlist, saveWishlist } from "@/lib/wishlist-store";

let activeScan: Promise<void> | null = null;

function reportIsStale(generatedAt: string | undefined, autoRefreshHours: number): boolean {
  if (!generatedAt) {
    return true;
  }

  const timestamp = new Date(generatedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > autoRefreshHours * 60 * 60 * 1000;
}

async function saveProgressState(state: Partial<ScanState> & Pick<ScanState, "message" | "phase">) {
  const current = await loadScanState();
  await saveScanState({
    ...current,
    ...state
  });
}

async function fetchArtistMetadata(params: {
  navidrome: NavidromeClient;
  artistName: string;
  artistId: string;
  lastfmApiKey?: string;
}): Promise<ArtistMetadataCacheEntry> {
  const { navidrome, artistName, artistId, lastfmApiKey } = params;
  const catalog = await fetchArtistCatalog(artistName);
  let similarArtists: ArtistMetadataCacheEntry["similarArtists"] = [];
  let topTracks: ArtistMetadataCacheEntry["topTracks"] = [];

  try {
    const navidromeSimilar = artistId ? await navidrome.similarArtists(artistId, 6) : [];
    similarArtists = navidromeSimilar.map((name) => ({
      name,
      source: "navidrome" as const
    }));
  } catch {
    similarArtists = [];
  }

  if (!similarArtists.length && lastfmApiKey) {
    try {
      const lastfmSimilar = await fetchSimilarArtists(artistName, lastfmApiKey, 6);
      similarArtists = lastfmSimilar.map((name) => ({
        name,
        source: "lastfm" as const
      }));
    } catch {
      similarArtists = [];
    }
  }

  if (lastfmApiKey) {
    try {
      const tracks = await fetchArtistTopTracks(artistName, lastfmApiKey, 4);
      topTracks = tracks.map((track) => ({
        title: track.title,
        artist: track.artist,
        playcount: track.playcount,
        listeners: track.listeners
      }));
    } catch {
      topTracks = [];
    }
  }

  return {
    artistName,
    fetchedAt: new Date().toISOString(),
    catalog,
    similarArtists,
    topTracks
  };
}

async function buildSimilarSongSeeds(params: {
  apiKey?: string;
  starredSongs: LibraryTrack[];
}): Promise<RecommendedSongItem[]> {
  const { apiKey, starredSongs } = params;

  if (!apiKey) {
    return [];
  }

  const recommendations: RecommendedSongItem[] = [];

  for (const seed of starredSongs.slice(0, 8)) {
    try {
      const similar = await fetchSimilarTracks(seed.artist, seed.title, apiKey, 5);

      for (const item of similar) {
        recommendations.push({
          seedTitle: seed.title,
          seedArtist: seed.artist,
          title: item.title,
          artist: item.artist,
          matchScore: item.matchScore,
          source: "lastfm",
          reason: `Because you starred ${seed.title} by ${seed.artist}.`
        });
      }
    } catch {
      // Skip seeds that fail without interrupting the full scan.
    }
  }

  return recommendations;
}

async function performScan(): Promise<void> {
  const [config, wishlist] = await Promise.all([loadConfig(), loadWishlist()]);

  if (!hasNavidromeConfig(config)) {
    throw new Error("Save your Navidrome settings first.");
  }

  const navidrome = new NavidromeClient(config.navidrome);
  await saveScanState({
    isScanning: true,
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    processedArtists: 0,
    totalArtists: 0,
    phase: "library",
    message: "Loading the full Navidrome library..."
  });

  await navidrome.ping();
  const albums = await navidrome.fetchAllAlbums();
  const starredSongs = await navidrome.fetchStarredSongs().catch(() => []);
  const inventory = buildInventory(albums);
  let cache = await loadArtistCache();
  const initialSimilarSongSeeds = await buildSimilarSongSeeds({
    apiKey: config.integrations.lastfmApiKey,
    starredSongs
  });

  await saveScanState({
    isScanning: true,
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    processedArtists: 0,
    totalArtists: inventory.artists.length,
    phase: "metadata",
    message: `Refreshing artist metadata across ${inventory.artists.length} artists...`
  });

  const initialReport = buildScanReport({
    inventory,
    cache,
    wishlist,
    recentReleaseWindowDays: config.preferences.recentReleaseWindowDays,
    starredSongs,
    similarSongSeeds: initialSimilarSongSeeds
  });
  await saveReport(initialReport);

  const artistsToRefresh = inventory.artists.filter((artist) =>
    isArtistCacheStale(cache[getArtistCacheKey(artist.name)]?.fetchedAt)
  );

  let processedArtists = 0;

  for (const artist of artistsToRefresh) {
    await saveProgressState({
      processedArtists,
      totalArtists: artistsToRefresh.length,
      phase: "metadata",
      currentArtist: artist.name,
      message: `Refreshing ${artist.name} (${processedArtists + 1} of ${artistsToRefresh.length})`
    });

    try {
      const entry = await fetchArtistMetadata({
        navidrome,
        artistName: artist.name,
        artistId: artist.id,
        lastfmApiKey: config.integrations.lastfmApiKey
      });

      cache = upsertArtistCacheEntry(cache, entry);
      await saveArtistCache(cache);
    } catch {
      // Keep stale cache data if a refresh fails.
    }

    processedArtists += 1;

    if (processedArtists <= 5 || processedArtists % 10 === 0 || processedArtists === artistsToRefresh.length) {
      const partialReport = buildScanReport({
        inventory,
        cache,
        wishlist,
        recentReleaseWindowDays: config.preferences.recentReleaseWindowDays,
        starredSongs,
        similarSongSeeds: initialSimilarSongSeeds
      });
      await saveReport(partialReport);
    }
  }

  await saveScanState({
    isScanning: true,
    startedAt: new Date().toISOString(),
    completedAt: undefined,
    processedArtists: artistsToRefresh.length,
    totalArtists: artistsToRefresh.length,
    phase: "finalizing",
    message: "Finalizing the refreshed report..."
  });

  const finalReport = buildScanReport({
    inventory,
    cache,
    wishlist,
    recentReleaseWindowDays: config.preferences.recentReleaseWindowDays,
    starredSongs,
    similarSongSeeds: initialSimilarSongSeeds
  });
  await saveReport(finalReport);

  await saveScanState({
    isScanning: false,
    startedAt: undefined,
    completedAt: new Date().toISOString(),
    processedArtists: artistsToRefresh.length,
    totalArtists: artistsToRefresh.length,
    phase: "idle",
    message: artistsToRefresh.length
      ? `Scan finished after refreshing ${artistsToRefresh.length} artists.`
      : "Scan finished. Cached metadata was already current."
  });
}

export async function loadAppState(): Promise<StoredState> {
  const [config, report, wishlist, scanState] = await Promise.all([
    loadConfig(),
    loadReport(),
    loadWishlist(),
    loadScanState()
  ]);

  return {
    config: toDisplayConfig(config),
    hasConfig: hasNavidromeConfig(config),
    report,
    wishlist,
    scanState,
    shouldAutoScan: hasNavidromeConfig(config) && reportIsStale(report?.generatedAt, config.preferences.autoRefreshHours)
  };
}

export async function triggerScan(options?: { background?: boolean }): Promise<void> {
  if (activeScan) {
    if (options?.background) {
      return;
    }

    await activeScan;
    return;
  }

  activeScan = performScan().finally(() => {
    activeScan = null;
  });

  if (!options?.background) {
    await activeScan;
  }
}

export async function getScanState(): Promise<ScanState> {
  const state = await loadScanState();

  if (activeScan && !state.isScanning) {
    return {
      ...state,
      isScanning: true
    };
  }

  return state;
}

export async function createWishlistItem(input: {
  artist: string;
  title: string;
  type: "album" | "artist";
  reason: string;
  source: string;
}): Promise<void> {
  const items = await loadWishlist();
  const duplicate = items.find(
    (item) =>
      item.artist.toLowerCase() === input.artist.toLowerCase() &&
      item.title.toLowerCase() === input.title.toLowerCase() &&
      item.type === input.type
  );

  if (duplicate) {
    return;
  }

  const next: WishlistItem = {
    id: crypto.randomUUID(),
    artist: input.artist,
    title: input.title,
    type: input.type,
    reason: input.reason,
    source: input.source,
    status: "saved",
    createdAt: new Date().toISOString()
  };

  const allItems = [next, ...items];
  await saveWishlist(allItems);

  const report = await loadReport();
  if (report) {
    report.stats.wishlistCount = allItems.length;
    await saveReport(report);
  }
}

export async function updateWishlistItem(input: {
  id: string;
  action: "remove" | "send";
}): Promise<void> {
  const [config, items] = await Promise.all([loadConfig(), loadWishlist()]);
  const item = items.find((entry) => entry.id === input.id);

  if (!item) {
    throw new Error("Wishlist item not found.");
  }

  if (input.action === "remove") {
    const remaining = items.filter((entry) => entry.id !== input.id);
    await saveWishlist(remaining);
    const report = await loadReport();
    if (report) {
      report.stats.wishlistCount = remaining.length;
      await saveReport(report);
    }
    return;
  }

  if (!config.integrations.requestWebhookUrl) {
    throw new Error("Add a request webhook URL in settings before sending items.");
  }

  await dispatchWishlistItem(item, config.integrations.requestWebhookUrl);
  item.status = "sent";
  item.lastSentAt = new Date().toISOString();
  await saveWishlist([...items]);
}

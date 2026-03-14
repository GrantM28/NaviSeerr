import { normalizeText } from "@/lib/normalize";
import { readJsonFile, writeJsonFile } from "@/lib/store";
import type { ArtistMetadataCache, ArtistMetadataCacheEntry } from "@/lib/types";

const ARTIST_CACHE_FILE = "artist-cache.json";

export async function loadArtistCache(): Promise<ArtistMetadataCache> {
  return readJsonFile<ArtistMetadataCache>(ARTIST_CACHE_FILE, {});
}

export async function saveArtistCache(cache: ArtistMetadataCache): Promise<void> {
  await writeJsonFile(ARTIST_CACHE_FILE, cache);
}

export function getArtistCacheKey(artistName: string): string {
  return normalizeText(artistName);
}

export function upsertArtistCacheEntry(
  cache: ArtistMetadataCache,
  entry: ArtistMetadataCacheEntry
): ArtistMetadataCache {
  return {
    ...cache,
    [getArtistCacheKey(entry.artistName)]: entry
  };
}

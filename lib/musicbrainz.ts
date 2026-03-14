import { setTimeout as delay } from "node:timers/promises";

import type { CatalogRelease } from "@/lib/types";
import { sameArtist } from "@/lib/normalize";

type MusicBrainzArtist = {
  id: string;
  name: string;
};

type MusicBrainzArtistSearch = {
  artists?: MusicBrainzArtist[];
};

type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "primary-type"?: string;
  "secondary-types"?: string[];
  "first-release-date"?: string;
};

type MusicBrainzReleaseGroupsResponse = {
  "release-groups"?: MusicBrainzReleaseGroup[];
};

const API_ROOT = "https://musicbrainz.org/ws/2";
let lastRequestAt = 0;

function userAgent(): string {
  const contact = process.env.MUSICBRAINZ_CONTACT?.trim();
  return contact
    ? `NaviSeerr/0.1.0 (${contact})`
    : "NaviSeerr/0.1.0 (self-hosted music collection companion)";
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestAt;

  if (elapsed < 1100) {
    await delay(1100 - elapsed);
  }

  lastRequestAt = Date.now();
}

async function request<T>(pathname: string, search: URLSearchParams): Promise<T> {
  await rateLimit();
  const url = `${API_ROOT}${pathname}?${search.toString()}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": userAgent()
    },
    next: {
      revalidate: 3600
    }
  });

  if (!response.ok) {
    throw new Error(`MusicBrainz request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function findMusicBrainzArtist(name: string): Promise<MusicBrainzArtist | null> {
  const payload = await request<MusicBrainzArtistSearch>(
    "/artist",
    new URLSearchParams({
      query: name,
      fmt: "json",
      limit: "10"
    })
  );

  const artists = payload.artists || [];
  if (!artists.length) {
    return null;
  }

  const exact = artists.find((artist) => sameArtist(artist.name, name));
  return exact || artists[0] || null;
}

function releaseType(group: MusicBrainzReleaseGroup): string {
  if (group["secondary-types"]?.length) {
    return group["secondary-types"][0];
  }

  return group["primary-type"] || "Release";
}

export async function fetchArtistCatalog(artistName: string): Promise<CatalogRelease[]> {
  const artist = await findMusicBrainzArtist(artistName);

  if (!artist) {
    return [];
  }

  const releases: CatalogRelease[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const payload = await request<MusicBrainzReleaseGroupsResponse>(
      "/release-group",
      new URLSearchParams({
        artist: artist.id,
        fmt: "json",
        limit: String(limit),
        offset: String(offset)
      })
    );

    const groups = (payload["release-groups"] || []).filter((group) => {
      const primary = (group["primary-type"] || "").toLowerCase();
      const secondary = (group["secondary-types"] || []).map((type) => type.toLowerCase());
      return (
        primary === "album" ||
        primary === "ep" ||
        secondary.includes("live") ||
        secondary.includes("compilation")
      );
    });
    releases.push(
      ...groups.map((group) => ({
        id: group.id,
        title: group.title,
        type: releaseType(group),
        date: group["first-release-date"],
        year: group["first-release-date"] ? Number(group["first-release-date"].slice(0, 4)) : undefined
      }))
    );

    if (groups.length < limit) {
      break;
    }

    offset += groups.length;
  }

  return releases;
}

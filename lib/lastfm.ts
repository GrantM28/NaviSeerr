import { sameArtist } from "@/lib/normalize";

type LastFmSimilarArtist = {
  name: string;
  image?: Array<{
    "#text": string;
    size: string;
  }>;
};

type LastFmTrack = {
  name: string;
  artist: {
    name: string;
  };
  match?: string;
  playcount?: string;
  listeners?: string;
  image?: Array<{
    "#text": string;
    size: string;
  }>;
};

type LastFmSimilarResponse = {
  similarartists?: {
    artist?: LastFmSimilarArtist | LastFmSimilarArtist[];
  };
};

type LastFmSimilarTracksResponse = {
  similartracks?: {
    track?: LastFmTrack | LastFmTrack[];
  };
};

type LastFmTopTracksResponse = {
  toptracks?: {
    track?: LastFmTrack | LastFmTrack[];
  };
};

async function request<T>(search: URLSearchParams): Promise<T> {
  const url = `https://ws.audioscrobbler.com/2.0/?${search.toString()}`;
  const response = await fetch(url, {
    next: {
      revalidate: 21600
    }
  });

  if (!response.ok) {
    throw new Error(`Last.fm request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  return Array.isArray(value) ? value : value ? [value] : [];
}

function pickImage(
  images: Array<{
    "#text": string;
    size: string;
  }> | undefined
): string | undefined {
  if (!images?.length) {
    return undefined;
  }

  const preferred = images.find((image) => image.size === "extralarge" && image["#text"]);
  const fallback = [...images].reverse().find((image) => image["#text"]);
  return preferred?.["#text"] || fallback?.["#text"] || undefined;
}

export async function fetchSimilarArtists(
  artistName: string,
  apiKey: string,
  limit = 5
): Promise<Array<{ name: string; artUrl?: string }>> {
  const payload = await request<LastFmSimilarResponse>(
    new URLSearchParams({
      method: "artist.getsimilar",
      artist: artistName,
      api_key: apiKey,
      format: "json",
      limit: String(limit)
    })
  );

  return toArray(payload.similarartists?.artist)
    .map((item) => ({
      name: item.name,
      artUrl: pickImage(item.image)
    }))
    .filter((item) => !sameArtist(item.name, artistName));
}

export async function fetchSimilarTracks(
  artistName: string,
  trackName: string,
  apiKey: string,
  limit = 6
): Promise<Array<{ title: string; artist: string; matchScore?: number; artUrl?: string }>> {
  const payload = await request<LastFmSimilarTracksResponse>(
    new URLSearchParams({
      method: "track.getsimilar",
      artist: artistName,
      track: trackName,
      api_key: apiKey,
      format: "json",
      autocorrect: "1",
      limit: String(limit)
    })
  );

  return toArray(payload.similartracks?.track).map((track) => ({
    title: track.name,
    artist: track.artist.name,
    matchScore: track.match ? Number(track.match) : undefined,
    artUrl: pickImage(track.image)
  }));
}

export async function fetchArtistTopTracks(
  artistName: string,
  apiKey: string,
  limit = 5
): Promise<Array<{ title: string; artist: string; playcount?: number; listeners?: number; artUrl?: string }>> {
  const payload = await request<LastFmTopTracksResponse>(
    new URLSearchParams({
      method: "artist.gettoptracks",
      artist: artistName,
      api_key: apiKey,
      format: "json",
      autocorrect: "1",
      limit: String(limit)
    })
  );

  return toArray(payload.toptracks?.track).map((track) => ({
    title: track.name,
    artist: track.artist.name,
    playcount: track.playcount ? Number(track.playcount) : undefined,
    listeners: track.listeners ? Number(track.listeners) : undefined,
    artUrl: pickImage(track.image)
  }));
}

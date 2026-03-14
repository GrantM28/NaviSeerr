import { sameArtist } from "@/lib/normalize";

type LastFmSimilarArtist = {
  name: string;
};

type LastFmSimilarResponse = {
  similarartists?: {
    artist?: LastFmSimilarArtist | LastFmSimilarArtist[];
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

export async function fetchSimilarArtists(artistName: string, apiKey: string, limit = 5): Promise<string[]> {
  const payload = await request<LastFmSimilarResponse>(
    new URLSearchParams({
      method: "artist.getsimilar",
      artist: artistName,
      api_key: apiKey,
      format: "json",
      limit: String(limit)
    })
  );

  const raw = payload.similarartists?.artist;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];

  return items.map((item) => item.name).filter((name) => !sameArtist(name, artistName));
}

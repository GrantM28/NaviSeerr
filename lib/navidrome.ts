import crypto from "node:crypto";

import type { AppConfig, LibraryAlbum, LibraryTrack } from "@/lib/types";

type SubsonicResponse<T> = {
  "subsonic-response": {
    status: "ok" | "failed";
    error?: {
      code: number;
      message: string;
    };
  } & T;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function md5(value: string): string {
  return crypto.createHash("md5").update(value).digest("hex");
}

export class NavidromeClient {
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly password: string;

  constructor(config: AppConfig["navidrome"]) {
    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.username = config.username;
    this.password = config.password;
  }

  private async request<T>(endpoint: string, params: Record<string, string | number | boolean | undefined>) {
    const query = this.buildQuery(params);
    const url = `${this.baseUrl}/rest/${endpoint}.view?${query.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Navidrome request failed with ${response.status}`);
    }

    const payload = (await response.json()) as SubsonicResponse<T>;
    const body = payload["subsonic-response"];

    if (body.status !== "ok") {
      throw new Error(body.error?.message || "Navidrome returned an unknown error");
    }

    return body;
  }

  private buildQuery(params: Record<string, string | number | boolean | undefined>) {
    const salt = crypto.randomBytes(6).toString("hex");
    const token = md5(this.password + salt);
    const query = new URLSearchParams({
      u: this.username,
      t: token,
      s: salt,
      v: "1.16.1",
      c: "NaviSeerr",
      f: "json"
    });

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        query.set(key, String(value));
      }
    }

    return query;
  }

  async ping(): Promise<void> {
    await this.request("ping", {});
  }

  async fetchAllAlbums(): Promise<LibraryAlbum[]> {
    const pageSize = 500;
    const albums: LibraryAlbum[] = [];
    let offset = 0;

    while (true) {
      const payload = await this.request<{
        albumList2?: {
          album?: Array<{
            id: string;
            name?: string;
            title?: string;
            artist: string;
            artistId?: string;
            year?: number;
            genre?: string;
            songCount?: number;
          }>;
        };
      }>("getAlbumList2", {
        type: "alphabeticalByArtist",
        size: pageSize,
        offset
      });

      const page = payload.albumList2?.album || [];
      albums.push(
        ...page.map((album) => ({
          id: album.id,
          title: album.title || album.name || "Untitled album",
          artist: album.artist,
          artistId: album.artistId,
          year: album.year,
          genre: album.genre,
          songCount: album.songCount
        }))
      );

      if (page.length < pageSize) {
        break;
      }

      offset += page.length;
    }

    return albums;
  }

  async similarArtists(artistId: string, count = 5): Promise<string[]> {
    const payload = await this.request<{
      artistInfo2?: {
        similarArtist?: Array<{
          name: string;
        }>;
      };
    }>("getArtistInfo2", {
      id: artistId,
      count,
      includeNotPresent: true
    });

    return (payload.artistInfo2?.similarArtist || []).map((entry) => entry.name);
  }

  async fetchStarredSongs(): Promise<LibraryTrack[]> {
    const payload = await this.request<{
      starred2?: {
        song?: Array<{
          id: string;
          title: string;
          artist: string;
          artistId?: string;
          album?: string;
          starred?: string;
          coverArt?: string;
        }>;
      };
    }>("getStarred2", {});

    return (payload.starred2?.song || []).map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      artistId: song.artistId,
      album: song.album,
      starred: song.starred,
      coverArtId: song.coverArt || song.id
    }));
  }

  async fetchCoverArt(id: string): Promise<Response> {
    const url = `${this.baseUrl}/rest/getCoverArt.view?${this.buildQuery({ id }).toString()}`;
    const response = await fetch(url, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Navidrome cover art request failed with ${response.status}`);
    }

    return response;
  }
}

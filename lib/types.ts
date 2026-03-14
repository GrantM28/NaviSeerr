export type NavidromeConfig = {
  baseUrl: string;
  username: string;
  password: string;
};

export type IntegrationsConfig = {
  lastfmApiKey?: string;
  requestWebhookUrl?: string;
};

export type PreferencesConfig = {
  artistScanLimit: number;
  recentReleaseWindowDays: number;
};

export type AppConfig = {
  navidrome: NavidromeConfig;
  integrations: IntegrationsConfig;
  preferences: PreferencesConfig;
};

export type DisplayConfig = {
  navidrome: {
    baseUrl: string;
    username: string;
    hasPassword: boolean;
  };
  integrations: {
    hasLastfmApiKey: boolean;
    requestWebhookUrl: string;
  };
  preferences: PreferencesConfig;
};

export type LibraryAlbum = {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  year?: number;
  genre?: string;
  songCount?: number;
};

export type LibraryArtist = {
  id: string;
  name: string;
  albumCount: number;
  albums: LibraryAlbum[];
  genres: string[];
};

export type GenreCount = {
  name: string;
  count: number;
};

export type LibraryInventory = {
  artists: LibraryArtist[];
  albums: LibraryAlbum[];
  genres: GenreCount[];
};

export type CatalogRelease = {
  id: string;
  title: string;
  type: string;
  date?: string;
  year?: number;
};

export type MissingDiscographyItem = {
  artist: string;
  ownedCount: number;
  knownCount: number;
  ownedAlbums: string[];
  missing: CatalogRelease[];
};

export type SimilarArtistItem = {
  seedArtist: string;
  artist: string;
  source: "navidrome" | "lastfm";
  reason: string;
};

export type NewReleaseItem = {
  artist: string;
  title: string;
  type: string;
  date: string;
  source: "musicbrainz";
};

export type CollectionGap = {
  title: string;
  detail: string;
};

export type ScanReport = {
  generatedAt: string;
  stats: {
    totalArtists: number;
    totalAlbums: number;
    scannedArtists: number;
    missingReleases: number;
    newReleases: number;
    wishlistCount: number;
  };
  overview: {
    topGenres: GenreCount[];
    topArtists: Array<{
      name: string;
      albumCount: number;
    }>;
  };
  missingDiscography: MissingDiscographyItem[];
  newReleases: NewReleaseItem[];
  similarArtists: SimilarArtistItem[];
  collectionGaps: CollectionGap[];
  notes: string[];
};

export type WishlistItem = {
  id: string;
  artist: string;
  title: string;
  type: "album" | "artist";
  reason: string;
  source: string;
  status: "saved" | "sent";
  createdAt: string;
  lastSentAt?: string;
};

export type StoredState = {
  config: DisplayConfig | null;
  hasConfig: boolean;
  report: ScanReport | null;
  wishlist: WishlistItem[];
};

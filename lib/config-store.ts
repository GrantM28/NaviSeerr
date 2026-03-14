import { readJsonFile, writeJsonFile } from "@/lib/store";
import type { AppConfig, DisplayConfig } from "@/lib/types";

const SETTINGS_FILE = "settings.json";

const DEFAULT_CONFIG: AppConfig = {
  navidrome: {
    baseUrl: "",
    username: "",
    password: ""
  },
  integrations: {
    lastfmApiKey: "",
    requestWebhookUrl: ""
  },
  preferences: {
    artistScanLimit: 12,
    recentReleaseWindowDays: 45
  }
};

function envConfig(): Partial<AppConfig> {
  return {
    navidrome: {
      baseUrl: process.env.NAVIDROME_URL || "",
      username: process.env.NAVIDROME_USERNAME || "",
      password: process.env.NAVIDROME_PASSWORD || ""
    },
    integrations: {
      lastfmApiKey: process.env.LASTFM_API_KEY || "",
      requestWebhookUrl: process.env.REQUEST_WEBHOOK_URL || ""
    },
    preferences: DEFAULT_CONFIG.preferences
  };
}

export async function loadConfig(): Promise<AppConfig> {
  const stored = await readJsonFile<Partial<AppConfig>>(SETTINGS_FILE, {});
  const fromEnv = envConfig();

  return {
    navidrome: {
      ...DEFAULT_CONFIG.navidrome,
      ...fromEnv.navidrome,
      ...stored.navidrome
    },
    integrations: {
      ...DEFAULT_CONFIG.integrations,
      ...fromEnv.integrations,
      ...stored.integrations
    },
    preferences: {
      ...DEFAULT_CONFIG.preferences,
      ...fromEnv.preferences,
      ...stored.preferences
    }
  };
}

export async function saveConfig(input: {
  baseUrl: string;
  username: string;
  password?: string;
  lastfmApiKey?: string;
  requestWebhookUrl?: string;
  artistScanLimit?: number;
  recentReleaseWindowDays?: number;
}): Promise<AppConfig> {
  const current = await loadConfig();

  const next: AppConfig = {
    navidrome: {
      baseUrl: input.baseUrl.trim(),
      username: input.username.trim(),
      password: input.password?.trim() ? input.password.trim() : current.navidrome.password
    },
    integrations: {
      lastfmApiKey: input.lastfmApiKey?.trim() || current.integrations.lastfmApiKey || "",
      requestWebhookUrl:
        input.requestWebhookUrl?.trim() || current.integrations.requestWebhookUrl || ""
    },
    preferences: {
      artistScanLimit: Math.max(3, Math.min(30, input.artistScanLimit || current.preferences.artistScanLimit)),
      recentReleaseWindowDays: Math.max(
        7,
        Math.min(180, input.recentReleaseWindowDays || current.preferences.recentReleaseWindowDays)
      )
    }
  };

  await writeJsonFile(SETTINGS_FILE, next);
  return next;
}

export function toDisplayConfig(config: AppConfig): DisplayConfig {
  return {
    navidrome: {
      baseUrl: config.navidrome.baseUrl,
      username: config.navidrome.username,
      hasPassword: Boolean(config.navidrome.password)
    },
    integrations: {
      hasLastfmApiKey: Boolean(config.integrations.lastfmApiKey),
      requestWebhookUrl: config.integrations.requestWebhookUrl || ""
    },
    preferences: config.preferences
  };
}

export function hasNavidromeConfig(config: AppConfig): boolean {
  return Boolean(config.navidrome.baseUrl && config.navidrome.username && config.navidrome.password);
}

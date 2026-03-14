import crypto from "node:crypto";

import { buildScanReport } from "@/lib/analysis";
import { hasNavidromeConfig, loadConfig, toDisplayConfig } from "@/lib/config-store";
import { NavidromeClient } from "@/lib/navidrome";
import { loadReport, saveReport } from "@/lib/report-store";
import { dispatchWishlistItem } from "@/lib/request-target";
import type { StoredState, WishlistItem } from "@/lib/types";
import { loadWishlist, saveWishlist } from "@/lib/wishlist-store";

export async function loadAppState(): Promise<StoredState> {
  const [config, report, wishlist] = await Promise.all([loadConfig(), loadReport(), loadWishlist()]);

  return {
    config: toDisplayConfig(config),
    hasConfig: hasNavidromeConfig(config),
    report,
    wishlist
  };
}

export async function runScan(): Promise<void> {
  const [config, wishlist] = await Promise.all([loadConfig(), loadWishlist()]);

  if (!hasNavidromeConfig(config)) {
    throw new Error("Save your Navidrome settings first.");
  }

  const navidrome = new NavidromeClient(config.navidrome);
  await navidrome.ping();
  const albums = await navidrome.fetchAllAlbums();
  const report = await buildScanReport({
    albums,
    config,
    wishlist
  });
  await saveReport(report);
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

import { readJsonFile, writeJsonFile } from "@/lib/store";
import type { WishlistItem } from "@/lib/types";

const WISHLIST_FILE = "wishlist.json";

export async function loadWishlist(): Promise<WishlistItem[]> {
  return readJsonFile<WishlistItem[]>(WISHLIST_FILE, []);
}

export async function saveWishlist(items: WishlistItem[]): Promise<void> {
  await writeJsonFile(WISHLIST_FILE, items);
}

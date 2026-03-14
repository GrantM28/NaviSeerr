import type { WishlistItem } from "@/lib/types";

export async function dispatchWishlistItem(item: WishlistItem, webhookUrl: string): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      type: "naviseerr.wanted",
      wanted: item
    })
  });

  if (!response.ok) {
    throw new Error(`Request target responded with ${response.status}`);
  }
}

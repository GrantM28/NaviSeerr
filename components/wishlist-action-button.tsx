"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function WishlistActionButton(props: {
  artist: string;
  title: string;
  type: "album" | "artist";
  reason: string;
  source: string;
  label: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");

  function saveItem() {
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(props)
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus(payload.error || "Could not save item.");
        return;
      }

      setStatus("Saved");
      router.refresh();
    });
  }

  return (
    <div>
      <button className="ghost-button" disabled={pending} onClick={saveItem} type="button">
        {pending ? "Saving..." : props.label}
      </button>
      <div className="status-line">{status}</div>
    </div>
  );
}

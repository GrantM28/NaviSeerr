"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function WishlistControls({ itemId, canSend }: { itemId: string; canSend: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");

  function runAction(action: "remove" | "send") {
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/wishlist", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: itemId,
          action
        })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus(payload.error || "Could not update item.");
        return;
      }

      setStatus(action === "send" ? "Sent" : "Removed");
      router.refresh();
    });
  }

  return (
    <div className="actions-row">
      {canSend ? (
        <button className="ghost-button" disabled={pending} onClick={() => runAction("send")} type="button">
          {pending ? "Working..." : "Send"}
        </button>
      ) : null}
      <button className="danger-button" disabled={pending} onClick={() => runAction("remove")} type="button">
        Remove
      </button>
      <span className="status-line">{status}</span>
    </div>
  );
}

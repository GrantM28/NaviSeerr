"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function ScanButton({ disabled }: { disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState("");

  function runScan() {
    setStatus("");

    startTransition(async () => {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          background: true
        })
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus(payload.error || "Scan failed.");
        return;
      }

      setStatus("Background scan started.");
      router.refresh();
    });
  }

  return (
    <div>
      <button className="button" disabled={disabled || pending} onClick={runScan} type="button">
        {pending ? "Starting..." : "Rescan library"}
      </button>
      <div className="status-line">{status}</div>
    </div>
  );
}

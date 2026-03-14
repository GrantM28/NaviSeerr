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
        method: "POST"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus(payload.error || "Scan failed.");
        return;
      }

      setStatus("Scan complete.");
      router.refresh();
    });
  }

  return (
    <div>
      <button className="button" disabled={disabled || pending} onClick={runScan} type="button">
        {pending ? "Scanning..." : "Run library scan"}
      </button>
      <div className="status-line">{status}</div>
    </div>
  );
}

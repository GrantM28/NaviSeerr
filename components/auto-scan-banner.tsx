"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import type { ScanState } from "@/lib/types";

type AutoScanBannerProps = {
  shouldAutoScan: boolean;
  initialState: ScanState;
};

export function AutoScanBanner({ shouldAutoScan, initialState }: AutoScanBannerProps) {
  const router = useRouter();
  const [scanState, setScanState] = useState(initialState);

  useEffect(() => {
    setScanState(initialState);
  }, [initialState]);

  useEffect(() => {
    let cancelled = false;

    async function startAutoScan() {
      if (!shouldAutoScan || scanState.isScanning) {
        return;
      }

      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          background: true
        })
      });

      if (!response.ok || cancelled) {
        return;
      }

      router.refresh();
    }

    void startAutoScan();

    return () => {
      cancelled = true;
    };
  }, [router, scanState.isScanning, shouldAutoScan]);

  useEffect(() => {
    if (!scanState.isScanning) {
      return;
    }

    const timer = window.setInterval(async () => {
      const response = await fetch("/api/scan-status", {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const next = (await response.json()) as ScanState;
      setScanState(next);

      if (!next.isScanning) {
        router.refresh();
      }
    }, 8000);

    return () => {
      window.clearInterval(timer);
    };
  }, [router, scanState.isScanning]);

  if (!scanState.isScanning && !shouldAutoScan && !scanState.completedAt) {
    return null;
  }

  const progress =
    scanState.totalArtists > 0
      ? `${Math.min(scanState.processedArtists, scanState.totalArtists)} / ${scanState.totalArtists}`
      : "Preparing";

  return (
    <section className="scan-banner">
      <div>
        <div className="eyebrow">Auto sync</div>
        <strong>{scanState.isScanning ? "Library sync in progress" : "Library sync ready"}</strong>
        <p>
          {scanState.message}
          {scanState.currentArtist ? ` Currently on ${scanState.currentArtist}.` : ""}
        </p>
      </div>
      <div className="scan-banner-meta">
        <span>{scanState.phase}</span>
        <span>{progress}</span>
      </div>
    </section>
  );
}

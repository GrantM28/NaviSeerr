import { readJsonFile, writeJsonFile } from "@/lib/store";
import type { ScanState } from "@/lib/types";

const SCAN_STATE_FILE = "scan-state.json";

const DEFAULT_SCAN_STATE: ScanState = {
  isScanning: false,
  processedArtists: 0,
  totalArtists: 0,
  phase: "idle",
  message: "Idle"
};

export async function loadScanState(): Promise<ScanState> {
  return readJsonFile<ScanState>(SCAN_STATE_FILE, DEFAULT_SCAN_STATE);
}

export async function saveScanState(state: ScanState): Promise<void> {
  await writeJsonFile(SCAN_STATE_FILE, state);
}

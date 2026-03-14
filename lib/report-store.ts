import { readJsonFile, writeJsonFile } from "@/lib/store";
import type { ScanReport } from "@/lib/types";

const REPORT_FILE = "report.json";

export async function loadReport(): Promise<ScanReport | null> {
  return readJsonFile<ScanReport | null>(REPORT_FILE, null);
}

export async function saveReport(report: ScanReport): Promise<void> {
  await writeJsonFile(REPORT_FILE, report);
}

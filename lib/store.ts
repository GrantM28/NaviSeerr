import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");

export function getDataDir(): string {
  return process.env.DATA_DIR || DEFAULT_DATA_DIR;
}

async function ensureDataDir(): Promise<void> {
  await mkdir(getDataDir(), { recursive: true });
}

export async function readJsonFile<T>(fileName: string, fallback: T): Promise<T> {
  await ensureDataDir();
  const filePath = path.join(getDataDir(), fileName);

  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as T;
  } catch (error) {
    const maybeCode = (error as NodeJS.ErrnoException).code;
    if (maybeCode === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

export async function writeJsonFile<T>(fileName: string, value: T): Promise<void> {
  await ensureDataDir();
  const filePath = path.join(getDataDir(), fileName);
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

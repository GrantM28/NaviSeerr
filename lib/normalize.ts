const EDITION_NOISE =
  /\b(deluxe|expanded|edition|remaster|remastered|anniversary|bonus|version|clean|explicit|reissue|super)\b/gi;

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*]/g, " ")
    .replace(EDITION_NOISE, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function sameArtist(left: string, right: string): boolean {
  return normalizeText(left) === normalizeText(right);
}

export function sameAlbum(left: string, right: string): boolean {
  return normalizeText(left) === normalizeText(right);
}

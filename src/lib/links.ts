export type ArtistLink = { label: string; url: string };

const PLATFORMS: { match: RegExp; label: string }[] = [
  { match: /spotify\.com/i, label: "Spotify" },
  { match: /tiktok\.com/i, label: "TikTok" },
  { match: /(youtube\.com|youtu\.be)/i, label: "YouTube" },
  { match: /instagram\.com/i, label: "Instagram" },
  { match: /facebook\.com/i, label: "Facebook" },
  { match: /soundcloud\.com/i, label: "SoundCloud" },
  { match: /music\.apple\.com/i, label: "Apple Music" },
  { match: /bandcamp\.com/i, label: "Bandcamp" },
  { match: /(twitter\.com|x\.com)/i, label: "X" },
];

/** Adds https:// when the user typed a bare domain. */
export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

export function isValidUrl(input: string): boolean {
  try {
    const url = new URL(normalizeUrl(input));
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/** Best-guess platform name from a URL, falling back to its hostname. */
export function detectPlatform(url: string): string {
  const found = PLATFORMS.find((p) => p.match.test(url));
  if (found) return found.label;
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

/** Reads the artist `links` JSON column into a safe array. */
export function parseArtistLinks(value: unknown): ArtistLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is { label?: unknown; url?: unknown } =>
        !!item && typeof item === "object" && typeof (item as { url?: unknown }).url === "string",
    )
    .map((item) => ({
      url: String(item.url),
      label:
        typeof item.label === "string" && item.label.trim()
          ? item.label.trim()
          : detectPlatform(String(item.url)),
    }));
}

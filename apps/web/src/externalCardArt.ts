import type { Card } from "@gigsmith/data-contracts";

const allowedArtworkHost = "dstcynss47vun.cloudfront.net";
const externalCardArtCacheSchema = "gigsmith.card-art-url-cache";
const externalCardArtCacheVersion = 1;
const externalCardArtCacheTtlMs = 12 * 60 * 60 * 1000;

export const externalCardArtCacheStorageKey = "gigsmith.card-art.urls.v1";

interface ExternalCardRecord {
  id?: unknown;
  external_id?: unknown;
  image_url?: unknown;
}

interface ExternalCardArtCacheDocument {
  schema: typeof externalCardArtCacheSchema;
  version: typeof externalCardArtCacheVersion;
  sourceUrl: string;
  cachedAt: string;
  expiresAt: string;
  urls: Array<[string, string]>;
}

export interface ExternalCardArtUrlResult {
  urls: ReadonlyMap<string, string>;
  source: "cache" | "network";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function signedArtworkUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === allowedArtworkHost && url.search
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function cacheDocumentFromStorage(value: string | null, sourceUrl: string, nowMs: number): ExternalCardArtCacheDocument | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) return undefined;
    if (parsed.schema !== externalCardArtCacheSchema || parsed.version !== externalCardArtCacheVersion) return undefined;
    if (parsed.sourceUrl !== sourceUrl || typeof parsed.expiresAt !== "string") return undefined;
    if (Date.parse(parsed.expiresAt) <= nowMs) return undefined;
    if (!Array.isArray(parsed.urls)) return undefined;

    const urls: Array<[string, string]> = [];
    for (const entry of parsed.urls) {
      if (!Array.isArray(entry) || entry.length !== 2) return undefined;
      const [key, url] = entry;
      if (typeof key !== "string" || !signedArtworkUrl(url)) return undefined;
      urls.push([key, url]);
    }
    if (urls.length === 0) return undefined;

    return {
      schema: externalCardArtCacheSchema,
      version: externalCardArtCacheVersion,
      sourceUrl,
      cachedAt: typeof parsed.cachedAt === "string" ? parsed.cachedAt : new Date(nowMs).toISOString(),
      expiresAt: parsed.expiresAt,
      urls
    };
  } catch {
    return undefined;
  }
}

export async function fetchExternalCardArtUrls(
  sourceUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<ReadonlyMap<string, string>> {
  const endpoint = new URL(sourceUrl);
  endpoint.searchParams.set("limit", "1000");
  const response = await fetcher(endpoint, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal
  });
  if (!response.ok) throw new Error(`Card artwork source returned ${response.status}.`);

  const payload = await response.json() as { items?: unknown };
  if (!Array.isArray(payload.items)) throw new Error("Card artwork source returned an invalid payload.");

  const urls = new Map<string, string>();
  for (const item of payload.items as ExternalCardRecord[]) {
    const artworkUrl = signedArtworkUrl(item.image_url);
    if (!artworkUrl) continue;
    if (typeof item.id === "string") urls.set(item.id, artworkUrl);
    if (typeof item.external_id === "string") urls.set(item.external_id, artworkUrl);
  }
  if (urls.size === 0) throw new Error("Card artwork source returned no usable URLs.");
  return urls;
}

export function loadCachedExternalCardArtUrls(
  storage: Storage,
  sourceUrl: string,
  nowMs = Date.now()
): ReadonlyMap<string, string> | undefined {
  let stored: string | null;
  try {
    stored = storage.getItem(externalCardArtCacheStorageKey);
  } catch {
    return undefined;
  }
  const document = cacheDocumentFromStorage(stored, sourceUrl, nowMs);
  return document ? new Map(document.urls) : undefined;
}

export function saveCachedExternalCardArtUrls(
  storage: Storage,
  sourceUrl: string,
  urls: ReadonlyMap<string, string>,
  nowMs = Date.now()
): void {
  const entries = [...urls].filter(([key, url]) => key && signedArtworkUrl(url));
  if (entries.length === 0) return;

  const document: ExternalCardArtCacheDocument = {
    schema: externalCardArtCacheSchema,
    version: externalCardArtCacheVersion,
    sourceUrl,
    cachedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + externalCardArtCacheTtlMs).toISOString(),
    urls: entries
  };
  try {
    storage.setItem(externalCardArtCacheStorageKey, JSON.stringify(document));
  } catch {
    // Artwork URL caching is an optimization; network-loaded art should still render if storage is unavailable.
  }
}

export async function loadExternalCardArtUrls(
  storage: Storage,
  sourceUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  nowMs = Date.now()
): Promise<ExternalCardArtUrlResult> {
  const cached = loadCachedExternalCardArtUrls(storage, sourceUrl, nowMs);
  if (cached) return { urls: cached, source: "cache" };

  const urls = await fetchExternalCardArtUrls(sourceUrl, signal, fetcher);
  saveCachedExternalCardArtUrls(storage, sourceUrl, urls, nowMs);
  return { urls, source: "network" };
}

export function selectExternalCardArtUrl(
  card: Pick<Card, "id" | "external_id">,
  urls: ReadonlyMap<string, string>
): string | undefined {
  return urls.get(card.id) ?? urls.get(card.external_id);
}

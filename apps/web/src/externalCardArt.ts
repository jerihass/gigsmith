import type { Card } from "@gigsmith/data-contracts";

const allowedArtworkHost = "dstcynss47vun.cloudfront.net";
const externalCardArtCacheSchema = "gigsmith.card-art-url-cache";
const externalCardArtCacheVersion = 4;
const externalCardArtCacheTtlMs = 12 * 60 * 60 * 1000;
const externalCardArtRefreshMarginMs = 30 * 1000;
const externalCardArtFetchLimit = 100;
const maximumSourceCardCount = 5000;

export const externalCardArtCacheStorageKey = "gigsmith.card-art.urls.v1";

interface ExternalCardRecord {
  id?: unknown;
  external_id?: unknown;
  slug?: unknown;
  printing_id?: unknown;
  source_image_url?: unknown;
  image_url?: unknown;
}

interface ExternalCardArtCacheDocument {
  schema: typeof externalCardArtCacheSchema;
  version: typeof externalCardArtCacheVersion;
  sourceUrl: string;
  cardDataIdentity: string;
  cachedAt: string;
  expiresAt: string;
  urls: Array<[string, string]>;
}

export interface ExternalCardArtUrlResult {
  urls: ReadonlyMap<string, string>;
  source: "cache" | "network";
  refreshAtMs: number;
}

export interface ExternalCardArtCoverage {
  available: number;
  total: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function signedArtworkExpirationMs(url: URL): number | undefined {
  const expires = url.searchParams.get("Expires");
  if (expires === null || !/^\d+$/.test(expires)) return undefined;
  const expiresSeconds = Number(expires);
  return Number.isSafeInteger(expiresSeconds) && expiresSeconds > 0
    ? expiresSeconds * 1000
    : undefined;
}

function signedArtworkUrl(value: unknown, nowMs?: number): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== allowedArtworkHost || !url.search) return undefined;
    const expiresAtMs = signedArtworkExpirationMs(url);
    if (nowMs !== undefined && expiresAtMs !== undefined && expiresAtMs <= nowMs + externalCardArtRefreshMarginMs) {
      return undefined;
    }
    return url.href;
  } catch {
    return undefined;
  }
}

function artworkRefreshAtMs(urls: ReadonlyMap<string, string>, nowMs: number): number {
  let refreshAtMs = nowMs + externalCardArtCacheTtlMs;
  for (const artworkUrl of new Set(urls.values())) {
    try {
      const expiresAtMs = signedArtworkExpirationMs(new URL(artworkUrl));
      if (expiresAtMs !== undefined) {
        refreshAtMs = Math.min(refreshAtMs, expiresAtMs - externalCardArtRefreshMarginMs);
      }
    } catch {
      // URL validation happens before this calculation; ignore any value that becomes unusable here.
    }
  }
  return refreshAtMs;
}

function stableArtworkUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === allowedArtworkHost && !url.search && !url.hash
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

function addArtUrlKey(urls: Map<string, string>, key: unknown, artworkUrl: string): void {
  if (typeof key === "string" && key.length > 0) urls.set(key, artworkUrl);
}

function cacheDocumentFromStorage(
  value: string | null,
  sourceUrl: string,
  nowMs: number,
  cardDataIdentity: string
): ExternalCardArtCacheDocument | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) return undefined;
    if (parsed.schema !== externalCardArtCacheSchema || parsed.version !== externalCardArtCacheVersion) return undefined;
    if (parsed.sourceUrl !== sourceUrl || parsed.cardDataIdentity !== cardDataIdentity || typeof parsed.expiresAt !== "string") return undefined;
    const cacheExpiresAtMs = Date.parse(parsed.expiresAt);
    if (!Number.isFinite(cacheExpiresAtMs) || cacheExpiresAtMs <= nowMs) return undefined;
    if (!Array.isArray(parsed.urls)) return undefined;

    const urls: Array<[string, string]> = [];
    for (const entry of parsed.urls) {
      if (!Array.isArray(entry) || entry.length !== 2) return undefined;
      const [key, url] = entry;
      if (typeof key !== "string" || !signedArtworkUrl(url, nowMs)) return undefined;
      urls.push([key, url]);
    }
    if (urls.length === 0) return undefined;
    if (cacheExpiresAtMs > artworkRefreshAtMs(new Map(urls), nowMs)) return undefined;

    return {
      schema: externalCardArtCacheSchema,
      version: externalCardArtCacheVersion,
      sourceUrl,
      cardDataIdentity,
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
  fetcher: typeof fetch = fetch,
  nowMs = Date.now()
): Promise<ReadonlyMap<string, string>> {
  const endpoint = new URL(sourceUrl);
  endpoint.searchParams.set("limit", String(externalCardArtFetchLimit));
  endpoint.searchParams.set("offset", "0");

  async function fetchPage(): Promise<Record<string, unknown>> {
    const response = await fetcher(endpoint, {
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal
    });
    if (!response.ok) throw new Error(`Card artwork source returned ${response.status}.`);
    const payload = await response.json() as unknown;
    if (!isRecord(payload) || !Array.isArray(payload.items)) {
      throw new Error("Card artwork source returned an invalid payload.");
    }
    return payload;
  }

  const firstPage = await fetchPage();
  const reportedTotal = firstPage.total;
  const items = [...firstPage.items as ExternalCardRecord[]];
  if (Number.isInteger(reportedTotal)) {
    const total = Number(reportedTotal);
    if (total < 0 || total > maximumSourceCardCount) {
      throw new Error(`Card artwork source reported an unexpected ${total} cards.`);
    }
    while (items.length < total) {
      const previousCount = items.length;
      endpoint.searchParams.set("offset", String(previousCount));
      const nextPage = await fetchPage();
      items.push(...nextPage.items as ExternalCardRecord[]);
      if (items.length === previousCount) {
        throw new Error(`Card artwork source stopped after ${items.length} of ${total} cards.`);
      }
    }
    if (items.length !== total) {
      throw new Error(`Card artwork source returned ${items.length} records for a reported total of ${total}.`);
    }
  }

  const urls = new Map<string, string>();
  for (const item of items) {
    const artworkUrl = signedArtworkUrl(item.image_url, nowMs);
    if (!artworkUrl) continue;
    addArtUrlKey(urls, item.id, artworkUrl);
    addArtUrlKey(urls, item.external_id, artworkUrl);
    addArtUrlKey(urls, item.slug, artworkUrl);
    addArtUrlKey(urls, item.printing_id, artworkUrl);
    addArtUrlKey(urls, stableArtworkUrl(item.source_image_url), artworkUrl);
  }
  if (urls.size === 0) throw new Error("Card artwork source returned no usable URLs.");
  return urls;
}

function loadCachedExternalCardArtDocument(
  storage: Storage,
  sourceUrl: string,
  nowMs = Date.now(),
  cardDataIdentity = ""
): ExternalCardArtCacheDocument | undefined {
  let stored: string | null;
  try {
    stored = storage.getItem(externalCardArtCacheStorageKey);
  } catch {
    return undefined;
  }
  return cacheDocumentFromStorage(stored, sourceUrl, nowMs, cardDataIdentity);
}

export function loadCachedExternalCardArtUrls(
  storage: Storage,
  sourceUrl: string,
  nowMs = Date.now(),
  cardDataIdentity = ""
): ReadonlyMap<string, string> | undefined {
  const document = loadCachedExternalCardArtDocument(storage, sourceUrl, nowMs, cardDataIdentity);
  return document ? new Map(document.urls) : undefined;
}

export function saveCachedExternalCardArtUrls(
  storage: Storage,
  sourceUrl: string,
  urls: ReadonlyMap<string, string>,
  nowMs = Date.now(),
  cardDataIdentity = ""
): void {
  const entries = [...urls].filter(([key, url]) => key && signedArtworkUrl(url, nowMs));
  if (entries.length === 0) return;
  const refreshAtMs = artworkRefreshAtMs(new Map(entries), nowMs);

  const document: ExternalCardArtCacheDocument = {
    schema: externalCardArtCacheSchema,
    version: externalCardArtCacheVersion,
    sourceUrl,
    cardDataIdentity,
    cachedAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(refreshAtMs).toISOString(),
    urls: entries
  };
  try {
    storage.setItem(externalCardArtCacheStorageKey, JSON.stringify(document));
  } catch {
    // Artwork URL caching is an optimization; network-loaded art should still render if storage is unavailable.
  }
}

export function clearCachedExternalCardArtUrls(storage: Storage): void {
  try {
    storage.removeItem(externalCardArtCacheStorageKey);
  } catch {
    // A retry can still use the network when browser storage is unavailable.
  }
}

export async function loadExternalCardArtUrls(
  storage: Storage,
  sourceUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch,
  nowMs = Date.now(),
  cardDataIdentity = ""
): Promise<ExternalCardArtUrlResult> {
  const cached = loadCachedExternalCardArtDocument(storage, sourceUrl, nowMs, cardDataIdentity);
  if (cached) {
    return { urls: new Map(cached.urls), source: "cache", refreshAtMs: Date.parse(cached.expiresAt) };
  }

  const urls = await fetchExternalCardArtUrls(sourceUrl, signal, fetcher, nowMs);
  saveCachedExternalCardArtUrls(storage, sourceUrl, urls, nowMs, cardDataIdentity);
  return { urls, source: "network", refreshAtMs: artworkRefreshAtMs(urls, nowMs) };
}

export function selectExternalCardArtUrl(
  card: Pick<Card, "id" | "external_id" | "slug" | "printing_id" | "source_image_url">,
  urls: ReadonlyMap<string, string>
): string | undefined {
  const sourceImageUrl = stableArtworkUrl(card.source_image_url);
  return urls.get(card.id) ??
    urls.get(card.external_id) ??
    urls.get(card.slug) ??
    urls.get(card.printing_id) ??
    (sourceImageUrl ? urls.get(sourceImageUrl) : undefined);
}

export function calculateExternalCardArtCoverage(
  cards: ReadonlyArray<Pick<Card, "id" | "external_id" | "slug" | "printing_id" | "source_image_url">>,
  urls: ReadonlyMap<string, string>
): ExternalCardArtCoverage {
  return {
    available: cards.reduce((count, card) => count + (selectExternalCardArtUrl(card, urls) ? 1 : 0), 0),
    total: cards.length
  };
}

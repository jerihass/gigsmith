import { describe, expect, it, vi } from "vitest";
import {
  calculateExternalCardArtCoverage,
  clearCachedExternalCardArtUrls,
  externalCardArtCacheStorageKey,
  fetchExternalCardArtUrls,
  loadCachedExternalCardArtUrls,
  loadExternalCardArtUrls,
  saveCachedExternalCardArtUrls,
  selectExternalCardArtUrl
} from "./externalCardArt";

const sourceUrl = "https://api.netdeck.gg/api/cards/cyberpunk";
const signedUrl = "https://dstcynss47vun.cloudfront.net/card.webp?Expires=123&Signature=test";
const nowMs = Date.parse("2026-06-26T12:00:00.000Z");

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}

describe("external card art", () => {
  it("loads signed URLs from the opt-in source without persisting them", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      items: [{
        id: "card-1",
        external_id: "CP-001",
        slug: "test-card",
        printing_id: "print-1",
        source_image_url: "https://dstcynss47vun.cloudfront.net/card.webp",
        image_url: signedUrl
      }]
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const urls = await fetchExternalCardArtUrls(sourceUrl, undefined, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${sourceUrl}?limit=100&offset=0`);
    expect(selectExternalCardArtUrl({
      id: "card-1",
      external_id: "CP-001",
      slug: "test-card",
      printing_id: "print-1",
      source_image_url: "https://dstcynss47vun.cloudfront.net/card.webp"
    }, urls)).toBe(signedUrl);
  });

  it("fetches signed artwork URLs beyond Netdeck's 100-card page cap", async () => {
    const cards = Array.from({ length: 104 }, (_, index) => ({
      id: `card-${index}`,
      external_id: `CP-${index}`,
      image_url: `https://dstcynss47vun.cloudfront.net/card-${index}.webp?Expires=123&Signature=test`
    }));
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
      return new Response(JSON.stringify({
        total: cards.length,
        limit: 100,
        offset,
        items: cards.slice(offset, offset + 100)
      }), { status: 200 });
    });

    const urls = await fetchExternalCardArtUrls(sourceUrl, undefined, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1]?.[0])).searchParams.get("offset")).toBe("100");
    expect(urls.get("card-103")).toContain("card-103.webp");
  });

  it("rejects an incomplete artwork page sequence", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
      return new Response(JSON.stringify({
        total: 101,
        items: offset === 0 ? [{ id: "card-1", image_url: signedUrl }] : []
      }), { status: 200 });
    });

    await expect(fetchExternalCardArtUrls(
      sourceUrl,
      undefined,
      fetchMock as unknown as typeof fetch
    )).rejects.toThrow("stopped after 1 of 101 cards");
  });

  it("selects art by stable card fields when local IDs differ from the live art source", async () => {
    const sourceImageUrl = "https://dstcynss47vun.cloudfront.net/prod/cyberpunk/portal/a195323a-e29e-4c05-8e6c-7f1638c8264c/render-mpvm290s.webp";
    const augmentedNegotiatorsUrl = `${sourceImageUrl}?Expires=123&Signature=test`;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      items: [{
        id: "ce45cb9d-430a-4ccf-bb4b-acf0b76120e0",
        external_id: "cb-augmented-negotiators",
        slug: "augmented-negotiators",
        printing_id: "a195323a-e29e-4c05-8e6c-7f1638c8264c",
        source_image_url: sourceImageUrl,
        image_url: augmentedNegotiatorsUrl
      }]
    }), { status: 200 })) as typeof fetch;

    const urls = await fetchExternalCardArtUrls(sourceUrl, undefined, fetchMock);

    expect(selectExternalCardArtUrl({
      id: "local-augmented-negotiators",
      external_id: "local-cb-augmented-negotiators",
      slug: "augmented-negotiators",
      printing_id: "a195323a-e29e-4c05-8e6c-7f1638c8264c",
      source_image_url: sourceImageUrl
    }, urls)).toBe(augmentedNegotiatorsUrl);
  });

  it("rejects untrusted, unsigned, and malformed artwork URLs", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [
      { id: "unsigned", image_url: "https://dstcynss47vun.cloudfront.net/card.webp" },
      { id: "untrusted", image_url: "https://images.example/card.webp?Signature=test" },
      { id: "malformed", image_url: "not-a-url" }
    ] }), { status: 200 })) as typeof fetch;

    await expect(fetchExternalCardArtUrls(sourceUrl, undefined, fetcher)).rejects.toThrow("no usable URLs");
  });

  it("reports source and payload failures", async () => {
    const unavailable = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    const malformed = vi.fn(async () => new Response(JSON.stringify({ cards: [] }), { status: 200 })) as typeof fetch;

    await expect(fetchExternalCardArtUrls(sourceUrl, undefined, unavailable)).rejects.toThrow("503");
    await expect(fetchExternalCardArtUrls(sourceUrl, undefined, malformed)).rejects.toThrow("invalid payload");
  });

  it("saves and reloads a valid signed URL cache", () => {
    const storage = createStorage();
    saveCachedExternalCardArtUrls(storage, sourceUrl, new Map([["card-1", signedUrl]]), nowMs);

    const urls = loadCachedExternalCardArtUrls(storage, sourceUrl, nowMs + 60_000);

    expect(urls?.get("card-1")).toBe(signedUrl);
    expect(storage.getItem(externalCardArtCacheStorageKey)).toContain("gigsmith.card-art-url-cache");
  });

  it("ignores expired, mismatched, and malformed URL caches", () => {
    const storage = createStorage();
    saveCachedExternalCardArtUrls(storage, sourceUrl, new Map([["card-1", signedUrl]]), nowMs);

    expect(loadCachedExternalCardArtUrls(storage, sourceUrl, nowMs + 13 * 60 * 60 * 1000)).toBeUndefined();
    expect(loadCachedExternalCardArtUrls(storage, "https://api.netdeck.gg/api/cards/other", nowMs + 60_000)).toBeUndefined();

    storage.setItem(externalCardArtCacheStorageKey, JSON.stringify({
      schema: "gigsmith.card-art-url-cache",
      version: 1,
      sourceUrl,
      cachedAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + 60_000).toISOString(),
      urls: [["card-1", "https://images.example/card.webp?Signature=test"]]
    }));
    expect(loadCachedExternalCardArtUrls(storage, sourceUrl, nowMs)).toBeUndefined();
  });

  it("invalidates artwork caches when the card-data identity changes", () => {
    const storage = createStorage();
    saveCachedExternalCardArtUrls(storage, sourceUrl, new Map([["card-1", signedUrl]]), nowMs, "snapshot:100");

    expect(loadCachedExternalCardArtUrls(storage, sourceUrl, nowMs + 60_000, "snapshot:100")?.get("card-1")).toBe(signedUrl);
    expect(loadCachedExternalCardArtUrls(storage, sourceUrl, nowMs + 60_000, "snapshot:104")).toBeUndefined();
  });

  it("reports card-level artwork coverage and clears cached URLs for retries", () => {
    const storage = createStorage();
    const urls = new Map([["card-1", signedUrl]]);
    saveCachedExternalCardArtUrls(storage, sourceUrl, urls, nowMs);

    expect(calculateExternalCardArtCoverage([
      { id: "card-1", external_id: "one", slug: "one", printing_id: "print-1" },
      { id: "card-2", external_id: "two", slug: "two", printing_id: "print-2" }
    ], urls)).toEqual({ available: 1, total: 2 });

    clearCachedExternalCardArtUrls(storage);
    expect(storage.getItem(externalCardArtCacheStorageKey)).toBeNull();
  });

  it("uses a valid cache before fetching and caches network results", async () => {
    const cachedStorage = createStorage();
    saveCachedExternalCardArtUrls(cachedStorage, sourceUrl, new Map([["card-1", signedUrl]]), nowMs);
    const unusedFetch = vi.fn(async () => new Response(null, { status: 500 })) as typeof fetch;

    const cached = await loadExternalCardArtUrls(cachedStorage, sourceUrl, undefined, unusedFetch, nowMs + 60_000);

    expect(cached.source).toBe("cache");
    expect(cached.urls.get("card-1")).toBe(signedUrl);
    expect(unusedFetch).not.toHaveBeenCalled();

    const networkStorage = createStorage();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      items: [{ id: "card-2", external_id: "CP-002", image_url: signedUrl }]
    }), { status: 200 })) as typeof fetch;

    const fetched = await loadExternalCardArtUrls(networkStorage, sourceUrl, undefined, fetchMock, nowMs);
    const reloaded = loadCachedExternalCardArtUrls(networkStorage, sourceUrl, nowMs + 60_000);

    expect(fetched.source).toBe("network");
    expect(fetched.urls.get("card-2")).toBe(signedUrl);
    expect(reloaded?.get("CP-002")).toBe(signedUrl);
  });

  it("treats unavailable storage as a cache miss without failing network art", async () => {
    const unavailableStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); }
    } as unknown as Storage;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      items: [{ id: "card-1", external_id: "CP-001", image_url: signedUrl }]
    }), { status: 200 })) as typeof fetch;

    const result = await loadExternalCardArtUrls(unavailableStorage, sourceUrl, undefined, fetchMock, nowMs);

    expect(result.source).toBe("network");
    expect(result.urls.get("card-1")).toBe(signedUrl);
  });
});

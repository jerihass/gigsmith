import { describe, expect, it, vi } from "vitest";
import { cyberpunkCardSnapshot } from "@gigsmith/card-data";
import {
  fetchCardDatabaseSnapshot,
  loadStoredCardDatabase,
  refreshStoredCardDatabase,
  resetStoredCardDatabase
} from "./cardDatabase";

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

function mockResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ etag: "\"cards-v2\"" }),
    json: () => Promise.resolve(payload)
  } as Response;
}

describe("cardDatabase refresh", () => {
  it("normalizes and validates a Netdeck items payload", async () => {
    const { source_image_url: _sourceImageUrl, ...card } = {
      ...cyberpunkCardSnapshot.cards[0],
      image_url: "https://dstcynss47vun.cloudfront.net/card.webp?Signature=abc"
    };
    const fetcher = vi.fn(() => Promise.resolve(mockResponse({ total: 1, items: [card] })));

    const snapshot = await fetchCardDatabaseSnapshot("https://api.netdeck.gg/api/cards/cyberpunk", undefined, fetcher as unknown as typeof fetch);

    expect(snapshot.metadata.cardDataVersion).toMatch(/^netdeck-cyberpunk-\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.metadata.sourceCardCount).toBe(1);
    expect(snapshot.cards[0].source_image_url).toBe("https://dstcynss47vun.cloudfront.net/card.webp");
    expect("image_url" in snapshot.cards[0]).toBe(false);
  });

  it("saves a valid refreshed snapshot and reloads it", async () => {
    const storage = createStorage();
    const card = cyberpunkCardSnapshot.cards[0];
    const fetcher = vi.fn(() => Promise.resolve(mockResponse({ total: 1, items: [card] })));

    const result = await refreshStoredCardDatabase(storage, { metadata: cyberpunkCardSnapshot.metadata, cards: [] }, undefined, fetcher as unknown as typeof fetch);
    const loaded = loadStoredCardDatabase(storage);

    expect(result.cardCount).toBe(1);
    expect(result.changed).toBe(true);
    expect(loaded.usingOverride).toBe(true);
    expect(loaded.cardDb.cards).toHaveLength(1);
  });

  it("reports no change when the card content already matches", async () => {
    const storage = createStorage();
    const currentDb = {
      metadata: { ...cyberpunkCardSnapshot.metadata, sourceCardCount: 1 },
      cards: [cyberpunkCardSnapshot.cards[0]]
    };
    const fetcher = vi.fn(() => Promise.resolve(mockResponse({ total: 1, items: [cyberpunkCardSnapshot.cards[0]] })));

    const result = await refreshStoredCardDatabase(storage, currentDb, undefined, fetcher as unknown as typeof fetch);

    expect(result.changed).toBe(false);
    expect(result.message).toContain("already current");
  });

  it("falls back to bundled data when stored data is invalid", () => {
    const storage = createStorage();
    storage.setItem("gigsmith.card-database.override.v1", "{ bad");

    const loaded = loadStoredCardDatabase(storage);

    expect(loaded.usingOverride).toBe(false);
    expect(loaded.error).toContain("invalid");
    expect(loaded.cardDb.cards.length).toBe(cyberpunkCardSnapshot.cards.length);
  });

  it("resets the user override", async () => {
    const storage = createStorage();
    const fetcher = vi.fn(() => Promise.resolve(mockResponse({ total: 1, items: [cyberpunkCardSnapshot.cards[0]] })));
    await refreshStoredCardDatabase(storage, { metadata: cyberpunkCardSnapshot.metadata, cards: [] }, undefined, fetcher as unknown as typeof fetch);

    const reset = resetStoredCardDatabase(storage);

    expect(reset.usingOverride).toBe(false);
    expect(reset.cardDb.cards.length).toBe(cyberpunkCardSnapshot.cards.length);
  });
});

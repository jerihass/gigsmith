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

function testCard(id: string, setCode: string, name = id) {
  return {
    ...cyberpunkCardSnapshot.cards[0],
    id,
    external_id: `external-${id}`,
    name,
    display_name: name,
    slug: id,
    printing_id: `printing-${id}`,
    set: { code: setCode, name: `${setCode} Set` }
  };
}

function setAwareFetcher(sourceCards: ReturnType<typeof testCard>[]) {
  return vi.fn((input: RequestInfo | URL) => {
    const endpoint = new URL(String(input));
    const setCode = endpoint.searchParams.get("set");
    const limit = Number(endpoint.searchParams.get("limit") ?? 100);
    const offset = Number(endpoint.searchParams.get("offset") ?? 0);
    const cards = setCode
      ? sourceCards.filter((card) => card.set.code.toLowerCase() === setCode.toLowerCase())
      : sourceCards;
    return Promise.resolve(mockResponse({
      total: cards.length,
      limit,
      offset,
      items: cards.slice(offset, offset + limit)
    }));
  });
}

describe("cardDatabase refresh", () => {
  it("normalizes and validates a Netdeck items payload", async () => {
    const { source_image_url: _sourceImageUrl, ...card } = {
      ...cyberpunkCardSnapshot.cards[0],
      keywords: [],
      image_url: "https://dstcynss47vun.cloudfront.net/card.webp?Signature=abc"
    };
    const fetcher = vi.fn(() => Promise.resolve(mockResponse({ total: 1, items: [card] })));

    const snapshot = await fetchCardDatabaseSnapshot("https://api.netdeck.gg/api/cards/cyberpunk", undefined, fetcher as unknown as typeof fetch);

    expect(snapshot.metadata.cardDataVersion).toMatch(/^netdeck-cyberpunk-\d{4}-\d{2}-\d{2}$/);
    expect(snapshot.metadata.sourceCardCount).toBe(1);
    expect(snapshot.cards[0].source_image_url).toBe("https://dstcynss47vun.cloudfront.net/card.webp");
    expect("image_url" in snapshot.cards[0]).toBe(false);
    expect(snapshot.cards[0].keywords).toEqual(expect.arrayContaining(["Go Solo", "Trash"]));
  });

  it("fetches every page when Netdeck caps responses at 100 cards", async () => {
    const template = cyberpunkCardSnapshot.cards[0];
    const cards = Array.from({ length: 104 }, (_, index) => ({
      ...template,
      id: `card-${index}`,
      external_id: `external-${index}`,
      name: `card-${index}`,
      display_name: `Card ${index}`,
      slug: `card-${index}`,
      printing_id: String(index)
    }));
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
      return Promise.resolve(mockResponse({
        total: cards.length,
        limit: 100,
        offset,
        items: cards.slice(offset, offset + 100)
      }));
    });

    const snapshot = await fetchCardDatabaseSnapshot("https://api.netdeck.gg/api/cards/cyberpunk", undefined, fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetcher.mock.calls[1][0])).searchParams.get("offset")).toBe("100");
    expect(snapshot.metadata.sourceCardCount).toBe(104);
    expect(snapshot.cards).toHaveLength(104);
    expect(snapshot.cards.at(-1)?.id).toBe("card-103");
  });

  it("reports an incomplete paginated response clearly", async () => {
    const card = cyberpunkCardSnapshot.cards[0];
    const fetcher = vi.fn((input: RequestInfo | URL) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
      return Promise.resolve(mockResponse({ total: 101, limit: 100, offset, items: offset === 0 ? [card] : [] }));
    });

    await expect(fetchCardDatabaseSnapshot(
      "https://api.netdeck.gg/api/cards/cyberpunk",
      undefined,
      fetcher as unknown as typeof fetch
    )).rejects.toThrow("stopped after 1 of 101 cards");
  });

  it("saves a valid refreshed snapshot and reloads it", async () => {
    const storage = createStorage();
    const card = cyberpunkCardSnapshot.cards[0];
    const fetcher = vi.fn(() => Promise.resolve(mockResponse({ total: 1, items: [card] })));

    const result = await refreshStoredCardDatabase(storage, { metadata: cyberpunkCardSnapshot.metadata, cards: [] }, undefined, fetcher as unknown as typeof fetch);
    const loaded = loadStoredCardDatabase(storage);

    expect(result.cardCount).toBe(1);
    expect(result.changed).toBe(true);
    expect(result.newCards.map((card) => card.id)).toEqual([card.id]);
    expect(result.message).toContain("1 new");
    expect(loaded.usingOverride).toBe(true);
    expect(loaded.cardDb.cards).toHaveLength(1);
    expect(loaded.cardDb.cards[0].keywords).toEqual(expect.arrayContaining(card.keywords));
  });

  it("repairs stored snapshots with missing keywords", () => {
    const storage = createStorage();
    const card = { ...cyberpunkCardSnapshot.cards[0], keywords: [] };
    storage.setItem("gigsmith.card-database.override.v1", JSON.stringify({
      metadata: { ...cyberpunkCardSnapshot.metadata, sourceCardCount: 1 },
      cards: [card]
    }));

    const loaded = loadStoredCardDatabase(storage);

    expect(loaded.usingOverride).toBe(true);
    expect(loaded.cardDb.cards[0].keywords).toEqual(expect.arrayContaining(["Go Solo", "Trash"]));
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
    expect(result.newCards).toEqual([]);
    expect(result.message).toContain("already current");
  });

  it("uses one-card set probes when the saved snapshot is already current", async () => {
    const storage = createStorage();
    const sourceCards = [
      testCard("alpha-1", "SET-A", "Alpha One"),
      testCard("alpha-2", "SET-A", "Alpha Two"),
      testCard("beta-1", "SET-B", "Beta One")
    ];
    const initialFetcher = setAwareFetcher(sourceCards);
    const initial = await refreshStoredCardDatabase(
      storage,
      { metadata: cyberpunkCardSnapshot.metadata, cards: [] },
      undefined,
      initialFetcher as unknown as typeof fetch
    );

    const probeFetcher = setAwareFetcher(sourceCards);
    const refreshed = await refreshStoredCardDatabase(
      storage,
      initial.cardDb!,
      undefined,
      probeFetcher as unknown as typeof fetch
    );

    expect(refreshed.mode).toBe("cache");
    expect(refreshed.changed).toBe(false);
    expect(refreshed.cardCount).toBe(sourceCards.length);
    expect(probeFetcher).toHaveBeenCalled();
    expect(probeFetcher.mock.calls.every(([input]) => {
      const endpoint = new URL(String(input));
      return endpoint.searchParams.get("limit") === "1";
    })).toBe(true);
  });

  it("downloads only a changed set when a set gains cards", async () => {
    const storage = createStorage();
    const initialCards = [
      testCard("alpha-1", "SET-A", "Alpha One"),
      testCard("alpha-2", "SET-A", "Alpha Two"),
      testCard("beta-1", "SET-B", "Beta One")
    ];
    const initial = await refreshStoredCardDatabase(
      storage,
      { metadata: cyberpunkCardSnapshot.metadata, cards: [] },
      undefined,
      setAwareFetcher(initialCards) as unknown as typeof fetch
    );
    const updatedCards = [
      ...initialCards,
      testCard("alpha-3", "SET-A", "Alpha Three")
    ];
    const fetcher = setAwareFetcher(updatedCards);

    const refreshed = await refreshStoredCardDatabase(
      storage,
      initial.cardDb!,
      undefined,
      fetcher as unknown as typeof fetch
    );

    expect(refreshed.mode).toBe("incremental");
    expect(refreshed.changed).toBe(true);
    expect(refreshed.newCards.map((card) => card.id)).toEqual(["alpha-3"]);
    expect(refreshed.cardDb?.cards.map((card) => card.id)).toEqual([
      "alpha-1",
      "alpha-2",
      "alpha-3",
      "beta-1"
    ]);
    const requests = fetcher.mock.calls.map(([input]) => new URL(String(input)));
    expect(requests.some((endpoint) => endpoint.searchParams.get("set") === "SET-A" && endpoint.searchParams.get("limit") === "100")).toBe(true);
    expect(requests.some((endpoint) => !endpoint.searchParams.has("set") && endpoint.searchParams.get("limit") === "100")).toBe(false);
  });

  it("downloads a newly visible boundary set without refreshing existing sets", async () => {
    const storage = createStorage();
    const initialCards = [
      testCard("alpha-1", "SET-A", "Alpha One"),
      testCard("beta-1", "SET-B", "Beta One")
    ];
    const initial = await refreshStoredCardDatabase(
      storage,
      { metadata: cyberpunkCardSnapshot.metadata, cards: [] },
      undefined,
      setAwareFetcher(initialCards) as unknown as typeof fetch
    );
    const updatedCards = [
      testCard("new-1", "SET-NEW", "New Card"),
      ...initialCards
    ];
    const fetcher = setAwareFetcher(updatedCards);

    const refreshed = await refreshStoredCardDatabase(
      storage,
      initial.cardDb!,
      undefined,
      fetcher as unknown as typeof fetch
    );

    expect(refreshed.mode).toBe("incremental");
    expect(refreshed.cardCount).toBe(3);
    expect(refreshed.cardDb?.cards.map((card) => card.id)).toEqual(["new-1", "alpha-1", "beta-1"]);
    expect(fetcher.mock.calls.some(([input]) => {
      const endpoint = new URL(String(input));
      return endpoint.searchParams.get("set") === "SET-NEW" && endpoint.searchParams.get("limit") === "100";
    })).toBe(true);
    expect(fetcher.mock.calls.some(([input]) => {
      const endpoint = new URL(String(input));
      return !endpoint.searchParams.has("set") && endpoint.searchParams.get("limit") === "100";
    })).toBe(false);
  });

  it("falls back to a full refresh when a new set cannot be located at a boundary", async () => {
    const storage = createStorage();
    const initialCards = [
      testCard("alpha-1", "SET-A", "Alpha One"),
      testCard("beta-1", "SET-B", "Beta One")
    ];
    const initial = await refreshStoredCardDatabase(
      storage,
      { metadata: cyberpunkCardSnapshot.metadata, cards: [] },
      undefined,
      setAwareFetcher(initialCards) as unknown as typeof fetch
    );
    const updatedCards = [
      initialCards[0],
      testCard("new-1", "SET-NEW", "New Card"),
      initialCards[1]
    ];
    const fetcher = setAwareFetcher(updatedCards);

    const refreshed = await refreshStoredCardDatabase(
      storage,
      initial.cardDb!,
      undefined,
      fetcher as unknown as typeof fetch
    );

    expect(refreshed.mode).toBe("full");
    expect(refreshed.cardCount).toBe(3);
    expect(fetcher.mock.calls.some(([input]) => {
      const endpoint = new URL(String(input));
      return !endpoint.searchParams.has("set") && endpoint.searchParams.get("limit") === "100";
    })).toBe(true);
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

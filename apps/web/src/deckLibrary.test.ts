import { describe, expect, it } from "vitest";
import type { Deck } from "@gigsmith/data-contracts";
import {
  addDeck,
  createDeckLibrary,
  deckLibraryRecoveryStorageKey,
  deckLibraryStorageKey,
  getActiveDeck,
  legacyDeckStorageKey,
  loadDeckLibrary,
  loadDeckLibraryResult,
  removeDeck,
  resetDeckLibrary,
  replaceActiveDeck,
  selectDeck,
  type StorageAdapter
} from "./deckLibrary";

function deck(id: string, name = id): Deck {
  return {
    id,
    name,
    legends: [],
    main: [],
    formatId: "open-guide",
    rulesetVersion: "ruleset.v0-guide",
    cardDataVersion: "cards.v1"
  };
}

function memoryStorage(initial: Record<string, string> = {}): StorageAdapter & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
}

describe("loadDeckLibrary", () => {
  it("loads a valid saved library", () => {
    const saved = addDeck(createDeckLibrary(deck("one")), deck("two"));
    const storage = memoryStorage({ [deckLibraryStorageKey]: JSON.stringify(saved) });

    expect(loadDeckLibrary(storage, deck("fallback"))).toEqual(saved);
  });

  it("loads a saved library with immutable deck versions", () => {
    const savedDeck: Deck = {
      ...deck("one"),
      versions: [{
        id: "version-1",
        name: "Week 1",
        createdAt: "2026-06-28T12:00:00.000Z",
        deckName: "One",
        legends: [],
        main: [],
        formatId: "open-guide",
        rulesetVersion: "ruleset.v0-guide",
        cardDataVersion: "cards.v1"
      }]
    };
    const saved = createDeckLibrary(savedDeck);
    const storage = memoryStorage({ [deckLibraryStorageKey]: JSON.stringify(saved) });

    expect(loadDeckLibrary(storage, deck("fallback"))).toEqual(saved);
  });

  it("migrates the legacy single-deck value", () => {
    const legacy = deck("legacy");
    const storage = memoryStorage({ [legacyDeckStorageKey]: JSON.stringify(legacy) });

    const library = loadDeckLibrary(storage, deck("fallback"));

    expect(getActiveDeck(library)).toEqual(legacy);
    expect(storage.getItem(legacyDeckStorageKey)).toBeNull();
    expect(storage.getItem(deckLibraryStorageKey)).not.toBeNull();
  });

  it("preserves invalid JSON without overwriting the original payload", () => {
    const storage = memoryStorage({ [deckLibraryStorageKey]: "not-json" });

    const result = loadDeckLibraryResult(storage, deck("fallback"));

    expect(result.recovery).toEqual({
      sourceKey: deckLibraryStorageKey,
      rawValue: "not-json",
      reason: "invalid-json"
    });
    expect(storage.getItem(deckLibraryStorageKey)).toBe("not-json");
    expect(JSON.parse(storage.getItem(deckLibraryRecoveryStorageKey) ?? "")).toEqual(result.recovery);
  });

  it.each([
    null,
    {},
    { cardId: "card-1" },
    { cardId: "card-1", count: 0 },
    { cardId: "card-1", count: 1.5 }
  ])("preserves a saved deck containing an invalid entry: %j", (entry) => {
    const invalidDeck = { ...deck("saved"), main: [entry] };
    const storedLibrary = {
      version: 1,
      activeDeckId: invalidDeck.id,
      decks: [invalidDeck]
    };
    const storage = memoryStorage({
      [deckLibraryStorageKey]: JSON.stringify(storedLibrary)
    });

    const result = loadDeckLibraryResult(storage, deck("fallback"));
    expect(result.recovery?.reason).toBe("invalid-schema");
    expect(storage.getItem(deckLibraryStorageKey)).toBe(JSON.stringify(storedLibrary));
  });

  it("preserves an invalid legacy payload", () => {
    const storage = memoryStorage({ [legacyDeckStorageKey]: "{" });

    const result = loadDeckLibraryResult(storage, deck("fallback"));

    expect(result.recovery).toMatchObject({
      sourceKey: legacyDeckStorageKey,
      rawValue: "{",
      reason: "invalid-json"
    });
    expect(storage.getItem(legacyDeckStorageKey)).toBe("{");
  });

  it("preserves a saved library containing malformed version history", () => {
    const saved = createDeckLibrary({
      ...deck("one"),
      versions: [{ id: "version-1", createdAt: "today" }]
    } as unknown as Deck);
    const storage = memoryStorage({ [deckLibraryStorageKey]: JSON.stringify(saved) });

    const result = loadDeckLibraryResult(storage, deck("fallback"));

    expect(result.recovery?.reason).toBe("invalid-schema");
  });

  it("clears only Gigsmith deck keys during an explicit reset", () => {
    const storage = memoryStorage({
      [deckLibraryStorageKey]: "broken",
      [legacyDeckStorageKey]: "legacy",
      [deckLibraryRecoveryStorageKey]: "recovery",
      "unrelated.preference": "keep"
    });

    const library = resetDeckLibrary(storage, deck("fallback"));

    expect(getActiveDeck(library).id).toBe("fallback");
    expect(storage.getItem(legacyDeckStorageKey)).toBeNull();
    expect(storage.getItem(deckLibraryRecoveryStorageKey)).toBeNull();
    expect(JSON.parse(storage.getItem(deckLibraryStorageKey) ?? "")).toEqual(library);
    expect(storage.getItem("unrelated.preference")).toBe("keep");
  });
});

describe("deck library operations", () => {
  it("adds, selects, and replaces decks", () => {
    const withTwo = addDeck(createDeckLibrary(deck("one")), deck("two"));
    const selected = selectDeck(withTwo, "one");
    const replaced = replaceActiveDeck(selected, deck("one", "Renamed"));

    expect(getActiveDeck(replaced).name).toBe("Renamed");
    expect(replaced.decks).toHaveLength(2);
  });

  it("selects a remaining deck when the active deck is removed", () => {
    const library = addDeck(createDeckLibrary(deck("one")), deck("two"));

    const removed = removeDeck(library, "two");

    expect(removed.decks.map((candidate) => candidate.id)).toEqual(["one"]);
    expect(removed.activeDeckId).toBe("one");
  });

  it("does not remove the final deck", () => {
    const library = createDeckLibrary(deck("one"));

    expect(removeDeck(library, "one")).toBe(library);
  });
});

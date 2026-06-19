import { describe, expect, it } from "vitest";
import type { Deck } from "@gigsmith/data-contracts";
import {
  addDeck,
  createDeckLibrary,
  deckLibraryStorageKey,
  getActiveDeck,
  legacyDeckStorageKey,
  loadDeckLibrary,
  removeDeck,
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

  it("migrates the legacy single-deck value", () => {
    const legacy = deck("legacy");
    const storage = memoryStorage({ [legacyDeckStorageKey]: JSON.stringify(legacy) });

    const library = loadDeckLibrary(storage, deck("fallback"));

    expect(getActiveDeck(library)).toEqual(legacy);
    expect(storage.getItem(legacyDeckStorageKey)).toBeNull();
    expect(storage.getItem(deckLibraryStorageKey)).not.toBeNull();
  });

  it("uses and saves the fallback for invalid data", () => {
    const storage = memoryStorage({ [deckLibraryStorageKey]: "not-json" });

    const library = loadDeckLibrary(storage, deck("fallback"));

    expect(getActiveDeck(library).id).toBe("fallback");
    expect(JSON.parse(storage.getItem(deckLibraryStorageKey) ?? "")).toEqual(library);
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

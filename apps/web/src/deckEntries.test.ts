import { describe, expect, it } from "vitest";
import { adjustDeckEntry, hasDeckEntry } from "./deckEntries";

describe("adjustDeckEntry", () => {
  it("adds and increments an entry without mutating the input", () => {
    const entries = [{ cardId: "card-1", count: 1 }];

    const incremented = adjustDeckEntry(entries, "card-1", 1);
    const added = adjustDeckEntry(entries, "card-2", 1);

    expect(incremented).toEqual([{ cardId: "card-1", count: 2 }]);
    expect(added).toEqual([
      { cardId: "card-1", count: 1 },
      { cardId: "card-2", count: 1 }
    ]);
    expect(entries).toEqual([{ cardId: "card-1", count: 1 }]);
  });

  it("removes entries at zero and never creates negative entries", () => {
    const entries = [{ cardId: "card-1", count: 1 }];

    expect(adjustDeckEntry(entries, "card-1", -1)).toEqual([]);
    expect(adjustDeckEntry(entries, "missing", -1)).toBe(entries);
  });
});

describe("hasDeckEntry", () => {
  it("reports whether a card is already selected", () => {
    const entries = [{ cardId: "card-1", count: 1 }];

    expect(hasDeckEntry(entries, "card-1")).toBe(true);
    expect(hasDeckEntry(entries, "card-2")).toBe(false);
  });
});

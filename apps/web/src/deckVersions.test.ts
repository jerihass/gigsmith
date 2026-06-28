import { describe, expect, it } from "vitest";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import { createValidDeck } from "@gigsmith/test-fixtures";
import {
  addDeckVersion,
  compareDeckVersionToDeck,
  createDeckVersionSnapshot,
  restoreDeckVersion
} from "./deckVersions";

describe("deck versions", () => {
  it("creates an immutable named snapshot of the current deck baseline", () => {
    const deck = createValidDeck({ name: "Red Rage", metadata: { notes: "Event list" } });
    const versioned = addDeckVersion(deck, "Week 1", {
      id: "version-1",
      createdAt: "2026-06-28T12:00:00.000Z"
    });

    versioned.main[0].count = 1;

    expect(versioned.versions).toEqual([{
      id: "version-1",
      name: "Week 1",
      createdAt: "2026-06-28T12:00:00.000Z",
      deckName: "Red Rage",
      legends: deck.legends,
      main: createValidDeck().main,
      formatId: deck.formatId,
      rulesetVersion: deck.rulesetVersion,
      cardDataVersion: deck.cardDataVersion,
      notes: "Event list"
    }]);
  });

  it("restores a version as the current edit without deleting later history", () => {
    const original = createValidDeck({ name: "Original" });
    const versioned = addDeckVersion(original, "Original saved", {
      id: "saved",
      createdAt: "2026-06-28T12:00:00.000Z"
    });
    const edited = {
      ...versioned,
      name: "Edited",
      main: versioned.main.slice(1)
    };

    const restored = restoreDeckVersion(edited, "saved", "2026-06-29T00:00:00.000Z");

    expect(restored.name).toBe("Original");
    expect(restored.main).toEqual(original.main);
    expect(restored.versions).toHaveLength(1);
    expect(restored.metadata?.updatedAt).toBe("2026-06-29T00:00:00.000Z");
  });

  it("compares stable card IDs between a version and the current deck", () => {
    const original = createValidDeck();
    const snapshot = createDeckVersionSnapshot(original, "Before", {
      id: "before",
      createdAt: "2026-06-28T12:00:00.000Z"
    });
    const edited = {
      ...original,
      cardDataVersion: "cards.next",
      main: [
        { ...original.main[0], count: original.main[0].count - 1 },
        ...original.main.slice(2),
        { cardId: "future-card", count: 2 }
      ]
    };

    const comparison = compareDeckVersionToDeck(snapshot, edited, cyberpunkCardDb);

    expect(comparison.changed).toContainEqual({
      cardId: original.main[0].cardId,
      before: original.main[0].count,
      after: original.main[0].count - 1,
      section: "main"
    });
    expect(comparison.removed).toContainEqual({
      cardId: original.main[1].cardId,
      before: original.main[1].count,
      after: 0,
      section: "main"
    });
    expect(comparison.added).toContainEqual({
      cardId: "future-card",
      before: 0,
      after: 2,
      section: "main"
    });
    expect(comparison.missingCardIds).toEqual(["future-card"]);
    expect(comparison.baselineChanges).toEqual([`Cards ${original.cardDataVersion} -> cards.next`]);
  });
});

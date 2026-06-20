import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { drawSampleHand } from "./sampleHand";

const ruleset = cyberpunkRulesetV1Printable;

describe("drawSampleHand", () => {
  it("returns the same six-card hand for the same deck and seed", () => {
    const deck = createValidDeck();
    const first = drawSampleHand(deck, cyberpunkCardDb, ruleset, "night-city");
    const second = drawSampleHand(deck, cyberpunkCardDb, ruleset, "night-city");

    expect(first.cards).toEqual(second.cards);
    expect(first.cards).toHaveLength(6);
    expect(first.seed).toBe("night-city");
  });

  it("never draws more copies than the deck contains", () => {
    const deck = createValidDeck();
    const report = drawSampleHand(deck, cyberpunkCardDb, ruleset, "copy-check", 40);
    const drawnCounts = new Map<string, number>();
    for (const card of report.cards) drawnCounts.set(card.cardId, (drawnCounts.get(card.cardId) ?? 0) + 1);

    for (const entry of deck.main) {
      expect(drawnCounts.get(entry.cardId) ?? 0).toBeLessThanOrEqual(entry.count);
    }
  });

  it("returns all available cards and an issue for a short deck", () => {
    const deck: Deck = { ...createValidDeck(), main: [createValidDeck().main[0]] };
    const report = drawSampleHand(deck, cyberpunkCardDb, ruleset, "short");

    expect(report.cards).toHaveLength(3);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "insufficient-deck" }));
  });

  it("reports unknown cards without crashing", () => {
    const deck: Deck = { ...createValidDeck(), main: [{ cardId: "unknown-card", count: 2 }] };
    const report = drawSampleHand(deck, cyberpunkCardDb, ruleset, "unknown", 2);

    expect(report.cards.every((card) => !card.known)).toBe(true);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "unknown-card",
      affectedCardIds: ["unknown-card"]
    }));
  });

  it("excludes invalid copy counts with a structured issue", () => {
    const deck: Deck = { ...createValidDeck(), main: [{ cardId: createValidDeck().main[0].cardId, count: 0 }] };
    const report = drawSampleHand(deck, cyberpunkCardDb, ruleset, "invalid");

    expect(report.deckCardCount).toBe(0);
    expect(report.issues.map((issue) => issue.code)).toEqual(["invalid-count", "insufficient-deck"]);
  });

  it("normalizes an empty seed and records data versions", () => {
    const report = drawSampleHand(createValidDeck(), cyberpunkCardDb, ruleset, "   ");

    expect(report.seed).toBe("gigsmith");
    expect(report.rulesetVersion).toBe(ruleset.version);
    expect(report.cardDataVersion).toBe(cyberpunkCardDb.metadata.cardDataVersion);
  });
});

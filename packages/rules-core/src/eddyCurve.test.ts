import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { cardBySlug, createValidDeck } from "@gigsmith/test-fixtures";
import { analyzeEddyCurve } from "./eddyCurve";

describe("analyzeEddyCurve", () => {
  it("reports deterministic demand and draw-dependent supply for the golden deck", () => {
    const report = analyzeEddyCurve(
      createValidDeck(),
      cyberpunkCardDb,
      cyberpunkRulesetV1Printable
    );

    expect(report).toMatchObject({
      rulesetVersion: cyberpunkRulesetV1Printable.version,
      cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion,
      mainDeckDemand: {
        cardCount: 40,
        cardsWithKnownCost: 40,
        totalPrintedCost: 123,
        averagePrintedCost: 3.075,
        cardsWithoutPrintedCostIds: []
      },
      supply: {
        sellableCardCount: 9,
        nonSellableCardCount: 31,
        sellableDensity: 0.225,
        maximumPersistentEddies: 9
      }
    });
    expect(report.mainDeckDemand.costBuckets.map(({ cost, cardCount }) => ({ cost, cardCount }))).toEqual([
      { cost: 1, cardCount: 6 },
      { cost: 2, cardCount: 9 },
      { cost: 3, cardCount: 4 },
      { cost: 4, cardCount: 18 },
      { cost: 5, cardCount: 3 }
    ]);
    expect(report.supply.turnProjections[0]).toEqual({
      turn: 1,
      cardsSeen: 7,
      expectedSellableCardsSeen: 1.575,
      expectedPersistentEddies: 0.859,
      maximumPersistentEddies: 1,
      firstPlayerLegendCapacity: 1,
      secondPlayerLegendCapacity: 3,
      expectedFirstPlayerPaymentCapacity: 1.859,
      expectedSecondPlayerPaymentCapacity: 3.859
    });
    expect(report.supply.turnProjections).toHaveLength(7);
  });

  it("warns when a main-deck card has no printed cost", () => {
    const card = cardBySlug("swordwise-huscle");
    const cardDb = {
      ...cyberpunkCardDb,
      cards: cyberpunkCardDb.cards.map((candidate) => (
        candidate.id === card.id ? { ...candidate, cost: null } : candidate
      ))
    };

    const report = analyzeEddyCurve(createValidDeck(), cardDb, cyberpunkRulesetV1Printable);

    expect(report.mainDeckDemand.cardsWithoutPrintedCostIds).toEqual([card.id]);
    expect(report.warnings).toContainEqual({
      code: "missing-main-cost",
      message: "Some main-deck cards have no printed cost in the current card snapshot.",
      affectedCards: [card.id]
    });
  });

  it("lists card-text economy effects without applying them", () => {
    const card = cardBySlug("swordwise-huscle");
    const cardDb = {
      ...cyberpunkCardDb,
      cards: cyberpunkCardDb.cards.map((candidate) => (
        candidate.id === card.id
          ? { ...candidate, rules_text: "At the end of your turn, ready 1 Eddie." }
          : candidate
      ))
    };

    const report = analyzeEddyCurve(createValidDeck(), cardDb, cyberpunkRulesetV1Printable);

    expect(report.effectReferences).toContainEqual({
      cardId: card.id,
      copies: 3,
      rulesText: "At the end of your turn, ready 1 Eddie."
    });
    expect(
      report.warnings.find((warning) => warning.code === "unmodeled-eddy-effects")?.affectedCards
    ).toContain(card.id);
  });
});

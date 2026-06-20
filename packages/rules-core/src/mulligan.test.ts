import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck, Ruleset } from "@gigsmith/data-contracts";
import { cardBySlug, createValidDeck } from "@gigsmith/test-fixtures";
import { analyzeMulligan } from "./mulligan";

function smallDeck(): Deck {
  const base = createValidDeck();
  return {
    ...base,
    main: [
      { cardId: cardBySlug("mantis-blades").id, count: 2 },
      { cardId: cardBySlug("swordwise-huscle").id, count: 2 }
    ]
  };
}

function twoCardOpeningRules(): Ruleset {
  return {
    ...cyberpunkRulesetV1Printable,
    eddyRules: { ...cyberpunkRulesetV1Printable.eddyRules, openingHandSize: 2 },
    mulliganRules: { ...cyberpunkRulesetV1Printable.mulliganRules, drawCount: 2 }
  };
}

describe("analyzeMulligan", () => {
  it("exactly enumerates small decks", () => {
    const report = analyzeMulligan(smallDeck(), cyberpunkCardDb, twoCardOpeningRules(), {
      seed: "exact",
      playerOrder: "first"
    });

    expect(report.method).toBe("exact");
    expect(report.sampleSize).toBe(6);
    expect(report.totalOutcomes).toBe(6);
    expect(report.expectedMulliganMetrics.sellableCount).toBe(1);
    expect(report.expectedMulliganMetrics.averagePrintedCost).toBe(2);
    expect(report.expectedMulliganMetrics.playableCardCount).toBe(1);
    expect(report.scoreMarginOfError).toBe(0);
  });

  it("uses seeded simulation reproducibly for a normal deck", () => {
    const options = { seed: "repeatable", simulationSamples: 250 } as const;
    const first = analyzeMulligan(createValidDeck(), cyberpunkCardDb, cyberpunkRulesetV1Printable, options);
    const second = analyzeMulligan(createValidDeck(), cyberpunkCardDb, cyberpunkRulesetV1Printable, options);

    expect(first.method).toBe("seeded-simulation");
    expect(first.sampleSize).toBe(250);
    expect(first.expectedMulliganMetrics).toEqual(second.expectedMulliganMetrics);
    expect(first.recommendation).toBe(second.recommendation);
    expect(first.scoreMarginOfError).toBe(second.scoreMarginOfError);
  });

  it("leans toward a mulligan for a clearly weak exact hand", () => {
    const deck = smallDeck();
    const ruleset = twoCardOpeningRules();
    let report = analyzeMulligan(deck, cyberpunkCardDb, ruleset, { seed: "0" });
    for (
      let index = 1;
      index < 100 && (report.currentMetrics.playableCardCount > 0 || report.currentMetrics.sellableCount > 0);
      index += 1
    ) {
      report = analyzeMulligan(deck, cyberpunkCardDb, ruleset, { seed: String(index) });
    }

    expect(report.currentMetrics.playableCardCount).toBe(0);
    expect(report.currentMetrics.sellableCount).toBe(0);
    expect(report.recommendation).toBe("lean-mulligan");
    expect(report.reasons).toHaveLength(3);
  });

  it("accounts for player-order Legend capacity", () => {
    const first = analyzeMulligan(smallDeck(), cyberpunkCardDb, twoCardOpeningRules(), {
      seed: "order",
      playerOrder: "first"
    });
    const second = analyzeMulligan(smallDeck(), cyberpunkCardDb, twoCardOpeningRules(), {
      seed: "order",
      playerOrder: "second"
    });

    expect(first.currentMetrics.firstTurnPaymentCapacity).toBeLessThan(second.currentMetrics.firstTurnPaymentCapacity);
    expect(second.expectedMulliganMetrics.playableCardCount).toBe(2);
  });

  it("reports short decks and unknown cards without crashing", () => {
    const deck: Deck = {
      ...createValidDeck(),
      main: [{ cardId: "missing-card", count: 2 }]
    };
    const report = analyzeMulligan(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable, { seed: "missing" });

    expect(report.currentHand.cards).toHaveLength(2);
    expect(report.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining([
      "unknown-card",
      "insufficient-data"
    ]));
  });

  it("warns when card text is outside the model", () => {
    const report = analyzeMulligan(createValidDeck(), cyberpunkCardDb, cyberpunkRulesetV1Printable, {
      seed: "effects",
      simulationSamples: 100
    });

    expect(report.issues).toContainEqual(expect.objectContaining({ code: "unsupported-card-text" }));
    expect(report.assumptions).toContainEqual(expect.stringContaining("not claims of an objectively correct play"));
    expect(report.version).toBe("mulligan-analysis.v1");
  });
});

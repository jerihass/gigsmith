import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { CardDatabase } from "@gigsmith/data-contracts";
import { evaluateMainDeckAdditions } from "@gigsmith/rules-core";
import { createValidDeck } from "@gigsmith/test-fixtures";
import budgets from "../performance-budgets.json" with { type: "json" };

describe("deck addition performance", () => {
  it("evaluates the expected card-count target within budget", () => {
    const cards = Array.from({ length: budgets.expectedCardCountTarget }, (_, index) => {
      const source = cyberpunkCardDb.cards[index % cyberpunkCardDb.cards.length];
      if (index < cyberpunkCardDb.cards.length) return source;
      return {
        ...source,
        id: `${source.id}-perf-${index}`,
        external_id: `${source.external_id}-perf-${index}`,
        slug: `${source.slug}-perf-${index}`
      };
    });
    const cardDb: CardDatabase = { ...cyberpunkCardDb, cards };
    const deck = createValidDeck();
    const iterations = 50;
    const startedAt = performance.now();

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      expect(evaluateMainDeckAdditions(deck, cardDb, cyberpunkRulesetV1Printable).size).toBe(cards.length);
    }

    const averageMs = (performance.now() - startedAt) / iterations;
    console.log(`[performance] ${cards.length}-card addition evaluation averaged ${averageMs.toFixed(3)} ms`);
    expect(averageMs).toBeLessThanOrEqual(budgets.interactions.additionEvaluationAtTargetMs);
  });
});

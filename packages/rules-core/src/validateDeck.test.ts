import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV0Guide } from "@gigsmith/card-data";
import { cardBySlug, createValidDeck } from "@gigsmith/test-fixtures";
import { calculateRamLimits, validateDeck } from "./index";

describe("validateDeck", () => {
  it("accepts a legal guide-format deck", () => {
    const result = validateDeck(createValidDeck(), cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.info[0]?.code).toBe("deck-legal");
  });

  it("requires exactly 3 Legends", () => {
    const deck = createValidDeck({ legends: [createValidDeck().legends[0]] });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("legend-total");
  });

  it("requires unique Legend names", () => {
    const duplicate = createValidDeck().legends[0];
    const deck = createValidDeck({ legends: [duplicate, duplicate, createValidDeck().legends[1]] });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("legend-duplicate-name");
  });

  it("enforces 40-50 main deck cards", () => {
    const deck = createValidDeck({ main: createValidDeck().main.slice(0, 3) });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("main-deck-size");
  });

  it("enforces max 3 copies of non-Legend cards", () => {
    const deck = createValidDeck();
    deck.main[0] = { ...deck.main[0], count: 4 };
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("max-copies");
  });

  it("enforces RAM limits by Legend color totals", () => {
    const deck = createValidDeck();
    deck.main[0] = { cardId: cardBySlug("adam-smasher-metal-over-meat").id, count: 1 };
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("ram-limit");
  });

  it("reports unknown card IDs", () => {
    const deck = createValidDeck();
    deck.main.push({ cardId: "missing-card", count: 1 });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("unknown-card");
  });

  it("calculates cumulative RAM from selected Legends", () => {
    const report = calculateRamLimits(createValidDeck().legends, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(report.limits).toEqual([
      expect.objectContaining({ color: "Green", limit: 2 }),
      expect.objectContaining({ color: "Red", limit: 2 }),
      expect.objectContaining({ color: "Yellow", limit: 2 })
    ]);
  });
});

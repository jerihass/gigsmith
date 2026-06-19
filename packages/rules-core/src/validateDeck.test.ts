import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV0Guide } from "@gigsmith/card-data";
import { cardBySlug, createFormatRuleset, createValidDeck } from "@gigsmith/test-fixtures";
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
    expect(result.errors.find((error) => error.code === "legend-total")?.suggestedFixes).toEqual([
      "Add 2 different Legend cards."
    ]);
  });

  it("suggests removing excess Legends", () => {
    const validDeck = createValidDeck();
    const deck = createValidDeck({ legends: [...validDeck.legends, validDeck.legends[0]] });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);

    expect(result.errors.find((error) => error.code === "legend-total")?.suggestedFixes).toEqual([
      "Remove 1 Legend card, keeping exactly 3 different Legends."
    ]);
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
    expect(result.errors.find((error) => error.code === "main-deck-size")?.suggestedFixes).toEqual([
      "Add 31 non-Legend cards to the main deck."
    ]);
  });

  it("suggests removing cards above the main-deck maximum", () => {
    const deck = createValidDeck();
    deck.main.push({ ...deck.main[0], count: 11 });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);

    expect(result.errors.find((error) => error.code === "main-deck-size")?.suggestedFixes).toEqual([
      "Remove 1 card from the main deck."
    ]);
  });

  it("enforces max 3 copies of non-Legend cards", () => {
    const deck = createValidDeck();
    deck.main[0] = { ...deck.main[0], count: 4 };
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.find((error) => error.code === "max-copies")?.suggestedFixes).toEqual([
      `Remove 1 copy of ${cardBySlug("swordwise-huscle").display_name}.`
    ]);
  });

  it("enforces RAM limits by Legend color totals", () => {
    const deck = createValidDeck();
    const adamSmasher = cardBySlug("adam-smasher-metal-over-meat");
    deck.main[0] = { cardId: adamSmasher.id, count: 1 };
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.find((error) => error.code === "ram-limit")?.suggestedFixes).toEqual([
      `Replace a selected Legend with one that provides more ${adamSmasher.color} RAM, or remove ${adamSmasher.display_name}.`
    ]);
  });

  it("reports unknown card IDs", () => {
    const deck = createValidDeck();
    deck.main.push({ cardId: "missing-card", count: 1 });
    const result = validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV0Guide);
    expect(result.legal).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("unknown-card");
  });

  it("reports cards banned by the selected format", () => {
    const bannedCard = cardBySlug("swordwise-huscle");
    const ruleset = createFormatRuleset({ banned: [bannedCard.id] });
    const deck = createValidDeck({
      formatId: ruleset.defaultFormatId,
      rulesetVersion: ruleset.version
    });

    const result = validateDeck(deck, cyberpunkCardDb, ruleset);

    expect(result.legal).toBe(false);
    expect(result.errors.find((error) => error.code === "banned-card")).toEqual(
      expect.objectContaining({
        message: `${bannedCard.display_name} is banned in Fixture Format.`,
        affectedCards: [bannedCard.id]
      })
    );
  });

  it("warns when a selected Legend is restricted by the format", () => {
    const restrictedLegend = cardBySlug("v-streetkid");
    const ruleset = createFormatRuleset({ restricted: [restrictedLegend.id] });
    const deck = createValidDeck({
      formatId: ruleset.defaultFormatId,
      rulesetVersion: ruleset.version
    });

    const result = validateDeck(deck, cyberpunkCardDb, ruleset);

    expect(result.legal).toBe(true);
    expect(result.warnings.find((warning) => warning.code === "restricted-card")).toEqual(
      expect.objectContaining({
        message: `${restrictedLegend.display_name} is restricted in Fixture Format.`,
        affectedCards: [restrictedLegend.id]
      })
    );
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

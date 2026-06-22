import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { cardBySlug, createFormatRuleset, createValidDeck } from "@gigsmith/test-fixtures";
import {
  calculateRamLimits,
  evaluateCardRamCompatibility,
  evaluateMainDeckAddition,
  evaluateMainDeckAdditions
} from "./index";

describe("evaluateMainDeckAddition", () => {
  it("blocks additions at the ruleset copy maximum", () => {
    const deck = createValidDeck();
    const card = cardBySlug("swordwise-huscle");
    const result = evaluateMainDeckAddition(deck, card.id, cyberpunkCardDb, cyberpunkRulesetV1Printable);

    expect(result).toEqual(expect.objectContaining({
      allowed: false,
      currentCopies: 3,
      maxCopies: 3
    }));
    expect(result.blockers.map((blocker) => blocker.code)).toContain("max-copies");
  });

  it("warns without blocking when selected Legends do not provide enough RAM", () => {
    const deck = createValidDeck();
    const card = cardBySlug("adam-smasher-metal-over-meat");
    const result = evaluateMainDeckAddition(deck, card.id, cyberpunkCardDb, cyberpunkRulesetV1Printable);

    expect(result.allowed).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toContain("ram-incompatible");
  });

  it("keeps additions available while Legends are being changed", () => {
    const original = createValidDeck();
    const deck = createValidDeck({ legends: original.legends.slice(0, 1) });
    const card = cardBySlug("chrome-reverie");
    const deckWithoutCard = createValidDeck({
      legends: deck.legends,
      main: original.main.filter((entry) => entry.cardId !== card.id)
    });
    const result = evaluateMainDeckAddition(
      deckWithoutCard,
      card.id,
      cyberpunkCardDb,
      cyberpunkRulesetV1Printable
    );

    expect(result.allowed).toBe(true);
    expect(result.warnings.map((warning) => warning.code)).toContain("ram-incompatible");
  });

  it("blocks unknown and banned cards", () => {
    const deck = createValidDeck();
    expect(evaluateMainDeckAddition(deck, "missing-card", cyberpunkCardDb, cyberpunkRulesetV1Printable).blockers[0]?.code)
      .toBe("unknown-card");

    const card = cardBySlug("chrome-reverie");
    const ruleset = createFormatRuleset({ banned: [card.id] });
    const formatDeck = createValidDeck({ formatId: ruleset.defaultFormatId, rulesetVersion: ruleset.version });
    const result = evaluateMainDeckAddition(formatDeck, card.id, cyberpunkCardDb, ruleset);

    expect(result.allowed).toBe(false);
    expect(result.blockers.map((blocker) => blocker.code)).toContain("banned-card");
  });

  it("batch-evaluates cards with the same results as the single-card API", () => {
    const deck = createValidDeck();
    const evaluations = evaluateMainDeckAdditions(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable);

    for (const card of cyberpunkCardDb.cards) {
      expect(evaluations.get(card.id)).toEqual(
        evaluateMainDeckAddition(deck, card.id, cyberpunkCardDb, cyberpunkRulesetV1Printable)
      );
    }
  });
});

describe("evaluateCardRamCompatibility", () => {
  it("distinguishes compatible, incompatible, unknown, and Legend cards", () => {
    const limits = calculateRamLimits(createValidDeck().legends, cyberpunkCardDb, cyberpunkRulesetV1Printable);
    const compatible = cardBySlug("swordwise-huscle");
    const incompatible = cardBySlug("adam-smasher-metal-over-meat");
    const unknown = { ...compatible, ram: null };
    const legend = cardBySlug("v-streetkid");

    expect(evaluateCardRamCompatibility(compatible, limits).status).toBe("compatible");
    expect(evaluateCardRamCompatibility(incompatible, limits).status).toBe("incompatible");
    expect(evaluateCardRamCompatibility(unknown, limits).status).toBe("unknown");
    expect(evaluateCardRamCompatibility(legend, limits).status).toBe("not-applicable");
  });
});

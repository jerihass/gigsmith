import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { exportDecklist, importDecklist } from "./index";
import { deckInputLimits } from "./limits";

describe("deck import/export", () => {
  it("round-trips a text decklist", () => {
    const deck = createValidDeck();
    const text = exportDecklist(deck, cyberpunkCardDb);
    const imported = importDecklist(text, cyberpunkCardDb, {
      deckName: deck.name,
      formatId: deck.formatId,
      rulesetVersion: deck.rulesetVersion
    });

    expect(imported.errors).toEqual([]);
    expect(imported.deck?.legends).toEqual(deck.legends);
    expect(imported.deck?.main).toEqual(deck.main);
  });

  it("returns useful import errors for unknown cards", () => {
    const imported = importDecklist("Main:\n3 Not A Real Card", cyberpunkCardDb, {
      formatId: cyberpunkRulesetV1Printable.defaultFormatId,
      rulesetVersion: cyberpunkRulesetV1Printable.version
    });
    expect(imported.deck).toBeUndefined();
    expect(imported.errors[0]).toEqual({
      line: 2,
      message: "Unknown card \"Not A Real Card\"."
    });
  });

  it("rejects oversized decklists and excessive counts", () => {
    const options = {
      formatId: cyberpunkRulesetV1Printable.defaultFormatId,
      rulesetVersion: cyberpunkRulesetV1Printable.version
    };
    expect(importDecklist("x".repeat(deckInputLimits.textCharacters + 1), cyberpunkCardDb, options).errors[0]?.line)
      .toBe(0);
    expect(importDecklist(
      `Main:\n${deckInputLimits.cardCount + 1} Swordwise Huscle`,
      cyberpunkCardDb,
      options
    ).errors[0]?.message).toContain("Card counts");
  });
});

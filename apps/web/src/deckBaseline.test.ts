import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { previewDeckBaselineUpgrade } from "./deckBaseline";

describe("previewDeckBaselineUpgrade", () => {
  it("returns the same deck when its baseline is current", () => {
    const deck = createValidDeck();
    const preview = previewDeckBaselineUpgrade(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable);

    expect(preview).toEqual({ needed: false, changes: [], deck });
    expect(preview.deck).toBe(deck);
  });

  it("updates stale versions without changing deck contents", () => {
    const deck = {
      ...createValidDeck(),
      rulesetVersion: "ruleset.v0-guide",
      cardDataVersion: "cards.old"
    };
    const preview = previewDeckBaselineUpgrade(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable);

    expect(preview.needed).toBe(true);
    expect(preview.changes.map((change) => change.field)).toEqual(["rulesetVersion", "cardDataVersion"]);
    expect(preview.deck.legends).toBe(deck.legends);
    expect(preview.deck.main).toBe(deck.main);
    expect(preview.deck.rulesetVersion).toBe(cyberpunkRulesetV1Printable.version);
    expect(preview.deck.cardDataVersion).toBe(cyberpunkCardDb.metadata.cardDataVersion);
  });

  it("moves an unknown format to the current default format", () => {
    const deck = { ...createValidDeck(), formatId: "retired-format" };
    const preview = previewDeckBaselineUpgrade(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable);

    expect(preview.changes).toContainEqual({
      field: "formatId",
      from: "retired-format",
      to: cyberpunkRulesetV1Printable.defaultFormatId
    });
    expect(preview.deck.formatId).toBe(cyberpunkRulesetV1Printable.defaultFormatId);
  });
});

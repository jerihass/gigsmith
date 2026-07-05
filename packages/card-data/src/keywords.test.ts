import { describe, expect, it } from "vitest";
import { cyberpunkCardSnapshot, cyberpunkRulesetV1Printable } from "./index";
import { deriveKeywordsFromRulesText, enrichCardKeywords } from "./keywords";

const knownKeywords = cyberpunkRulesetV1Printable.keywords.map((keyword) => keyword.name);

describe("card keyword derivation", () => {
  it("derives only ruleset keywords from rules text", () => {
    expect(deriveKeywordsFromRulesText("{Call} Trash 3.\n{Go Solo} reminder", knownKeywords)).toEqual(["Go Solo", "Trash"]);
    expect(deriveKeywordsFromRulesText("{Play} Do something.\n{Quick} React.", knownKeywords)).toEqual(["Quick"]);
    expect(deriveKeywordsFromRulesText("Add a card from your trash to your hand.", knownKeywords)).toEqual([]);
  });

  it("preserves existing unknown keywords after known keyword order", () => {
    const card = {
      ...cyberpunkCardSnapshot.cards[0],
      keywords: ["Custom"],
      rules_text: "{Quick} Bottom-deck the rest."
    };

    expect(enrichCardKeywords(card, knownKeywords).keywords).toEqual(["Quick", "Bottom-deck", "Custom"]);
  });

  it("enriches bundled Cyberpunk cards that have printed keyword text", () => {
    const streetKid = cyberpunkCardSnapshot.cards.find((card) => card.external_id === "cb-v-streetkid");
    const stout = cyberpunkCardSnapshot.cards.find((card) => card.external_id === "cb-meredith-stout-stone-cold-corpo");

    expect(streetKid?.keywords).toEqual(expect.arrayContaining(["Go Solo", "Trash"]));
    expect(stout?.keywords).toContain("Blocker");
  });
});

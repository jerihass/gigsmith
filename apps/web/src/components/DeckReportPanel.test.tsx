import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { analyzeDeckComposition, analyzeEddyCurve, analyzeGigOdds, calculateRamLimits, validateDeck } from "@gigsmith/rules-core";
import { DeckReportPanel } from "./DeckReportPanel";

describe("DeckReportPanel", () => {
  it("renders a read-only printable report with key deck fields", () => {
    const deck = createValidDeck();
    const markup = renderToStaticMarkup(
      <DeckReportPanel
        deck={deck}
        cardDb={cyberpunkCardDb}
        validation={validateDeck(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable)}
        ram={calculateRamLimits(deck.legends, cyberpunkCardDb, cyberpunkRulesetV1Printable)}
        eddyCurve={analyzeEddyCurve(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable)}
        composition={analyzeDeckComposition(deck, cyberpunkCardDb)}
        gigOdds={analyzeGigOdds(deck, cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable)}
      />
    );

    expect(markup).toContain("Deck Report");
    expect(markup).toContain("Natural order:");
    expect(markup).toContain("Main Deck");
    expect(markup).toContain("RAM");
    expect(markup).toContain("€$");
  });
});

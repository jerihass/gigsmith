import { describe, expect, it } from "vitest";
import { cyberpunkRulesetV1Printable } from "./ruleset";

describe("cyberpunkRulesetV1Printable", () => {
  it("records the current printable guide source", () => {
    expect(cyberpunkRulesetV1Printable).toMatchObject({
      version: "ruleset.v1-printable-2026-06-19",
      sourceUrl: "https://cyberpunktcg.com/docs/printable-gameplay-guide.pdf",
      sourceRetrievedAt: "2026-06-19"
    });
  });

  it("encodes the guide Eddy economy", () => {
    expect(cyberpunkRulesetV1Printable.eddyRules).toEqual({
      startingEddies: 0,
      openingHandSize: 6,
      cardsDrawnPerTurn: 1,
      maxSellsPerTurn: 1,
      eddiesPerSoldCard: 1,
      soldCardDestination: "eddies-area",
      eddiesReadyAtStartOfTurn: true,
      legendPaymentValue: 1,
      firstPlayerSpentLegendsAtSetup: 2,
      firstPlayerLegendsReadyOnFirstTurn: false,
      callLegendCost: 1
    });
  });
});

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

  it("encodes the guide full-hand mulligan", () => {
    expect(cyberpunkRulesetV1Printable.mulliganRules).toEqual({
      maxMulligans: 1,
      returnScope: "full-hand",
      shuffleReturnedCards: true,
      drawCount: 6
    });
  });

  it("encodes the fixed Gig pool and overtime threshold", () => {
    expect(cyberpunkRulesetV1Printable.gigRules).toEqual({
      playerDieTypes: ["d4", "d6", "d8", "d10", "d12", "d20"],
      gigsToWin: 7,
      d20MustBeGainedLast: true,
      overtimeAfterCompletedTurnsPerPlayer: 7
    });
  });
});

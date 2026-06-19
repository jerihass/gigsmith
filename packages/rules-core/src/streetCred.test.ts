import { describe, expect, it } from "vitest";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { BoardState, Deck, Gig, PlayerState } from "@gigsmith/data-contracts";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { calculateStreetCred } from "./streetCred";

function player(id: string, deck: Deck = createValidDeck()): PlayerState {
  return { id, deck, eddies: 0 };
}

function board(gigs: Gig[] = []): BoardState {
  return {
    players: [player("player"), player("rival")],
    gigs,
    activePlayerId: "player",
    turn: 1
  };
}

describe("calculateStreetCred", () => {
  it("returns zero when the player controls no Gigs", () => {
    expect(calculateStreetCred(board(), "player", cyberpunkRulesetV1Printable)).toEqual({
      playerId: "player",
      total: 0,
      contributions: [],
      issues: [],
      rulesetVersion: cyberpunkRulesetV1Printable.version
    });
  });

  it("sums the values of multiple controlled Gigs", () => {
    const report = calculateStreetCred(board([
      { id: "gig-d4", dieType: "d4", value: 3, controllerId: "player" },
      { id: "gig-d10", dieType: "d10", value: 8, controllerId: "player" }
    ]), "player", cyberpunkRulesetV1Printable);

    expect(report.total).toBe(11);
    expect(report.contributions).toEqual([
      { gigId: "gig-d4", dieType: "d4", value: 3 },
      { gigId: "gig-d10", dieType: "d10", value: 8 }
    ]);
  });

  it("ignores rival-controlled and uncontrolled Gigs", () => {
    const report = calculateStreetCred(board([
      { id: "friendly", dieType: "d6", value: 4, controllerId: "player" },
      { id: "rival", dieType: "d20", value: 20, controllerId: "rival" },
      { id: "fixer", dieType: "d8", value: 8 }
    ]), "player", cyberpunkRulesetV1Printable);

    expect(report.total).toBe(4);
    expect(report.contributions.map((contribution) => contribution.gigId)).toEqual(["friendly"]);
  });

  it("reports and excludes invalid die values", () => {
    const report = calculateStreetCred(board([
      { id: "invalid", dieType: "d4", value: 5, controllerId: "player" },
      { id: "valid", dieType: "d6", value: 6, controllerId: "player" }
    ]), "player", cyberpunkRulesetV1Printable);

    expect(report.total).toBe(6);
    expect(report.issues).toEqual([{
      code: "invalid-gig-value",
      message: "Gig \"invalid\" must have an integer value from 1 to 4 for a d4.",
      affectedGigIds: ["invalid"]
    }]);
  });

  it("counts duplicate Gig IDs only once", () => {
    const report = calculateStreetCred(board([
      { id: "duplicate", dieType: "d8", value: 4, controllerId: "player" },
      { id: "duplicate", dieType: "d8", value: 7, controllerId: "player" }
    ]), "player", cyberpunkRulesetV1Printable);

    expect(report.total).toBe(4);
    expect(report.issues).toEqual([{
      code: "duplicate-gig-id",
      message: "Gig \"duplicate\" appears more than once and was counted only once.",
      affectedGigIds: ["duplicate"]
    }]);
  });

  it("reports an unknown player", () => {
    const report = calculateStreetCred(board(), "missing", cyberpunkRulesetV1Printable);

    expect(report.total).toBe(0);
    expect(report.issues[0]?.code).toBe("unknown-player");
  });
});

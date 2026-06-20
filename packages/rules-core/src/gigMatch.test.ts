import { describe, expect, it } from "vitest";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import {
  advanceGigMatchTurn,
  availableFixerGigs,
  createGigMatch,
  gainGig,
  reportGigMatch,
  setMatchGigValue,
  stealGig
} from "./gigMatch";

const ruleset = cyberpunkRulesetV1Printable;

describe("Gig match tracker", () => {
  it("creates the official 12-die pool in the two Fixer areas", () => {
    const state = createGigMatch(["player", "rival"], "player", ruleset);

    expect(state.gigs).toHaveLength(12);
    expect(state.gigs.filter((gig) => gig.ownerId === "player").map((gig) => gig.dieType)).toEqual(
      ruleset.gigRules.playerDieTypes
    );
    expect(state.gigs.every((gig) => gig.controllerId === undefined)).toBe(true);
    expect(reportGigMatch(state, ruleset).players).toEqual([
      { playerId: "player", controlledGigCount: 0, streetCred: 0, fixerGigCount: 6 },
      { playerId: "rival", controlledGigCount: 0, streetCred: 0, fixerGigCount: 6 }
    ]);
  });

  it("keeps the d20 locked until the active player's other dice are gained", () => {
    let state = createGigMatch(["player", "rival"], "player", ruleset);
    expect(availableFixerGigs(state, ruleset).map((gig) => gig.dieType)).not.toContain("d20");
    expect(gainGig(state, "player:d20", 20, ruleset).issues[0]?.code).toBe("d20-must-be-last");

    for (const dieType of ["d4", "d6", "d8", "d10", "d12"] as const) {
      state = { ...gainGig(state, `player:${dieType}`, 1, ruleset).state, gainedGigThisTurn: false };
    }
    expect(availableFixerGigs(state, ruleset).map((gig) => gig.dieType)).toEqual(["d20"]);
  });

  it("allows only one Fixer Gig to be gained each turn", () => {
    const state = createGigMatch(["player", "rival"], "player", ruleset);
    const gained = gainGig(state, "player:d4", 3, ruleset).state;

    expect(gained.gainedGigThisTurn).toBe(true);
    expect(gainGig(gained, "player:d6", 4, ruleset).issues[0]?.code).toBe("gig-already-gained");
    expect(advanceGigMatchTurn(gained, ruleset).state.gainedGigThisTurn).toBe(false);
  });

  it("requires the start-phase Gig before ending a turn while Fixer dice remain", () => {
    const state = createGigMatch(["player", "rival"], "player", ruleset);
    expect(advanceGigMatchTurn(state, ruleset).issues[0]?.code).toBe("start-phase-gig-required");
  });

  it("gains, adjusts, and steals dice while preserving original ownership", () => {
    let state = createGigMatch(["player", "rival"], "player", ruleset);
    state = gainGig(state, "player:d6", 4, ruleset).state;
    state = advanceGigMatchTurn(state, ruleset).state;
    state = stealGig(state, "player:d6", ruleset).state;
    state = setMatchGigValue(state, "player:d6", 6).state;

    const gig = state.gigs.find((candidate) => candidate.id === "player:d6");
    expect(gig).toMatchObject({ ownerId: "player", controllerId: "rival", value: 6 });
    expect(reportGigMatch(state, ruleset).players[1]).toMatchObject({ controlledGigCount: 1, streetCred: 6 });
  });

  it("rejects invalid gains, steals, and values with structured issues", () => {
    const state = createGigMatch(["player", "rival"], "player", ruleset);
    expect(gainGig(state, "rival:d4", 1, ruleset).issues[0]?.code).toBe("gig-not-in-active-fixer");
    expect(stealGig(state, "player:d4", ruleset).issues[0]?.code).toBe("gig-not-rival-controlled");
    expect(setMatchGigValue(state, "player:d4", 3).issues[0]?.code).toBe("gig-not-in-play");
    expect(gainGig(state, "player:d4", 5, ruleset).issues[0]?.code).toBe("invalid-gig-value");
  });

  it("awards a normal win when a player starts their turn controlling seven Gigs", () => {
    const initial = createGigMatch(["player", "rival"], "player", ruleset);
    const state = {
      ...initial,
      activePlayerId: "rival",
      gainedGigThisTurn: true,
      gigs: initial.gigs.map((gig, index) => index < 7 ? { ...gig, controllerId: "player" } : gig)
    };

    const next = advanceGigMatchTurn(state, ruleset).state;
    expect(next.winnerId).toBe("player");
    expect(next.winReason).toBe("start-turn-majority");
  });

  it("enters overtime after both seventh turns and awards seven Gigs immediately", () => {
    const initial = createGigMatch(["player", "rival"], "player", ruleset);
    const beforeLastTurn = {
      ...initial,
      activePlayerId: "rival",
      completedTurns: { player: 7, rival: 6 },
      gainedGigThisTurn: true,
      gigs: initial.gigs.map((gig, index) => index < 7 ? { ...gig, controllerId: "player" } : gig)
    };

    const overtime = advanceGigMatchTurn(beforeLastTurn, ruleset).state;
    expect(overtime.overtime).toBe(true);
    expect(overtime.winnerId).toBe("player");
    expect(overtime.winReason).toBe("overtime-majority");
  });
});

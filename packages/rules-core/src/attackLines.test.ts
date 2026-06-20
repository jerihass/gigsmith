import { describe, expect, it } from "vitest";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { BoardState, Deck, Gig, PlayerState, TacticalUnit } from "@gigsmith/data-contracts";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { evaluateAttackLines } from "./attackLines";

function player(id: string, deck: Deck = createValidDeck()): PlayerState {
  return { id, deck, eddies: 0 };
}

function unit(overrides: Partial<TacticalUnit> = {}): TacticalUnit {
  return {
    id: "attacker",
    controllerId: "player",
    name: "Attacker",
    power: 5,
    ready: true,
    hasLag: false,
    hasBlocker: false,
    ...overrides
  };
}

function board(units: TacticalUnit[], gigs: Gig[] = []): BoardState {
  return {
    players: [player("player"), player("rival")],
    units,
    gigs,
    activePlayerId: "player",
    turn: 1
  };
}

function rivalGigs(count: number): Gig[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `gig-${index + 1}`,
    dieType: "d6",
    value: 3,
    controllerId: "rival"
  }));
}

describe("evaluateAttackLines", () => {
  it("returns an unblocked Gig steal with power-scaled quantity", () => {
    const report = evaluateAttackLines(
      board([unit({ power: 20 })], rivalGigs(4)),
      cyberpunkRulesetV1Printable
    );
    const steal = report.lines.find((line) => line.outcome === "steal");

    expect(steal).toMatchObject({ legal: true, gigsStolen: 3, reasons: [] });
    expect(report.rulesetVersion).toBe(cyberpunkRulesetV1Printable.version);
  });

  it("caps the stolen quantity at the number of rival Gigs", () => {
    const report = evaluateAttackLines(
      board([unit({ power: 30 })], rivalGigs(2)),
      cyberpunkRulesetV1Printable
    );

    expect(report.lines.find((line) => line.outcome === "steal")?.gigsStolen).toBe(2);
  });

  it("reports an active Blocker and exposes the redirected fight", () => {
    const blocker = unit({
      id: "blocker",
      controllerId: "rival",
      name: "Blocker",
      power: 3,
      hasBlocker: true
    });
    const report = evaluateAttackLines(
      board([unit(), blocker], rivalGigs(1)),
      cyberpunkRulesetV1Printable
    );
    const steal = report.lines.find((line) => line.outcome === "steal");
    const redirect = report.lines.find((line) => line.blockerUnitId === blocker.id);

    expect(steal).toMatchObject({ legal: false, gigsStolen: 1 });
    expect(steal?.reasons[0]?.code).toBe("blocker-window-open");
    expect(redirect).toMatchObject({
      legal: true,
      outcome: "fight",
      gigsStolen: 0,
      fightResult: "defender-defeated"
    });
  });

  it("allows the Gig line when the Blocker is spent, absent, or unable to react", () => {
    const blockerStates = [
      unit({ id: "spent", controllerId: "rival", ready: false, hasBlocker: true }),
      unit({ id: "ordinary", controllerId: "rival", hasBlocker: false }),
      unit({ id: "locked", controllerId: "rival", hasBlocker: true, cannotReactReason: "Card effect" })
    ];

    for (const blocker of blockerStates) {
      const report = evaluateAttackLines(
        board([unit(), blocker], rivalGigs(1)),
        cyberpunkRulesetV1Printable
      );
      expect(report.lines.find((line) => line.outcome === "steal")?.legal).toBe(true);
    }
  });

  it("rejects spent and Lagged attackers", () => {
    for (const attacker of [unit({ ready: false }), unit({ hasLag: true })]) {
      const report = evaluateAttackLines(
        board([attacker], rivalGigs(1)),
        cyberpunkRulesetV1Printable
      );
      const steal = report.lines.find((line) => line.outcome === "steal");
      expect(steal?.legal).toBe(false);
      expect(steal?.reasons[0]?.code).toMatch(/attacker-(spent|has-lag)/);
    }
  });

  it("allows fights only against spent rival Units and resolves ties", () => {
    const readyTarget = unit({ id: "ready", controllerId: "rival", name: "Ready", power: 5 });
    const spentTarget = unit({ id: "spent", controllerId: "rival", name: "Spent", power: 5, ready: false });
    const report = evaluateAttackLines(
      board([unit(), readyTarget, spentTarget]),
      cyberpunkRulesetV1Printable
    );

    expect(report.lines.find((line) => line.finalTarget.type === "unit" && line.finalTarget.unitId === "ready"))
      .toMatchObject({ legal: false });
    expect(report.lines.find((line) => line.finalTarget.type === "unit" && line.finalTarget.unitId === "spent"))
      .toMatchObject({ legal: true, fightResult: "both-defeated" });
  });

  it("flags multiple Blockers as an unresolved redirect-order interaction", () => {
    const report = evaluateAttackLines(board([
      unit(),
      unit({ id: "blocker-1", controllerId: "rival", hasBlocker: true }),
      unit({ id: "blocker-2", controllerId: "rival", hasBlocker: true })
    ], rivalGigs(1)), cyberpunkRulesetV1Printable);

    expect(report.warnings).toContainEqual(expect.objectContaining({
      code: "multiple-redirects-unsupported",
      relatedRuleUncertainty: "RU-002"
    }));
  });
});

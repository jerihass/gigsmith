import type {
  AttackLine,
  AttackLineReason,
  AttackLineReport,
  AttackTarget,
  BoardState,
  FightResult,
  Ruleset,
  TacticalUnit
} from "@gigsmith/data-contracts";

function reason(
  code: string,
  message: string,
  affectedUnitIds: string[] = []
): AttackLineReason {
  return { code, message, affectedUnitIds };
}

function attackerReasons(unit: TacticalUnit): AttackLineReason[] {
  const reasons: AttackLineReason[] = [];
  if (!unit.ready) {
    reasons.push(reason("attacker-spent", `${unit.name} is spent and cannot attack.`, [unit.id]));
  }
  if (unit.hasLag) {
    reasons.push(reason("attacker-has-lag", `${unit.name} has Lag and cannot attack.`, [unit.id]));
  }
  return reasons;
}

function fightResult(attackerPower: number, defenderPower: number): FightResult {
  if (attackerPower > defenderPower) return "defender-defeated";
  if (attackerPower < defenderPower) return "attacker-defeated";
  return "both-defeated";
}

function unitTarget(unitId: string): AttackTarget {
  return { type: "unit", unitId };
}

function gigTarget(playerId: string): AttackTarget {
  return { type: "gig-area", playerId };
}

function directFightLine(attacker: TacticalUnit, defender: TacticalUnit): AttackLine {
  const reasons = attackerReasons(attacker);
  if (defender.ready) {
    reasons.push(reason(
      "target-unit-ready",
      `${defender.name} is ready. Only spent rival Units can be attacked.`,
      [defender.id]
    ));
  }
  const target = unitTarget(defender.id);
  return {
    id: `${attacker.id}:fight:${defender.id}`,
    attackerUnitId: attacker.id,
    declaredTarget: target,
    finalTarget: target,
    legal: reasons.length === 0,
    outcome: "fight",
    fightResult: fightResult(attacker.power, defender.power),
    reasons
  };
}

function directGigLine(
  attacker: TacticalUnit,
  rivalPlayerId: string,
  rivalGigCount: number,
  blockers: TacticalUnit[]
): AttackLine {
  const reasons = attackerReasons(attacker);
  if (rivalGigCount === 0) {
    reasons.push(reason("no-rival-gigs", "The rival Gig area has no Gigs to steal."));
  }
  if (blockers.length > 0) {
    reasons.push(reason(
      "blocker-window-open",
      `${blockers.length} ready Blocker${blockers.length === 1 ? " can" : "s can"} redirect this attack, so an unqualified steal is not guaranteed.`,
      blockers.map((blocker) => blocker.id)
    ));
  }

  const target = gigTarget(rivalPlayerId);
  const powerStealCount = attacker.power <= 0 ? 0 : Math.floor(attacker.power / 10) + 1;
  return {
    id: `${attacker.id}:steal:${rivalPlayerId}`,
    attackerUnitId: attacker.id,
    declaredTarget: target,
    finalTarget: target,
    legal: reasons.length === 0,
    outcome: "steal",
    gigsStolen: Math.min(powerStealCount, rivalGigCount),
    reasons
  };
}

function blockerFightLine(
  attacker: TacticalUnit,
  rivalPlayerId: string,
  blocker: TacticalUnit
): AttackLine {
  const reasons = attackerReasons(attacker);
  const declaredTarget = gigTarget(rivalPlayerId);
  return {
    id: `${attacker.id}:steal:${rivalPlayerId}:blocked-by:${blocker.id}`,
    attackerUnitId: attacker.id,
    declaredTarget,
    finalTarget: unitTarget(blocker.id),
    legal: reasons.length === 0,
    outcome: "fight",
    blockerUnitId: blocker.id,
    fightResult: fightResult(attacker.power, blocker.power),
    gigsStolen: 0,
    reasons
  };
}

export function evaluateAttackLines(boardState: BoardState, ruleset: Ruleset): AttackLineReport {
  const units = boardState.units ?? [];
  const attackers = units.filter((unit) => unit.controllerId === boardState.activePlayerId);
  const rivalPlayers = boardState.players.filter((player) => player.id !== boardState.activePlayerId);
  const rivalPlayer = rivalPlayers.length === 1 ? rivalPlayers[0] : undefined;
  const warnings: AttackLineReport["warnings"] = [];
  const lines: AttackLine[] = [];

  if (!boardState.players.some((player) => player.id === boardState.activePlayerId)) {
    warnings.push({
      code: "unknown-active-player",
      message: `Active player "${boardState.activePlayerId}" is not present in the board state.`,
      affectedUnitIds: attackers.map((unit) => unit.id)
    });
  }

  if (!rivalPlayer) {
    warnings.push({
      code: "unsupported-player-count",
      message: "Attack evaluation currently requires exactly two players.",
      affectedUnitIds: []
    });
  } else {
    const defenders = units.filter((unit) => unit.controllerId === rivalPlayer.id);
    const blockers = defenders.filter((unit) =>
      unit.ready && unit.hasBlocker && !unit.cannotReactReason
    );
    const rivalGigCount = boardState.gigs.filter((gig) => gig.controllerId === rivalPlayer.id).length;

    for (const attacker of attackers) {
      lines.push(...defenders.map((defender) => directFightLine(attacker, defender)));
      lines.push(directGigLine(attacker, rivalPlayer.id, rivalGigCount, blockers));
      lines.push(...blockers.map((blocker) => blockerFightLine(attacker, rivalPlayer.id, blocker)));
    }

    if (blockers.length > 1) {
      warnings.push({
        code: "multiple-redirects-unsupported",
        message: "Multiple Blockers can react, but the official guide does not define competing redirect order.",
        relatedRuleUncertainty: "RU-002",
        affectedUnitIds: blockers.map((blocker) => blocker.id)
      });
    }
  }

  warnings.push({
    code: "reaction-effects-not-modeled",
    message: "Quick effects and Call-a-Legend reactions are not simulated; supply the final post-reaction power and board state.",
    relatedRuleUncertainty: "RU-001",
    affectedUnitIds: []
  });

  return {
    activePlayerId: boardState.activePlayerId,
    rivalPlayerId: rivalPlayer?.id,
    lines,
    warnings,
    assumptions: [
      "Attack triggers have already resolved before the declared target is evaluated.",
      "Unit power is the final value used for the fight or steal step.",
      "Card-specific reaction prevention, spending prevention, and redirect bypass are not inferred."
    ],
    rulesetVersion: ruleset.version
  };
}

import type {
  DieType,
  Gig,
  GigMatchIssue,
  GigMatchReport,
  GigMatchState,
  GigMatchTransition,
  Ruleset
} from "@gigsmith/data-contracts";

const dieMaximums: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20
};

function issue(code: string, message: string, affectedGigIds: string[] = []): GigMatchIssue {
  return { code, message, affectedGigIds };
}

function controlledCount(state: GigMatchState, playerId: string): number {
  return state.gigs.filter((gig) => gig.controllerId === playerId).length;
}

function withOvertimeWinner(state: GigMatchState, ruleset: Ruleset): GigMatchState {
  if (!state.overtime || state.winnerId) return state;
  const winnerId = state.playerIds.find((playerId) => controlledCount(state, playerId) >= ruleset.gigRules.gigsToWin);
  return winnerId ? { ...state, winnerId, winReason: "overtime-majority" } : state;
}

function replaceGig(state: GigMatchState, replacement: Gig): GigMatchState {
  return { ...state, gigs: state.gigs.map((gig) => gig.id === replacement.id ? replacement : gig) };
}

export function createGigMatch(
  playerIds: [string, string],
  firstPlayerId: string,
  ruleset: Ruleset
): GigMatchState {
  if (!playerIds.includes(firstPlayerId)) throw new Error("First player must be present in the match.");
  const gigs = playerIds.flatMap((ownerId) => ruleset.gigRules.playerDieTypes.map((dieType) => ({
    id: `${ownerId}:${dieType}`,
    ownerId,
    dieType,
    value: 1
  })));
  return {
    playerIds,
    firstPlayerId,
    activePlayerId: firstPlayerId,
    completedTurns: Object.fromEntries(playerIds.map((playerId) => [playerId, 0])),
    gigs,
    gainedGigThisTurn: false,
    overtime: false
  };
}

export function availableFixerGigs(state: GigMatchState, ruleset: Ruleset): Gig[] {
  const available = state.gigs.filter((gig) => gig.ownerId === state.activePlayerId && !gig.controllerId);
  if (!ruleset.gigRules.d20MustBeGainedLast || available.every((gig) => gig.dieType === "d20")) return available;
  return available.filter((gig) => gig.dieType !== "d20");
}

export function gainGig(
  state: GigMatchState,
  gigId: string,
  value: number,
  ruleset: Ruleset
): GigMatchTransition {
  if (state.winnerId) return { state, issues: [issue("match-complete", "The match already has a winner.")] };
  if (state.gainedGigThisTurn) {
    return { state, issues: [issue("gig-already-gained", "The active player has already gained a Gig this turn.", [gigId])] };
  }
  const gig = state.gigs.find((candidate) => candidate.id === gigId);
  if (!gig) return { state, issues: [issue("unknown-gig", `Gig "${gigId}" is not in this match.`, [gigId])] };
  if (gig.ownerId !== state.activePlayerId || gig.controllerId) {
    return { state, issues: [issue("gig-not-in-active-fixer", "Only a die in the active player's Fixer area can be gained.", [gigId])] };
  }
  if (!availableFixerGigs(state, ruleset).some((candidate) => candidate.id === gigId)) {
    return { state, issues: [issue("d20-must-be-last", "The d20 must remain in the Fixer area until that player's other dice are gone.", [gigId])] };
  }
  const maximum = dieMaximums[gig.dieType];
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    return { state, issues: [issue("invalid-gig-value", `${gig.dieType} must roll a whole number from 1 to ${maximum}.`, [gigId])] };
  }
  const next = {
    ...replaceGig(state, { ...gig, value, controllerId: state.activePlayerId }),
    gainedGigThisTurn: true
  };
  return { state: withOvertimeWinner(next, ruleset), issues: [] };
}

export function stealGig(state: GigMatchState, gigId: string, ruleset: Ruleset): GigMatchTransition {
  if (state.winnerId) return { state, issues: [issue("match-complete", "The match already has a winner.")] };
  const gig = state.gigs.find((candidate) => candidate.id === gigId);
  if (!gig) return { state, issues: [issue("unknown-gig", `Gig "${gigId}" is not in this match.`, [gigId])] };
  if (!gig.controllerId || gig.controllerId === state.activePlayerId) {
    return { state, issues: [issue("gig-not-rival-controlled", "The active player can only steal a rival-controlled Gig.", [gigId])] };
  }
  const next = replaceGig(state, { ...gig, controllerId: state.activePlayerId });
  return { state: withOvertimeWinner(next, ruleset), issues: [] };
}

export function setMatchGigValue(state: GigMatchState, gigId: string, value: number): GigMatchTransition {
  if (state.winnerId) return { state, issues: [issue("match-complete", "The match already has a winner.")] };
  const gig = state.gigs.find((candidate) => candidate.id === gigId);
  if (!gig) return { state, issues: [issue("unknown-gig", `Gig "${gigId}" is not in this match.`, [gigId])] };
  if (!gig.controllerId) return { state, issues: [issue("gig-not-in-play", "A Gig must leave the Fixer area before its value can change.", [gigId])] };
  const maximum = dieMaximums[gig.dieType];
  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    return { state, issues: [issue("invalid-gig-value", `${gig.dieType} must have a whole value from 1 to ${maximum}.`, [gigId])] };
  }
  return { state: replaceGig(state, { ...gig, value }), issues: [] };
}

export function advanceGigMatchTurn(state: GigMatchState, ruleset: Ruleset): GigMatchTransition {
  if (state.winnerId) return { state, issues: [issue("match-complete", "The match already has a winner.")] };
  if (!state.gainedGigThisTurn && availableFixerGigs(state, ruleset).length > 0) {
    return { state, issues: [issue("start-phase-gig-required", "Gain one Gig from the active player's Fixer area before ending the turn.")] };
  }
  const completedTurns = {
    ...state.completedTurns,
    [state.activePlayerId]: (state.completedTurns[state.activePlayerId] ?? 0) + 1
  };
  const overtime = state.playerIds.every(
    (playerId) => (completedTurns[playerId] ?? 0) >= ruleset.gigRules.overtimeAfterCompletedTurnsPerPlayer
  );
  const activePlayerId = state.playerIds.find((playerId) => playerId !== state.activePlayerId) ?? state.activePlayerId;
  let next: GigMatchState = { ...state, activePlayerId, completedTurns, gainedGigThisTurn: false, overtime };
  if (overtime) return { state: withOvertimeWinner(next, ruleset), issues: [] };
  if (controlledCount(next, activePlayerId) >= ruleset.gigRules.gigsToWin) {
    next = { ...next, winnerId: activePlayerId, winReason: "start-turn-majority" };
  }
  return { state: next, issues: [] };
}

export function reportGigMatch(state: GigMatchState, ruleset: Ruleset): GigMatchReport {
  return {
    players: state.playerIds.map((playerId) => ({
      playerId,
      controlledGigCount: controlledCount(state, playerId),
      streetCred: state.gigs.reduce((sum, gig) => sum + (gig.controllerId === playerId ? gig.value : 0), 0),
      fixerGigCount: state.gigs.filter((gig) => gig.ownerId === playerId && !gig.controllerId).length
    })),
    activePlayerId: state.activePlayerId,
    activePlayerTurn: (state.completedTurns[state.activePlayerId] ?? 0) + 1,
    availableGigIds: state.gainedGigThisTurn ? [] : availableFixerGigs(state, ruleset).map((gig) => gig.id),
    overtime: state.overtime,
    winnerId: state.winnerId,
    winReason: state.winReason,
    rulesetVersion: ruleset.version
  };
}

export function gigDieMaximum(dieType: DieType): number {
  return dieMaximums[dieType];
}

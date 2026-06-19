import type {
  BoardState,
  DieType,
  Ruleset,
  StreetCredContribution,
  StreetCredIssue,
  StreetCredReport
} from "@gigsmith/data-contracts";

const dieMaximums: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20
};

export function calculateStreetCred(
  boardState: BoardState,
  playerId: string,
  ruleset: Ruleset
): StreetCredReport {
  const contributions: StreetCredContribution[] = [];
  const issues: StreetCredIssue[] = [];
  const seenGigIds = new Set<string>();

  if (!boardState.players.some((player) => player.id === playerId)) {
    return {
      playerId,
      total: 0,
      contributions,
      issues: [{
        code: "unknown-player",
        message: `Player "${playerId}" is not present in the board state.`,
        affectedGigIds: []
      }],
      rulesetVersion: ruleset.version
    };
  }

  for (const gig of boardState.gigs) {
    if (gig.controllerId !== playerId) continue;

    if (seenGigIds.has(gig.id)) {
      issues.push({
        code: "duplicate-gig-id",
        message: `Gig "${gig.id}" appears more than once and was counted only once.`,
        affectedGigIds: [gig.id]
      });
      continue;
    }
    seenGigIds.add(gig.id);

    const maximum = dieMaximums[gig.dieType];
    if (!Number.isInteger(gig.value) || gig.value < 1 || gig.value > maximum) {
      issues.push({
        code: "invalid-gig-value",
        message: `Gig "${gig.id}" must have an integer value from 1 to ${maximum} for a ${gig.dieType}.`,
        affectedGigIds: [gig.id]
      });
      continue;
    }

    contributions.push({
      gigId: gig.id,
      dieType: gig.dieType,
      value: gig.value
    });
  }

  return {
    playerId,
    total: contributions.reduce((sum, contribution) => sum + contribution.value, 0),
    contributions,
    issues,
    rulesetVersion: ruleset.version
  };
}

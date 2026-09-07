import { cyberpunkRulesetV1Printable as rules } from '@gigsmith/card-data';
import { advanceGigMatchTurn, createGigMatch, gainGig, gigDieMaximum, reportGigMatch, setMatchGigValue, stealGig } from '@gigsmith/rules-core';
import type { GigMatchState, GigMatchTransition } from '@gigsmith/data-contracts';

function readState(input: string): GigMatchState {
  const value = JSON.parse(input);
  const players = ['player', 'rival'];
  const expected = createGigMatch(['player', 'rival'], 'player', rules);
  if (!value || JSON.stringify(value.playerIds) !== JSON.stringify(players) ||
      !players.includes(value.activePlayerId) || !players.includes(value.firstPlayerId) ||
      typeof value.gainedGigThisTurn !== 'boolean' || typeof value.overtime !== 'boolean' ||
      !players.every(p => Number.isSafeInteger(value.completedTurns?.[p]) && value.completedTurns[p] >= 0) ||
      (value.winnerId !== undefined && !players.includes(value.winnerId)) ||
      (value.winReason !== undefined && !['start-turn-majority', 'overtime-majority'].includes(value.winReason)) ||
      ((value.winnerId === undefined) !== (value.winReason === undefined)) ||
      !Array.isArray(value.gigs) || value.gigs.length !== expected.gigs.length ||
      !expected.gigs.every(g => value.gigs.filter((v: any) => v?.id === g.id && v.ownerId === g.ownerId && v.dieType === g.dieType).length === 1) ||
      !value.gigs.every((g: any) => Number.isInteger(g.value) && g.value >= 1 && g.value <= gigDieMaximum(g.dieType) &&
        (g.controllerId === undefined || players.includes(g.controllerId)))) {
    throw new Error('The saved match is invalid. Export the saved file before starting a new match.');
  }
  return value as GigMatchState;
}

export function matchOperation(operation: string, args: Record<string, string>) {
  let state: GigMatchState;
  if (operation === 'matchCreate') {
    state = createGigMatch(['player', 'rival'], args.firstPlayer ?? 'player', rules);
  } else {
    if (args.rulesetVersion !== rules.version) throw new Error('This match uses a different ruleset version. Its saved file has been preserved.');
    state = readState(args.state);
    let transition: GigMatchTransition | undefined;
    if (operation === 'matchChange') {
      switch (args.action) {
        case 'gain': transition = gainGig(state, args.gigID, Number(args.value), rules); break;
        case 'setValue': transition = setMatchGigValue(state, args.gigID, Number(args.value)); break;
        case 'steal': transition = stealGig(state, args.gigID, rules); break;
        case 'advance': transition = advanceGigMatchTurn(state, rules); break;
        default: throw new Error('Unknown match action.');
      }
      if (transition.issues.length) throw new Error(transition.issues.map(i => i.message).join('\n'));
      state = transition.state;
    }
  }
  return {
    state,
    report: reportGigMatch(state, rules),
    gigs: state.gigs.map(g => ({ ...g, maximum: gigDieMaximum(g.dieType) }))
  };
}

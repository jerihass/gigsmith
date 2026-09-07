import { cyberpunkCardDb as db, cyberpunkRulesetV1Printable as rules, cyberpunkGigRequirements } from '@gigsmith/card-data';
import * as core from '@gigsmith/rules-core';
import { exportDeckJson, importDeckJson, exportDecklist, importDecklist } from '@gigsmith/deck-io';
import type { Deck } from '@gigsmith/data-contracts';

// Only JSON crosses this boundary. No DOM, network, eval of user input, or remote code.
export function invoke(operation: string, input: string): string {
  const args = JSON.parse(input);
  const deck = args.deck as Deck;
  let result: unknown;
  switch (operation) {
    case 'catalog': result = db; break;
    case 'newDeck': result = { id: args.id, name: args.name, legends: [], main: [], formatId: rules.defaultFormatId, rulesetVersion: rules.version, cardDataVersion: db.metadata.cardDataVersion }; break;
    case 'validate': result = core.validateDeck(deck, db, rules); break;
    case 'ram': result = core.calculateRamLimits(deck.legends, db, rules); break;
    case 'hand': result = core.drawSampleHand(deck, db, rules, args.seed); break;
    case 'curve': result = core.analyzeEddyCurve(deck, db, rules); break;
    case 'composition': result = core.analyzeDeckComposition(deck, db); break;
    case 'mulligan': result = core.analyzeMulligan(deck, db, rules, { seed: args.seed, goal: args.goal ?? 'balanced', playerOrder: args.playerOrder ?? 'first' }); break;
    case 'odds': result = core.analyzeGigOdds(deck, db, cyberpunkGigRequirements, rules); break;
    case 'export': result = exportDeckJson(deck, { includeVersionHistory: true }); break;
    case 'text': result = exportDecklist(deck, db); break;
    case 'import': {
      const parsed = importDeckJson(args.text);
      if (!parsed.document) throw new Error(parsed.errors.map(e => `${e.path}: ${e.message}`).join('\n'));
      const { notes, ...portable } = parsed.document.deck;
      result = { ...portable, id: args.id, ...(notes === undefined ? {} : { metadata: { notes } }) };
      break;
    }
    case 'importText': {
      const parsed = importDecklist(args.text, db, { formatId: rules.defaultFormatId, rulesetVersion: rules.version });
      if (!parsed.deck) throw new Error(parsed.errors.map(e => `Line ${e.line}: ${e.message}`).join('\n'));
      result = { ...parsed.deck, id: args.id }; break;
    }
    default: throw new Error(`Unsupported operation: ${operation}`);
  }
  return JSON.stringify(result);
}

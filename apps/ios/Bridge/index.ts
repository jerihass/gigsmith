import { matchOperation } from './match';
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
    case 'matchCreate':
    case 'matchRestore':
    case 'matchChange': result = matchOperation(operation, args); break;
    case 'catalog': result = db; break;
    case 'newDeck': result = { id: args.id, name: args.name, legends: [], main: [], formatId: rules.defaultFormatId, rulesetVersion: rules.version, cardDataVersion: db.metadata.cardDataVersion }; break;
    case 'validate': result = core.validateDeck(deck, db, rules); break;
    case 'ram': result = core.calculateRamLimits(deck.legends, db, rules); break;
    case 'hand': result = core.drawSampleHand(deck, db, rules, args.seed); break;
    case 'curve': result = core.analyzeEddyCurve(deck, db, rules); break;
    case 'composition': result = core.analyzeDeckComposition(deck, db); break;
    case 'mulligan': result = core.analyzeMulligan(deck, db, rules, { seed: args.seed, goal: args.goal ?? 'balanced', playerOrder: args.playerOrder ?? 'first' }); break;
    case 'analysis': {
      const curve = core.analyzeEddyCurve(deck, db, rules);
      const composition = core.analyzeDeckComposition(deck, db);
      const mulligan = core.analyzeMulligan(deck, db, rules, { seed: args.seed, goal: 'balanced', playerOrder: 'first' });
      result = [
        { title: 'Eddy curve', rows: [
          `Sellable cards: ${curve.supply.sellableCardCount} (${(curve.supply.sellableDensity * 100).toFixed(1)}%)`,
          `Average printed cost: ${curve.mainDeckDemand.averagePrintedCost?.toFixed(2) ?? 'Unknown'}`,
          ...curve.mainDeckDemand.costBuckets.map(b => `Cost ${b.cost}: ${b.cardCount} cards`)
        ] },
        { title: 'Composition', rows: [...composition.main.colorBuckets, ...composition.main.typeBuckets].map(b => `${b.label}: ${b.copyCount} cards`) },
        { title: 'Mulligan · balanced · going first', rows: [
          `Guidance: ${mulligan.recommendation.replaceAll('-', ' ')}`,
          `Method: ${mulligan.method}; ${mulligan.sampleSize} hands`,
          `Confidence: ${(mulligan.confidenceLevel * 100).toFixed(0)}%; score margin ±${mulligan.scoreMarginOfError.toFixed(3)}`,
          ...mulligan.reasons
        ] },
        { title: 'Data limitations', rows: [...curve.warnings, ...composition.warnings, ...mulligan.issues].map(w => w.message) },
        { title: 'Assumptions', rows: [...new Set([...curve.assumptions, ...composition.assumptions, ...mulligan.assumptions])] }
      ];
      break;
    }
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

import snapshot from "./cyberpunk-snapshot.json";
import type { CardSnapshot } from "@gigsmith/data-contracts";
import { cyberpunkRulesetV1Printable } from "./ruleset";
import { enrichCardKeywords } from "./keywords";
import { assertValidCardSnapshot } from "./validateSnapshot";

export { cyberpunkRulesetV1Printable } from "./ruleset";
export { cyberpunkGigRequirements } from "./gigRequirements";
export { deriveKeywordsFromRulesText, enrichCardKeywords } from "./keywords";
export { assertValidCardSnapshot, sanitizeCardSnapshot, validateCardSnapshot } from "./validateSnapshot";

const knownCyberpunkKeywords = cyberpunkRulesetV1Printable.keywords.map((keyword) => keyword.name);
const enrichedSnapshot = {
  ...snapshot,
  cards: (snapshot.cards as CardSnapshot["cards"]).map((card) => enrichCardKeywords(card, knownCyberpunkKeywords))
};

assertValidCardSnapshot(enrichedSnapshot);
export const cyberpunkCardSnapshot = enrichedSnapshot as CardSnapshot;
export const cyberpunkCardDb = {
  metadata: cyberpunkCardSnapshot.metadata,
  cards: cyberpunkCardSnapshot.cards
};

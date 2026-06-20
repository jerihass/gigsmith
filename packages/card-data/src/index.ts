import snapshot from "./cyberpunk-snapshot.json";
import type { CardSnapshot } from "@gigsmith/data-contracts";
import { assertValidCardSnapshot } from "./validateSnapshot";

export { cyberpunkRulesetV1Printable } from "./ruleset";
export { assertValidCardSnapshot, sanitizeCardSnapshot, validateCardSnapshot } from "./validateSnapshot";

assertValidCardSnapshot(snapshot);
export const cyberpunkCardSnapshot = snapshot as CardSnapshot;
export const cyberpunkCardDb = {
  metadata: cyberpunkCardSnapshot.metadata,
  cards: cyberpunkCardSnapshot.cards
};

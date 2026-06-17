import snapshot from "./cyberpunk-snapshot.json";
import type { CardSnapshot } from "@gigsmith/data-contracts";
import { assertValidCardSnapshot } from "./validateSnapshot";

export { cyberpunkRulesetV0Guide } from "./ruleset";
export { assertValidCardSnapshot, validateCardSnapshot } from "./validateSnapshot";

assertValidCardSnapshot(snapshot);
export const cyberpunkCardSnapshot = snapshot as CardSnapshot;
export const cyberpunkCardDb = {
  metadata: cyberpunkCardSnapshot.metadata,
  cards: cyberpunkCardSnapshot.cards
};

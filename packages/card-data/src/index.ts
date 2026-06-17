import snapshot from "./cyberpunk-snapshot.json";
import type { CardSnapshot } from "@gigsmith/data-contracts";

export { cyberpunkRulesetV0Guide } from "./ruleset";

export const cyberpunkCardSnapshot = snapshot as CardSnapshot;
export const cyberpunkCardDb = {
  metadata: cyberpunkCardSnapshot.metadata,
  cards: cyberpunkCardSnapshot.cards
};

import type { CardDatabase, Deck, Ruleset } from "@gigsmith/data-contracts";

export interface DeckBaselineChange {
  field: "rulesetVersion" | "cardDataVersion" | "formatId";
  from: string;
  to: string;
}

export interface DeckBaselineUpgrade {
  needed: boolean;
  changes: DeckBaselineChange[];
  deck: Deck;
}

export function previewDeckBaselineUpgrade(
  deck: Deck,
  cardDb: CardDatabase,
  ruleset: Ruleset
): DeckBaselineUpgrade {
  const changes: DeckBaselineChange[] = [];
  let formatId = deck.formatId;

  if (deck.rulesetVersion !== ruleset.version) {
    changes.push({ field: "rulesetVersion", from: deck.rulesetVersion, to: ruleset.version });
  }
  if (deck.cardDataVersion !== cardDb.metadata.cardDataVersion) {
    changes.push({ field: "cardDataVersion", from: deck.cardDataVersion, to: cardDb.metadata.cardDataVersion });
  }
  if (!ruleset.formats.some((format) => format.id === deck.formatId)) {
    formatId = ruleset.defaultFormatId;
    changes.push({ field: "formatId", from: deck.formatId, to: formatId });
  }

  return {
    needed: changes.length > 0,
    changes,
    deck: changes.length === 0 ? deck : {
      ...deck,
      rulesetVersion: ruleset.version,
      cardDataVersion: cardDb.metadata.cardDataVersion,
      formatId
    }
  };
}

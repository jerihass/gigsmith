import type { Card, CardDatabase, Deck, DeckCardEntry } from "@gigsmith/data-contracts";
import { deckInputLimits } from "./limits";

export {
  exportDeckJson,
  importDeckJson,
  type DeckJsonIssue,
  type ExportDeckJsonOptions,
  type ImportDeckJsonResult
} from "./deckJson";
export { decodeDeckSharePayload, encodeDeckSharePayload } from "./sharePayload";
export { deckInputLimits } from "./limits";

export interface ImportIssue {
  line: number;
  message: string;
}

export interface ImportDecklistResult {
  deck?: Deck;
  errors: ImportIssue[];
  warnings: ImportIssue[];
}

export interface ImportDecklistOptions {
  deckName?: string;
  formatId: string;
  rulesetVersion: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function byLookup(cardDb: CardDatabase): Map<string, Card[]> {
  const lookup = new Map<string, Card[]>();
  for (const card of cardDb.cards) {
    for (const key of [card.display_name, card.name, card.slug, card.external_id]) {
      const normalized = normalizeName(key);
      const existing = lookup.get(normalized) ?? [];
      if (!existing.some((candidate) => candidate.id === card.id)) {
        lookup.set(normalized, [...existing, card]);
      }
    }
  }
  return lookup;
}

function parseDeckLine(line: string): { count: number; name: string } | undefined {
  const match = line.trim().match(/^(\d+)\s+(.+)$/);
  if (!match) return undefined;
  return { count: Number(match[1]), name: match[2].trim() };
}

function mergeEntry(entries: DeckCardEntry[], cardId: string, count: number): boolean {
  const existing = entries.find((entry) => entry.cardId === cardId);
  if (existing) {
    if (existing.count + count > deckInputLimits.cardCount) return false;
    existing.count += count;
  } else {
    entries.push({ cardId, count });
  }
  return true;
}

export function importDecklist(
  text: string,
  cardDb: CardDatabase,
  options: ImportDecklistOptions
): ImportDecklistResult {
  if (text.length > deckInputLimits.textCharacters) {
    return {
      errors: [{ line: 0, message: `Decklists are limited to ${deckInputLimits.textCharacters} characters.` }],
      warnings: []
    };
  }
  const lines = text.split(/\r?\n/);
  if (lines.length > deckInputLimits.decklistLines) {
    return {
      errors: [{ line: 0, message: `Decklists are limited to ${deckInputLimits.decklistLines} lines.` }],
      warnings: []
    };
  }
  const lookup = byLookup(cardDb);
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const legends: DeckCardEntry[] = [];
  const main: DeckCardEntry[] = [];
  let section: "legends" | "main" = "main";

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    if (rawLine.length > deckInputLimits.decklistLineCharacters) {
      errors.push({ line: lineNumber, message: `Lines are limited to ${deckInputLimits.decklistLineCharacters} characters.` });
      return;
    }
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    const header = line.toLowerCase().replace(/:$/, "");
    if (header === "legends" || header === "legend") {
      section = "legends";
      return;
    }
    if (header === "main" || header === "main deck" || header === "deck") {
      section = "main";
      return;
    }

    const parsed = parseDeckLine(line);
    if (!parsed) {
      errors.push({ line: lineNumber, message: `Expected a line like "3 Card Name".` });
      return;
    }
    if (parsed.count < 1 || parsed.count > deckInputLimits.cardCount) {
      errors.push({ line: lineNumber, message: `Card counts must be from 1 to ${deckInputLimits.cardCount}.` });
      return;
    }

    const matches = lookup.get(normalizeName(parsed.name)) ?? [];
    if (matches.length === 0) {
      errors.push({ line: lineNumber, message: `Unknown card "${parsed.name}".` });
      return;
    }
    if (matches.length > 1) {
      errors.push({ line: lineNumber, message: `Ambiguous card "${parsed.name}". Use a slug or external id instead.` });
      return;
    }

    const card = matches[0];
    if (section === "legends") {
      if (!mergeEntry(legends, card.id, parsed.count)) {
        errors.push({ line: lineNumber, message: `Combined card counts cannot exceed ${deckInputLimits.cardCount}.` });
      }
    } else {
      if (!mergeEntry(main, card.id, parsed.count)) {
        errors.push({ line: lineNumber, message: `Combined card counts cannot exceed ${deckInputLimits.cardCount}.` });
      }
    }
  });

  if (errors.length > 0) {
    return { errors, warnings };
  }

  return {
    deck: {
      id: `deck-${Date.now()}`,
      name: options.deckName ?? "Imported Deck",
      legends,
      main,
      formatId: options.formatId,
      rulesetVersion: options.rulesetVersion,
      cardDataVersion: cardDb.metadata.cardDataVersion
    },
    errors,
    warnings
  };
}

export function exportDecklist(deck: Deck, cardDb: CardDatabase): string {
  const cards = new Map(cardDb.cards.map((card) => [card.id, card]));
  const formatSection = (title: string, entries: DeckCardEntry[]) => [
    `${title}:`,
    ...entries.map((entry) => {
      const card = cards.get(entry.cardId);
      return `${entry.count} ${card?.display_name ?? entry.cardId}`;
    })
  ].join("\n");

  return [
    `# ${deck.name}`,
    formatSection("Legends", deck.legends),
    "",
    formatSection("Main", deck.main)
  ].join("\n");
}

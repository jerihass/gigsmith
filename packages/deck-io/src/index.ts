import type { Card, CardDatabase, Deck, DeckCardEntry } from "@gigsmith/data-contracts";

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

function mergeEntry(entries: DeckCardEntry[], cardId: string, count: number): void {
  const existing = entries.find((entry) => entry.cardId === cardId);
  if (existing) {
    existing.count += count;
  } else {
    entries.push({ cardId, count });
  }
}

export function importDecklist(
  text: string,
  cardDb: CardDatabase,
  options: ImportDecklistOptions
): ImportDecklistResult {
  const lookup = byLookup(cardDb);
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];
  const legends: DeckCardEntry[] = [];
  const main: DeckCardEntry[] = [];
  let section: "legends" | "main" = "main";

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1;
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
      mergeEntry(legends, card.id, parsed.count);
    } else {
      mergeEntry(main, card.id, parsed.count);
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

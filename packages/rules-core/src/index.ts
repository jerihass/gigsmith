import type {
  Card,
  CardColor,
  CardDatabase,
  CardId,
  CardLegalityReport,
  Deck,
  DeckCardEntry,
  RamLimit,
  RamLimitReport,
  Ruleset,
  ValidationIssue,
  ValidationResult
} from "@gigsmith/data-contracts";

export { analyzeEddyCurve } from "./eddyCurve";

function issue(
  code: string,
  severity: ValidationIssue["severity"],
  message: string,
  affectedCards: CardId[] = [],
  suggestedFixes?: string[]
): ValidationIssue {
  return { code, severity, message, affectedCards, suggestedFixes };
}

function cardMap(cardDb: CardDatabase): Map<CardId, Card> {
  return new Map(cardDb.cards.map((card) => [card.id, card]));
}

function findFormat(ruleset: Ruleset, formatId: string) {
  return ruleset.formats.find((format) => format.id === formatId);
}

function totalCount(entries: DeckCardEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function countedNoun(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function calculateRamLimits(
  legends: DeckCardEntry[],
  cardDb: CardDatabase,
  ruleset: Ruleset
): RamLimitReport {
  const cards = cardMap(cardDb);
  const byColor = new Map<CardColor, RamLimit>();

  for (const entry of legends) {
    const card = cards.get(entry.cardId);
    if (!card || card.card_type !== "Legend" || card.ram == null) continue;

    const existing = byColor.get(card.color) ?? {
      color: card.color,
      limit: 0,
      legendCardIds: []
    };
    existing.limit += card.ram * entry.count;
    existing.legendCardIds.push(card.id);
    byColor.set(card.color, existing);
  }

  return {
    limits: [...byColor.values()].sort((a, b) => a.color.localeCompare(b.color)),
    rulesetVersion: ruleset.version
  };
}

export function checkCardLegality(
  card: Card,
  ramLimits: RamLimitReport,
  ruleset: Ruleset,
  formatId = ruleset.defaultFormatId
): CardLegalityReport {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const format = findFormat(ruleset, formatId);
  const colorLimit = ramLimits.limits.find((limit) => limit.color === card.color);

  if (!format) {
    errors.push(
      issue("unknown-format", "error", `Format "${formatId}" is not defined by ${ruleset.version}.`, [card.id])
    );
  }

  if (format?.banned.includes(card.id)) {
    errors.push(issue("banned-card", "error", `${card.display_name} is banned in ${format.name}.`, [card.id]));
  }

  if (format?.restricted.includes(card.id)) {
    warnings.push(
      issue("restricted-card", "warning", `${card.display_name} is restricted in ${format.name}.`, [card.id])
    );
  }

  if (card.card_type !== "Legend") {
    if (card.ram == null) {
      warnings.push(issue("missing-ram", "warning", `${card.display_name} has no RAM value in the card snapshot.`, [card.id]));
    } else if (!colorLimit || card.ram > colorLimit.limit) {
      const limitText = colorLimit ? `${colorLimit.limit} ${card.color}` : `0 ${card.color}`;
      errors.push(
        issue(
          "ram-limit",
          "error",
          `${card.display_name} requires ${card.ram} ${card.color} RAM, but the selected Legends provide ${limitText} RAM.`,
          [card.id],
          [
            `Replace a selected Legend with one that provides more ${card.color} RAM, or remove ${card.display_name}.`
          ]
        )
      );
    }
  }

  return {
    legal: errors.length === 0,
    errors,
    warnings
  };
}

export function validateDeck(deck: Deck, cardDb: CardDatabase, ruleset: Ruleset): ValidationResult {
  const cards = cardMap(cardDb);
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const info: ValidationIssue[] = [];
  const mainCount = totalCount(deck.main);
  const legendCount = totalCount(deck.legends);
  const seenLegendNames = new Map<string, CardId[]>();
  const ramLimits = calculateRamLimits(deck.legends, cardDb, ruleset);

  if (deck.rulesetVersion !== ruleset.version) {
    warnings.push(
      issue(
        "ruleset-version-mismatch",
        "warning",
        `Deck targets ${deck.rulesetVersion}, but validation used ${ruleset.version}.`
      )
    );
  }

  if (deck.cardDataVersion !== cardDb.metadata.cardDataVersion) {
    warnings.push(
      issue(
        "card-data-version-mismatch",
        "warning",
        `Deck targets ${deck.cardDataVersion}, but validation used ${cardDb.metadata.cardDataVersion}.`
      )
    );
  }

  if (!findFormat(ruleset, deck.formatId)) {
    errors.push(issue("unknown-format", "error", `Format "${deck.formatId}" is not defined by ${ruleset.version}.`));
  }

  for (const section of ["legends", "main"] as const) {
    for (const entry of deck[section]) {
      const card = cards.get(entry.cardId);
      if (!card) {
        errors.push(issue("unknown-card", "error", `Unknown card id "${entry.cardId}" in ${section}.`, [entry.cardId]));
      }
      if (!Number.isInteger(entry.count) || entry.count <= 0) {
        errors.push(issue("invalid-count", "error", `Card counts must be positive integers.`, [entry.cardId]));
      }
    }
  }

  for (const entry of deck.legends) {
    const card = cards.get(entry.cardId);
    if (!card) continue;

    if (card.card_type !== "Legend") {
      errors.push(issue("legend-section-type", "error", `${card.display_name} is not a Legend.`, [card.id]));
      continue;
    }

    if (entry.count !== 1) {
      errors.push(
        issue("legend-count", "error", `${card.display_name} appears ${entry.count} times. Legends must be unique singletons.`, [card.id])
      );
    }

    const names = seenLegendNames.get(card.display_name) ?? [];
    names.push(card.id);
    seenLegendNames.set(card.display_name, names);

    const cardLegality = checkCardLegality(card, ramLimits, ruleset, deck.formatId);
    errors.push(...cardLegality.errors);
    warnings.push(...cardLegality.warnings);
  }

  if (legendCount !== ruleset.requiredUniqueLegends) {
    const difference = Math.abs(ruleset.requiredUniqueLegends - legendCount);
    const suggestedFix = legendCount < ruleset.requiredUniqueLegends
      ? `Add ${countedNoun(difference, "different Legend card")}.`
      : `Remove ${countedNoun(difference, "Legend card")}, keeping exactly ${ruleset.requiredUniqueLegends} different Legends.`;
    errors.push(
      issue(
        "legend-total",
        "error",
        `Deck has ${legendCount} Legend card${legendCount === 1 ? "" : "s"}. Exactly ${ruleset.requiredUniqueLegends} unique Legends are required.`,
        deck.legends.map((entry) => entry.cardId),
        [suggestedFix]
      )
    );
  }

  for (const [name, ids] of seenLegendNames) {
    if (ids.length > 1) {
      errors.push(issue("legend-duplicate-name", "error", `Legend "${name}" is selected more than once.`, ids));
    }
  }

  if (mainCount < ruleset.minMainDeckCards || mainCount > ruleset.maxMainDeckCards) {
    const suggestedFix = mainCount < ruleset.minMainDeckCards
      ? `Add ${countedNoun(ruleset.minMainDeckCards - mainCount, "non-Legend card")} to the main deck.`
      : `Remove ${countedNoun(mainCount - ruleset.maxMainDeckCards, "card")} from the main deck.`;
    errors.push(
      issue(
        "main-deck-size",
        "error",
        `Main deck has ${mainCount} cards. It must contain ${ruleset.minMainDeckCards}-${ruleset.maxMainDeckCards} non-Legend cards.`,
        deck.main.map((entry) => entry.cardId),
        [suggestedFix]
      )
    );
  }

  const copyCounts = new Map<CardId, number>();

  for (const entry of deck.main) {
    const card = cards.get(entry.cardId);
    if (!card) continue;

    if (card.card_type === "Legend") {
      errors.push(issue("main-section-type", "error", `${card.display_name} is a Legend and cannot be in the main deck.`, [card.id]));
      continue;
    }

    const nextCount = (copyCounts.get(card.id) ?? 0) + entry.count;
    copyCounts.set(card.id, nextCount);

    const maxCopies = ruleset.maxCopiesByType[card.card_type] ?? 3;
    if (nextCount > maxCopies) {
      errors.push(
        issue(
          "max-copies",
          "error",
          `${card.display_name} has ${nextCount} copies. Maximum is ${maxCopies}.`,
          [card.id],
          [`Remove ${nextCount - maxCopies} ${nextCount - maxCopies === 1 ? "copy" : "copies"} of ${card.display_name}.`]
        )
      );
    }

    const cardLegality = checkCardLegality(card, ramLimits, ruleset, deck.formatId);
    errors.push(...cardLegality.errors);
    warnings.push(...cardLegality.warnings);
  }

  if (errors.length === 0) {
    info.push(issue("deck-legal", "info", "Deck is legal under the current guide ruleset."));
  }

  return {
    legal: errors.length === 0,
    errors,
    warnings,
    info,
    rulesetVersion: ruleset.version
  };
}

export function analyzeStreetCred(gigs: { value: number }[]): number {
  return gigs.reduce((sum, gig) => sum + gig.value, 0);
}

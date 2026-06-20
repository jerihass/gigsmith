import type {
  Card,
  CardDatabase,
  CardId,
  Deck,
  Ruleset,
  SampleHandCard,
  SampleHandIssue,
  SampleHandReport
} from "@gigsmith/data-contracts";

interface DeckCopy {
  cardId: CardId;
  copyNumber: number;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: string): () => number {
  let state = hashSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ value >>> 15, value | 1);
    value ^= value + Math.imul(value ^ value >>> 7, value | 61);
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
}

function shuffled<T>(values: T[], seed: string): T[] {
  const result = [...values];
  const random = seededRandom(seed);
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function sampleCard(copy: DeckCopy, card: Card | undefined): SampleHandCard {
  if (!card) {
    return {
      cardId: copy.cardId,
      copyNumber: copy.copyNumber,
      known: false,
      classifications: []
    };
  }
  return {
    cardId: card.id,
    copyNumber: copy.copyNumber,
    known: true,
    displayName: card.display_name,
    cost: card.cost,
    isSellable: card.is_eddiable,
    classifications: [...card.classifications]
  };
}

export function drawSampleHand(
  deck: Deck,
  cardDb: CardDatabase,
  ruleset: Ruleset,
  seed: string,
  requestedHandSize = ruleset.eddyRules.openingHandSize
): SampleHandReport {
  const normalizedSeed = seed.trim() || "gigsmith";
  const cardsById = new Map(cardDb.cards.map((card) => [card.id, card]));
  const copies: DeckCopy[] = [];
  const issues: SampleHandIssue[] = [];
  const unknownCardIds = new Set<CardId>();

  for (const entry of deck.main) {
    if (!Number.isInteger(entry.count) || entry.count <= 0) {
      issues.push({
        code: "invalid-count",
        message: `Card "${entry.cardId}" has an invalid copy count and was excluded from the sample.`,
        affectedCardIds: [entry.cardId]
      });
      continue;
    }
    if (!cardsById.has(entry.cardId)) unknownCardIds.add(entry.cardId);
    for (let copyNumber = 1; copyNumber <= entry.count; copyNumber += 1) {
      copies.push({ cardId: entry.cardId, copyNumber });
    }
  }

  for (const cardId of unknownCardIds) {
    issues.push({
      code: "unknown-card",
      message: `Card "${cardId}" is not present in ${cardDb.metadata.cardDataVersion}.`,
      affectedCardIds: [cardId]
    });
  }

  const safeHandSize = Math.max(0, Math.floor(requestedHandSize));
  if (copies.length < safeHandSize) {
    issues.push({
      code: "insufficient-deck",
      message: `The main deck has ${copies.length} drawable cards, fewer than the requested hand size of ${safeHandSize}.`,
      affectedCardIds: deck.main.map((entry) => entry.cardId)
    });
  }

  const cards = shuffled(copies, normalizedSeed)
    .slice(0, safeHandSize)
    .map((copy) => sampleCard(copy, cardsById.get(copy.cardId)));

  return {
    seed: normalizedSeed,
    requestedHandSize: safeHandSize,
    deckCardCount: copies.length,
    cards,
    sellableCount: cards.filter((card) => card.isSellable).length,
    knownPrintedCostTotal: cards.reduce((sum, card) => sum + (card.cost ?? 0), 0),
    issues,
    assumptions: [
      "The sample uses only main-deck card copies; Legends are not shuffled into the deck.",
      "The shuffle is deterministic for the same deck order and seed.",
      "Mulligan decisions, card draw effects, and card-text interactions are not evaluated."
    ],
    rulesetVersion: ruleset.version,
    cardDataVersion: cardDb.metadata.cardDataVersion
  };
}

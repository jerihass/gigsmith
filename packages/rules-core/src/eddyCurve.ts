import type {
  Card,
  CardDatabase,
  CardId,
  Deck,
  DeckCardEntry,
  EddyCurveReport,
  EddyCurveWarning,
  EddyDemandSummary,
  EddyEffectReference,
  EddyTurnProjection,
  Ruleset
} from "@gigsmith/data-contracts";

const projectionTurnCount = 7;

function choose(total: number, selected: number): number {
  if (selected < 0 || selected > total) return 0;
  const count = Math.min(selected, total - selected);
  let result = 1;
  for (let index = 1; index <= count; index += 1) {
    result = result * (total - count + index) / index;
  }
  return result;
}

function expectedSales(
  population: number,
  sellable: number,
  cardsSeen: number,
  saleCapacity: number
): number {
  if (population === 0 || sellable === 0 || cardsSeen === 0 || saleCapacity === 0) return 0;

  const denominator = choose(population, cardsSeen);
  const minimumSellable = Math.max(0, cardsSeen - (population - sellable));
  const maximumSellable = Math.min(sellable, cardsSeen);
  let expected = 0;

  for (let count = minimumSellable; count <= maximumSellable; count += 1) {
    const probability = choose(sellable, count) * choose(population - sellable, cardsSeen - count) / denominator;
    expected += Math.min(count, saleCapacity) * probability;
  }

  return expected;
}

function summarizeDemand(
  entries: DeckCardEntry[],
  cards: Map<CardId, Card>
): EddyDemandSummary {
  const buckets = new Map<number, { cardCount: number; cardIds: Set<CardId> }>();
  const cardsWithoutPrintedCostIds = new Set<CardId>();
  let cardCount = 0;
  let cardsWithKnownCost = 0;
  let totalPrintedCost = 0;

  for (const entry of entries) {
    cardCount += entry.count;
    const card = cards.get(entry.cardId);
    if (!card || card.cost === null) {
      cardsWithoutPrintedCostIds.add(entry.cardId);
      continue;
    }

    cardsWithKnownCost += entry.count;
    totalPrintedCost += card.cost * entry.count;
    const bucket = buckets.get(card.cost) ?? { cardCount: 0, cardIds: new Set<CardId>() };
    bucket.cardCount += entry.count;
    bucket.cardIds.add(card.id);
    buckets.set(card.cost, bucket);
  }

  return {
    cardCount,
    cardsWithKnownCost,
    totalPrintedCost,
    averagePrintedCost: cardsWithKnownCost === 0 ? null : totalPrintedCost / cardsWithKnownCost,
    costBuckets: [...buckets.entries()]
      .sort(([left], [right]) => left - right)
      .map(([cost, bucket]) => ({
        cost,
        cardCount: bucket.cardCount,
        cardIds: [...bucket.cardIds].sort()
      })),
    cardsWithoutPrintedCostIds: [...cardsWithoutPrintedCostIds].sort()
  };
}

function referencesEddyRules(card: Card): card is Card & { rules_text: string } {
  return card.rules_text !== null && /(?:\bEdd(?:y|ie|ies)\b|\bSell\b|€\$)/i.test(card.rules_text);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export function analyzeEddyCurve(
  deck: Deck,
  cardDb: CardDatabase,
  ruleset: Ruleset
): EddyCurveReport {
  const cards = new Map(cardDb.cards.map((card) => [card.id, card]));
  const mainDeckDemand = summarizeDemand(deck.main, cards);
  const legendDemand = summarizeDemand(deck.legends, cards);
  const warnings: EddyCurveWarning[] = [];
  const sellableCardCount = deck.main.reduce((total, entry) => {
    return total + (cards.get(entry.cardId)?.is_eddiable ? entry.count : 0);
  }, 0);
  const nonSellableCardCount = mainDeckDemand.cardCount - sellableCardCount;
  const sellableDensity = mainDeckDemand.cardCount === 0 ? 0 : sellableCardCount / mainDeckDemand.cardCount;

  if (mainDeckDemand.cardsWithoutPrintedCostIds.length > 0) {
    warnings.push({
      code: "missing-main-cost",
      message: "Some main-deck cards have no printed cost in the current card snapshot.",
      affectedCards: mainDeckDemand.cardsWithoutPrintedCostIds
    });
  }

  const effectReferences: EddyEffectReference[] = [...deck.legends, ...deck.main].flatMap((entry) => {
    const card = cards.get(entry.cardId);
    return card && referencesEddyRules(card)
      ? [{ cardId: card.id, copies: entry.count, rulesText: card.rules_text }]
      : [];
  });

  if (effectReferences.length > 0) {
    warnings.push({
      code: "unmodeled-eddy-effects",
      message: "Card-text Eddy costs, discounts, extra sales, and ready effects are listed but not applied to projections.",
      affectedCards: effectReferences.map((reference) => reference.cardId)
    });
  }

  const totalLegendCapacity = deck.legends.reduce((total, entry) => {
    return total + (cards.get(entry.cardId)?.card_type === "Legend" ? entry.count : 0);
  }, 0) * ruleset.eddyRules.legendPaymentValue;
  const firstTurnLegendCapacity = ruleset.eddyRules.firstPlayerLegendsReadyOnFirstTurn
    ? totalLegendCapacity
    : Math.max(0, totalLegendCapacity - ruleset.eddyRules.firstPlayerSpentLegendsAtSetup * ruleset.eddyRules.legendPaymentValue);

  const turnProjections: EddyTurnProjection[] = Array.from(
    { length: projectionTurnCount },
    (_, index) => {
      const turn = index + 1;
      const cardsSeen = Math.min(
        mainDeckDemand.cardCount,
        ruleset.eddyRules.openingHandSize + turn * ruleset.eddyRules.cardsDrawnPerTurn
      );
      const saleCapacity = turn * ruleset.eddyRules.maxSellsPerTurn;
      const projectedSales = expectedSales(
        mainDeckDemand.cardCount,
        sellableCardCount,
        cardsSeen,
        saleCapacity
      );
      const expectedPersistentEddies = ruleset.eddyRules.startingEddies + projectedSales * ruleset.eddyRules.eddiesPerSoldCard;
      const maximumPersistentEddies = ruleset.eddyRules.startingEddies
        + Math.min(sellableCardCount, saleCapacity) * ruleset.eddyRules.eddiesPerSoldCard;
      const firstPlayerLegendCapacity = turn === 1 ? firstTurnLegendCapacity : totalLegendCapacity;

      return {
        turn,
        cardsSeen,
        expectedSellableCardsSeen: round(cardsSeen * sellableDensity),
        expectedPersistentEddies: round(expectedPersistentEddies),
        maximumPersistentEddies,
        firstPlayerLegendCapacity,
        secondPlayerLegendCapacity: totalLegendCapacity,
        expectedFirstPlayerPaymentCapacity: round(expectedPersistentEddies + firstPlayerLegendCapacity),
        expectedSecondPlayerPaymentCapacity: round(expectedPersistentEddies + totalLegendCapacity)
      };
    }
  );

  return {
    rulesetVersion: ruleset.version,
    cardDataVersion: cardDb.metadata.cardDataVersion,
    assumptions: [
      "Printed main-deck costs represent nominal demand; card-text discounts and additional costs are not applied.",
      "Draw estimates assume a random deck without replacement, no mulligan, and no card-effect draws.",
      `A player sells whenever possible, up to ${ruleset.eddyRules.maxSellsPerTurn} sellable card per turn for ${ruleset.eddyRules.eddiesPerSoldCard} persistent Eddie.`,
      "Payment capacity is gross ready capacity before playing cards, activating effects, calling Legends, or using Go Solo.",
      "Turn projections cover turns 1-7, the normal pre-overtime game window."
    ],
    mainDeckDemand,
    legendDemand,
    supply: {
      sellableCardCount,
      nonSellableCardCount,
      sellableDensity: round(sellableDensity),
      maximumPersistentEddies: ruleset.eddyRules.startingEddies
        + sellableCardCount * ruleset.eddyRules.eddiesPerSoldCard,
      turnProjections
    },
    effectReferences,
    warnings
  };
}

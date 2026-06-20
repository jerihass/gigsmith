import type {
  Card,
  CardDatabase,
  CardId,
  Deck,
  MulliganAnalysisReport,
  MulliganGoal,
  MulliganHandMetrics,
  MulliganIssue,
  MulliganPlayerOrder,
  Ruleset,
  SampleHandCard
} from "@gigsmith/data-contracts";
import { drawSampleHand } from "./sampleHand";

export interface MulliganAnalysisOptions {
  seed: string;
  goal?: MulliganGoal;
  playerOrder?: MulliganPlayerOrder;
  simulationSamples?: number;
}

const exactOutcomeLimit = 50_000;
const defaultSimulationSamples = 2_000;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function choose(total: number, selected: number): number {
  if (selected < 0 || selected > total) return 0;
  const count = Math.min(selected, total - selected);
  let result = 1;
  for (let index = 1; index <= count; index += 1) {
    result = result * (total - count + index) / index;
    if (result > exactOutcomeLimit) return result;
  }
  return Math.round(result);
}

function firstTurnLegendCapacity(
  deck: Deck,
  cardsById: Map<CardId, Card>,
  ruleset: Ruleset,
  playerOrder: MulliganPlayerOrder
): number {
  const legendCount = deck.legends.reduce(
    (total, entry) => total + (cardsById.get(entry.cardId)?.card_type === "Legend" ? entry.count : 0),
    0
  );
  const total = legendCount * ruleset.eddyRules.legendPaymentValue;
  if (playerOrder === "second" || ruleset.eddyRules.firstPlayerLegendsReadyOnFirstTurn) return total;
  return Math.max(
    0,
    total - ruleset.eddyRules.firstPlayerSpentLegendsAtSetup * ruleset.eddyRules.legendPaymentValue
  );
}

function scoreMetrics(metrics: Omit<MulliganHandMetrics, "score">, goal: MulliganGoal): number {
  const lowCost = metrics.averagePrintedCost === null ? 0 : 1 / (1 + metrics.averagePrintedCost);
  if (goal === "early-play") {
    return round(metrics.playableDensity * 0.75 + metrics.sellableDensity * 0.15 + lowCost * 0.1);
  }
  if (goal === "eddy-supply") {
    return round(metrics.sellableDensity * 0.7 + metrics.playableDensity * 0.25 + lowCost * 0.05);
  }
  return round(metrics.playableDensity * 0.5 + metrics.sellableDensity * 0.35 + lowCost * 0.15);
}

function handMetrics(
  cards: SampleHandCard[],
  baseCapacity: number,
  ruleset: Ruleset,
  goal: MulliganGoal
): MulliganHandMetrics {
  const knownCosts = cards.flatMap((card) => card.cost === null || card.cost === undefined ? [] : [card.cost]);
  const sellableCount = cards.filter((card) => card.isSellable).length;
  const firstTurnPaymentCapacity = baseCapacity
    + ruleset.eddyRules.startingEddies
    + Math.min(sellableCount, ruleset.eddyRules.maxSellsPerTurn) * ruleset.eddyRules.eddiesPerSoldCard;
  const playableCardCount = cards.filter(
    (card) => card.cost !== null && card.cost !== undefined && card.cost <= firstTurnPaymentCapacity
  ).length;
  const metrics = {
    cardCount: cards.length,
    knownCostCount: knownCosts.length,
    totalPrintedCost: knownCosts.reduce((total, cost) => total + cost, 0),
    averagePrintedCost: knownCosts.length === 0 ? null : round(knownCosts.reduce((total, cost) => total + cost, 0) / knownCosts.length),
    sellableCount,
    sellableDensity: cards.length === 0 ? 0 : round(sellableCount / cards.length),
    firstTurnPaymentCapacity,
    playableCardCount,
    playableDensity: cards.length === 0 ? 0 : round(playableCardCount / cards.length)
  };
  return { ...metrics, score: scoreMetrics(metrics, goal) };
}

function averageMetrics(metrics: MulliganHandMetrics[]): MulliganHandMetrics {
  if (metrics.length === 0) {
    return {
      cardCount: 0,
      knownCostCount: 0,
      totalPrintedCost: 0,
      averagePrintedCost: null,
      sellableCount: 0,
      sellableDensity: 0,
      firstTurnPaymentCapacity: 0,
      playableCardCount: 0,
      playableDensity: 0,
      score: 0
    };
  }
  const mean = (select: (metric: MulliganHandMetrics) => number) => round(
    metrics.reduce((total, metric) => total + select(metric), 0) / metrics.length
  );
  const knownAverages = metrics.flatMap((metric) => metric.averagePrintedCost === null ? [] : [metric.averagePrintedCost]);
  const result = {
    cardCount: mean((metric) => metric.cardCount),
    knownCostCount: mean((metric) => metric.knownCostCount),
    totalPrintedCost: mean((metric) => metric.totalPrintedCost),
    averagePrintedCost: knownAverages.length === 0
      ? null
      : round(knownAverages.reduce((total, value) => total + value, 0) / knownAverages.length),
    sellableCount: mean((metric) => metric.sellableCount),
    sellableDensity: mean((metric) => metric.sellableDensity),
    firstTurnPaymentCapacity: mean((metric) => metric.firstTurnPaymentCapacity),
    playableCardCount: mean((metric) => metric.playableCardCount),
    playableDensity: mean((metric) => metric.playableDensity)
  };
  return { ...result, score: mean((metric) => metric.score) };
}

function enumerateHands<T>(values: T[], handSize: number, visit: (hand: T[]) => void): void {
  const hand: T[] = [];
  function walk(start: number) {
    if (hand.length === handSize) {
      visit([...hand]);
      return;
    }
    const remaining = handSize - hand.length;
    for (let index = start; index <= values.length - remaining; index += 1) {
      hand.push(values[index]);
      walk(index + 1);
      hand.pop();
    }
  }
  walk(0);
}

function expandedDeck(deck: Deck, cardsById: Map<CardId, Card>): SampleHandCard[] {
  return deck.main.flatMap((entry) => {
    if (!Number.isInteger(entry.count) || entry.count <= 0) return [];
    const card = cardsById.get(entry.cardId);
    return Array.from({ length: entry.count }, (_, index) => ({
      cardId: entry.cardId,
      copyNumber: index + 1,
      known: Boolean(card),
      displayName: card?.display_name,
      cost: card?.cost,
      isSellable: card?.is_eddiable,
      classifications: card ? [...card.classifications] : []
    }));
  });
}

function confidenceMargin(metrics: MulliganHandMetrics[]): number {
  if (metrics.length < 2) return 0;
  const mean = metrics.reduce((total, metric) => total + metric.score, 0) / metrics.length;
  const variance = metrics.reduce((total, metric) => total + (metric.score - mean) ** 2, 0) / (metrics.length - 1);
  return round(1.96 * Math.sqrt(variance / metrics.length));
}

export function analyzeMulligan(
  deck: Deck,
  cardDb: CardDatabase,
  ruleset: Ruleset,
  options: MulliganAnalysisOptions
): MulliganAnalysisReport {
  const seed = options.seed.trim() || "gigsmith";
  const goal = options.goal ?? "balanced";
  const playerOrder = options.playerOrder ?? "first";
  const cardsById = new Map(cardDb.cards.map((card) => [card.id, card]));
  const currentHand = drawSampleHand(deck, cardDb, ruleset, seed);
  const sampledMulliganHand = drawSampleHand(deck, cardDb, ruleset, `${seed}:mulligan`);
  const copies = expandedDeck(deck, cardsById);
  const handSize = Math.min(ruleset.mulliganRules.drawCount, copies.length);
  const baseCapacity = firstTurnLegendCapacity(deck, cardsById, ruleset, playerOrder);
  const currentMetrics = handMetrics(currentHand.cards, baseCapacity, ruleset, goal);
  const possibleOutcomes = choose(copies.length, handSize);
  const method = possibleOutcomes <= exactOutcomeLimit ? "exact" : "seeded-simulation";
  const outcomeMetrics: MulliganHandMetrics[] = [];

  if (method === "exact") {
    enumerateHands(copies, handSize, (hand) => outcomeMetrics.push(handMetrics(hand, baseCapacity, ruleset, goal)));
  } else {
    const requestedSamples = options.simulationSamples ?? defaultSimulationSamples;
    const sampleSize = Number.isFinite(requestedSamples) ? Math.max(100, Math.floor(requestedSamples)) : defaultSimulationSamples;
    for (let index = 0; index < sampleSize; index += 1) {
      const hand = drawSampleHand(deck, cardDb, ruleset, `${seed}:simulation:${index}`).cards;
      outcomeMetrics.push(handMetrics(hand, baseCapacity, ruleset, goal));
    }
  }

  const expectedMulliganMetrics = averageMetrics(outcomeMetrics);
  const scoreMarginOfError = method === "exact" ? 0 : confidenceMargin(outcomeMetrics);
  const scoreDifference = expectedMulliganMetrics.score - currentMetrics.score;
  const decisionThreshold = Math.max(0.03, scoreMarginOfError);
  const recommendation = scoreDifference > decisionThreshold
    ? "lean-mulligan"
    : scoreDifference < -decisionThreshold
      ? "lean-keep"
      : "close-call";
  const issues: MulliganIssue[] = [];
  const unknownCardIds = [...new Set(currentHand.issues
    .filter((issue) => issue.code === "unknown-card")
    .flatMap((issue) => issue.affectedCardIds))];
  if (unknownCardIds.length > 0) {
    issues.push({
      code: "unknown-card",
      message: "Unknown cards are treated as neither playable nor sellable.",
      affectedCardIds: unknownCardIds
    });
  }
  if (copies.length < ruleset.mulliganRules.drawCount) {
    issues.push({
      code: "insufficient-data",
      message: "The deck is shorter than the official opening hand, so this comparison is not representative.",
      affectedCardIds: deck.main.map((entry) => entry.cardId)
    });
  }
  const unsupportedCardIds = [...new Set(deck.main.flatMap((entry) => {
    const card = cardsById.get(entry.cardId);
    return card?.rules_text ? [card.id] : [];
  }))];
  if (unsupportedCardIds.length > 0) {
    issues.push({
      code: "unsupported-card-text",
      message: "Card-text effects and sequencing are not included in the recommendation.",
      affectedCardIds: unsupportedCardIds
    });
  }

  const formatMetric = (value: number) => value.toFixed(1);
  const reasons = [
    `This hand has ${currentMetrics.playableCardCount} cards within first-turn gross capacity; a redraw averages ${formatMetric(expectedMulliganMetrics.playableCardCount)}.`,
    `This hand has ${currentMetrics.sellableCount} sellable cards; a redraw averages ${formatMetric(expectedMulliganMetrics.sellableCount)}.`,
    `Its average known printed cost is ${currentMetrics.averagePrintedCost?.toFixed(1) ?? "unknown"}; a redraw averages ${expectedMulliganMetrics.averagePrintedCost?.toFixed(1) ?? "unknown"}.`
  ];

  return {
    version: "mulligan-analysis.v1",
    seed,
    goal,
    playerOrder,
    method,
    sampleSize: outcomeMetrics.length,
    totalOutcomes: method === "exact" ? possibleOutcomes : null,
    currentHand,
    sampledMulliganHand,
    currentMetrics,
    expectedMulliganMetrics,
    confidenceLevel: 0.95,
    scoreMarginOfError,
    recommendation,
    reasons,
    assumptions: [
      `The official mulligan may be used ${ruleset.mulliganRules.maxMulligans} time and returns the entire hand to the deck before drawing ${ruleset.mulliganRules.drawCount} new cards.`,
      "Playable count uses gross first-turn capacity from ready Legends, starting Eddies, and at most one available sale.",
      "The possible sold card is still included in playable count; no specific sale or play sequence is chosen.",
      "Printed cost, sellability, and classifications are evaluated; card text, matchups, Gig state, and combos are not.",
      "Recommendations are directional comparisons under the selected goal, not claims of an objectively correct play."
    ],
    issues,
    rulesetVersion: ruleset.version,
    cardDataVersion: cardDb.metadata.cardDataVersion
  };
}

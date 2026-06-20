import type {
  CardDatabase,
  Deck,
  DieType,
  GigConditionDemand,
  GigConditionId,
  GigMatchState,
  GigOddsReport,
  GigRequirementRegistry,
  GigRollProfile,
  Ruleset
} from "@gigsmith/data-contracts";
import { gigDieMaximum } from "./gigMatch";

const supportedConditions = new Set<GigConditionId>([
  "high-8",
  "maximum",
  "minimum",
  "parity-mix",
  "distinct-2",
  "distinct-3",
  "value-pair",
  "cost-match",
  "street-cred-20"
]);

function round(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function permutations<T>(values: T[]): T[][] {
  if (values.length <= 1) return [values];
  return values.flatMap((value, index) =>
    permutations([...values.slice(0, index), ...values.slice(index + 1)]).map((rest) => [value, ...rest])
  );
}

interface RollDomain {
  dieType: DieType;
  values: number[];
}

function rollProfile(domains: RollDomain[], costCopies: Map<number, number>): GigRollProfile {
  let outcomeCount = 0;
  let streetCredTotal = 0;
  let high8 = 0;
  let maximum = 0;
  let minimum = 0;
  let parityMix = 0;
  let distinct2 = 0;
  let distinct3 = 0;
  let valuePair = 0;
  let streetCred20 = 0;
  let costMatchDensityTotal = 0;
  const knownCostCopies = [...costCopies.values()].reduce((sum, count) => sum + count, 0);

  function visit(index: number, values: number[]) {
    if (index < domains.length) {
      for (const value of domains[index].values) visit(index + 1, [...values, value]);
      return;
    }
    outcomeCount += 1;
    const streetCred = values.reduce((sum, value) => sum + value, 0);
    const distinct = new Set(values);
    const hasEven = values.some((value) => value % 2 === 0);
    const hasOdd = values.some((value) => value % 2 === 1);
    streetCredTotal += streetCred;
    if (values.some((value) => value >= 8)) high8 += 1;
    if (values.some((value, valueIndex) => value === gigDieMaximum(domains[valueIndex].dieType))) maximum += 1;
    if (values.includes(1)) minimum += 1;
    if (hasEven && hasOdd) parityMix += 1;
    if (distinct.size >= 2) distinct2 += 1;
    if (distinct.size >= 3) distinct3 += 1;
    if (distinct.size < values.length) valuePair += 1;
    if (streetCred >= 20) streetCred20 += 1;
    if (knownCostCopies > 0) {
      costMatchDensityTotal += [...distinct].reduce((sum, value) => sum + (costCopies.get(value) ?? 0), 0) / knownCostCopies;
    }
  }

  visit(0, []);
  const probability = (count: number) => outcomeCount === 0 ? 0 : round(count / outcomeCount);
  return {
    outcomeCount,
    expectedStreetCred: outcomeCount === 0 ? 0 : round(streetCredTotal / outcomeCount),
    high8Probability: probability(high8),
    maximumProbability: probability(maximum),
    minimumProbability: probability(minimum),
    parityMixProbability: probability(parityMix),
    distinct2Probability: probability(distinct2),
    distinct3Probability: probability(distinct3),
    valuePairProbability: probability(valuePair),
    streetCred20Probability: probability(streetCred20),
    expectedCostMatchDensity: knownCostCopies === 0 || outcomeCount === 0 ? null : round(costMatchDensityTotal / outcomeCount)
  };
}

function conditionValue(condition: GigConditionId, profile: GigRollProfile): number | undefined {
  switch (condition) {
    case "high-8": return profile.high8Probability;
    case "maximum": return profile.maximumProbability;
    case "minimum": return profile.minimumProbability;
    case "parity-mix": return profile.parityMixProbability;
    case "distinct-2": return profile.distinct2Probability;
    case "distinct-3": return profile.distinct3Probability;
    case "value-pair": return profile.valuePairProbability;
    case "cost-match": return profile.expectedCostMatchDensity ?? 0;
    case "street-cred-20": return profile.streetCred20Probability;
    default: return undefined;
  }
}

function deckFitScore(profile: GigRollProfile, demands: GigConditionDemand[]): number {
  let weighted = 0;
  let copies = 0;
  for (const demand of demands) {
    const value = conditionValue(demand.condition, profile);
    if (value === undefined) continue;
    weighted += value * demand.copies;
    copies += demand.copies;
  }
  return copies === 0 ? 0 : round(weighted / copies);
}

function buildDemands(deck: Deck, cardDb: CardDatabase, registry: GigRequirementRegistry): GigConditionDemand[] {
  const cards = new Map(cardDb.cards.map((card) => [card.id, card]));
  const requirements = new Map(registry.entries.map((entry) => [entry.externalCardId, entry]));
  const byCondition = new Map<GigConditionId, GigConditionDemand>();
  for (const entry of [...deck.legends, ...deck.main]) {
    const card = cards.get(entry.cardId);
    const requirement = card ? requirements.get(card.external_id) : undefined;
    if (!card || !requirement) continue;
    for (const condition of requirement.conditions) {
      const demand = byCondition.get(condition) ?? {
        condition,
        copies: 0,
        cardIds: [],
        colors: [],
        supported: supportedConditions.has(condition)
      };
      demand.copies += entry.count;
      if (!demand.cardIds.includes(card.id)) demand.cardIds.push(card.id);
      if (!demand.colors.includes(card.color)) demand.colors.push(card.color);
      byCondition.set(condition, demand);
    }
  }
  return [...byCondition.values()].sort((left, right) => right.copies - left.copies || left.condition.localeCompare(right.condition));
}

function deckCostCopies(deck: Deck, cardDb: CardDatabase): Map<number, number> {
  const cards = new Map(cardDb.cards.map((card) => [card.id, card]));
  const costs = new Map<number, number>();
  for (const entry of deck.main) {
    const cost = cards.get(entry.cardId)?.cost;
    if (cost == null) continue;
    costs.set(cost, (costs.get(cost) ?? 0) + entry.count);
  }
  return costs;
}

function dieDomain(dieType: DieType): RollDomain {
  return { dieType, values: Array.from({ length: gigDieMaximum(dieType) }, (_, index) => index + 1) };
}

export function analyzeGigOdds(
  deck: Deck,
  cardDb: CardDatabase,
  registry: GigRequirementRegistry,
  ruleset: Ruleset,
  match?: GigMatchState,
  playerId = "player"
): GigOddsReport {
  const demands = buildDemands(deck, cardDb, registry);
  const costs = deckCostCopies(deck, cardDb);
  const profileCache = new Map<string, GigRollProfile>();
  const profileForDice = (dice: DieType[]) => {
    const key = [...dice].sort().join(",");
    const existing = profileCache.get(key);
    if (existing) return existing;
    const profile = rollProfile(dice.map(dieDomain), costs);
    profileCache.set(key, profile);
    return profile;
  };
  const d20 = ruleset.gigRules.playerDieTypes.find((dieType) => dieType === "d20");
  const earlyDice = ruleset.gigRules.playerDieTypes.filter((dieType) => dieType !== "d20");
  const orders = permutations(earlyDice).map((order) => d20 ? [...order, d20] : order);
  let recommendedOrder = orders[0] ?? [];
  let recommendedScore = -1;
  for (const order of orders) {
    const score = order.reduce((sum, _dieType, index) => sum + deckFitScore(profileForDice(order.slice(0, index + 1)), demands), 0);
    if (score > recommendedScore) {
      recommendedOrder = order;
      recommendedScore = score;
    }
  }
  const turns = recommendedOrder.map((dieType, index) => {
    const dice = recommendedOrder.slice(0, index + 1);
    const profile = profileForDice(dice);
    return { turn: index + 1, dieType, dice, profile, deckFitScore: deckFitScore(profile, demands) };
  });

  const controlled = match?.gigs.filter((gig) => gig.controllerId === playerId) ?? [];
  let remaining = match?.gigs.filter((gig) => gig.ownerId === playerId && !gig.controllerId) ?? [];
  if (remaining.some((gig) => gig.dieType !== "d20")) remaining = remaining.filter((gig) => gig.dieType !== "d20");
  const fixedDomains: RollDomain[] = controlled.map((gig) => ({ dieType: gig.dieType, values: [gig.value] }));
  const nextDieOptions = remaining.map((gig) => {
    const profile = rollProfile([...fixedDomains, dieDomain(gig.dieType)], costs);
    return { dieType: gig.dieType, profile, deckFitScore: deckFitScore(profile, demands) };
  }).sort((left, right) => right.deckFitScore - left.deckFitScore || left.dieType.localeCompare(right.dieType));

  return {
    registryVersion: registry.version,
    rulesetVersion: ruleset.version,
    cardDataVersion: cardDb.metadata.cardDataVersion,
    demands,
    unsupportedCardIds: demands.filter((demand) => !demand.supported).flatMap((demand) => demand.cardIds),
    recommendedOrder,
    turns,
    nextDieOptions,
    assumptions: [
      "Every face on a die is equally likely and rolls are independent.",
      "The recommended order maximizes cumulative enabled-card-copy probability across turns 1-6; the d20 remains last.",
      "Cost matching measures the expected share of known-cost main-deck copies matching at least one friendly Gig value.",
      "Card effects that adjust, set, reroll, or steal Gigs are identified as enablers but are not applied to natural-roll odds.",
      "Street Cred comparisons against a Rival are listed but not scored without rival board state."
    ]
  };
}

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
  const outcomeCount = domains.reduce((count, domain) => count * domain.values.length, 1);
  const knownCostCopies = [...costCopies.values()].reduce((sum, count) => sum + count, 0);
  const valueCounts = (predicate: (value: number) => boolean) =>
    domains.map((domain) => domain.values.filter(predicate).length);
  const outcomeProduct = (counts: number[]) => counts.reduce((product, count) => product * count, 1);
  const possibleValues = [...new Set(domains.flatMap((domain) => domain.values))];
  const allValueCounts = new Map(
    possibleValues.map((value) => [value, outcomeProduct(valueCounts((candidate) => candidate === value))])
  );
  const allValueCount = (value: number) => allValueCounts.get(value) ?? 0;

  const expectedStreetCred = domains.reduce(
    (total, domain) => total + domain.values.reduce((sum, value) => sum + value, 0) / domain.values.length,
    0
  );
  const high8 = outcomeCount - outcomeProduct(valueCounts((value) => value < 8));
  const maximum = outcomeCount - outcomeProduct(
    domains.map((domain) => domain.values.filter((value) => value !== gigDieMaximum(domain.dieType)).length)
  );
  const minimum = outcomeCount - outcomeProduct(valueCounts((value) => value !== 1));
  const allEven = outcomeProduct(valueCounts((value) => value % 2 === 0));
  const allOdd = outcomeProduct(valueCounts((value) => value % 2 === 1));
  const parityMix = outcomeCount - allEven - allOdd;
  const exactlyOneDistinct = possibleValues.reduce((total, value) => total + allValueCount(value), 0);

  let exactlyTwoDistinct = 0;
  for (let leftIndex = 0; leftIndex < possibleValues.length; leftIndex += 1) {
    const left = possibleValues[leftIndex];
    for (let rightIndex = leftIndex + 1; rightIndex < possibleValues.length; rightIndex += 1) {
      const right = possibleValues[rightIndex];
      const usingOnlyPair = outcomeProduct(valueCounts((value) => value === left || value === right));
      exactlyTwoDistinct += usingOnlyPair - allValueCount(left) - allValueCount(right);
    }
  }

  let distinctStates = new Map<number, number>([[0, 1]]);
  for (const domain of domains) {
    const nextStates = new Map<number, number>();
    for (const [usedValues, count] of distinctStates) {
      for (const value of domain.values) {
        const bit = 1 << (value - 1);
        if ((usedValues & bit) !== 0) continue;
        const next = usedValues | bit;
        nextStates.set(next, (nextStates.get(next) ?? 0) + count);
      }
    }
    distinctStates = nextStates;
  }
  const allDistinct = [...distinctStates.values()].reduce((total, count) => total + count, 0);

  let streetCredDistribution = [1];
  for (const domain of domains) {
    const nextDistribution = Array.from(
      { length: streetCredDistribution.length + Math.max(...domain.values) },
      () => 0
    );
    for (let total = 0; total < streetCredDistribution.length; total += 1) {
      for (const value of domain.values) nextDistribution[total + value] += streetCredDistribution[total];
    }
    streetCredDistribution = nextDistribution;
  }
  const streetCred20 = streetCredDistribution.reduce(
    (count, outcomes, total) => count + (total >= 20 ? outcomes : 0),
    0
  );

  const expectedCostMatchDensity = knownCostCopies === 0
    ? null
    : [...costCopies].reduce((total, [cost, copies]) => {
      const misses = outcomeProduct(valueCounts((value) => value !== cost));
      return total + ((outcomeCount - misses) / outcomeCount) * copies;
    }, 0) / knownCostCopies;

  const probability = (count: number) => outcomeCount === 0 ? 0 : round(count / outcomeCount);
  return {
    outcomeCount,
    expectedStreetCred: round(expectedStreetCred),
    high8Probability: probability(high8),
    maximumProbability: probability(maximum),
    minimumProbability: probability(minimum),
    parityMixProbability: probability(parityMix),
    distinct2Probability: probability(outcomeCount - exactlyOneDistinct),
    distinct3Probability: probability(outcomeCount - exactlyOneDistinct - exactlyTwoDistinct),
    valuePairProbability: probability(outcomeCount - allDistinct),
    streetCred20Probability: probability(streetCred20),
    expectedCostMatchDensity: expectedCostMatchDensity == null ? null : round(expectedCostMatchDensity)
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

type RecommendedOrderCandidate = {
  order: DieType[];
  profiles: Array<GigRollProfile & { deckFitScore: number }>;
  score: number;
};

function compareRecommendedOrders(
  left: RecommendedOrderCandidate,
  right: RecommendedOrderCandidate
): number {
  const scoreDelta = left.score - right.score;
  if (scoreDelta !== 0) return scoreDelta;
  if (left.score === 0 && right.score === 0) return 0;

  for (let index = 0; index < Math.min(left.profiles.length, right.profiles.length); index += 1) {
    const fitDelta = left.profiles[index].deckFitScore - right.profiles[index].deckFitScore;
    if (fitDelta !== 0) return fitDelta;
    const credDelta = left.profiles[index].expectedStreetCred - right.profiles[index].expectedStreetCred;
    if (credDelta !== 0) return credDelta;
  }

  for (let index = 0; index < Math.min(left.order.length, right.order.length); index += 1) {
    const dieDelta = gigDieMaximum(left.order[index]) - gigDieMaximum(right.order[index]);
    if (dieDelta !== 0) return dieDelta;
  }

  return 0;
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
  let recommendedCandidate: RecommendedOrderCandidate | undefined;
  for (const order of orders) {
    const profiles: Array<GigRollProfile & { deckFitScore: number }> = order.map((_dieType, index) => {
      const profile = profileForDice(order.slice(0, index + 1));
      return { ...profile, deckFitScore: deckFitScore(profile, demands) };
    });
    const candidate = {
      order,
      profiles,
      score: round(profiles.reduce((sum, profile) => sum + profile.deckFitScore, 0))
    };
    if (!recommendedCandidate || compareRecommendedOrders(candidate, recommendedCandidate) > 0) {
      recommendedCandidate = candidate;
      recommendedOrder = order;
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

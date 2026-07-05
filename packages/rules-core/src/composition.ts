import type {
  Card,
  CardDatabase,
  CardId,
  CompositionBucket,
  CompositionNumberBucket,
  CompositionRoleBucket,
  CompositionSectionReport,
  CompositionVersionComparison,
  CompositionWarning,
  Deck,
  DeckCardEntry,
  DeckCompositionReport
} from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";

export const compositionRoleRegistryVersion = "composition-roles.v1";

interface RoleDefinition {
  id: string;
  label: string;
  description: string;
  matches(card: Card): boolean;
}

const roleDefinitions: RoleDefinition[] = [
  {
    id: "economy",
    label: "Economy",
    description: "Sellable cards or text that references selling, Eddies, or €$ costs.",
    matches: (card) => isSellableCard(card) || /\b(?:sell|edd(?:y|ie|ies)|€\$)\b/i.test(card.rules_text ?? "")
  },
  {
    id: "draw-search",
    label: "Draw / Search",
    description: "Text that draws cards, searches cards, or adds cards to hand.",
    matches: (card) => /\b(?:draw|search|add\b.*\bhand)\b/i.test(card.rules_text ?? "")
  },
  {
    id: "interaction",
    label: "Interaction",
    description: "Text that defeats, spends, discards, or otherwise disrupts rival cards.",
    matches: (card) => /\b(?:defeat|spend a rival|rival unit|discard)\b/i.test(card.rules_text ?? "")
  },
  {
    id: "protection",
    label: "Protection",
    description: "Blocker or text that reduces stealing or redirects attacks.",
    matches: (card) => card.keywords.includes("Blocker") || /\b(?:blocker|steals? 1 fewer|redirect)\b/i.test(card.rules_text ?? "")
  },
  {
    id: "gig-control",
    label: "Gig Control",
    description: "Text that adjusts, sets, swaps, increases, or steals Gigs.",
    matches: (card) => /\bgig/i.test(card.rules_text ?? "") && /\b(?:adjust|set|swap|increase|steal)\b/i.test(card.rules_text ?? "")
  },
  {
    id: "combat-power",
    label: "Combat Power",
    description: "Text that references power changes or combat scaling.",
    matches: (card) => /\b(?:power|\+\d+)\b/i.test(card.rules_text ?? "")
  }
];

function emptyBucket(label: string): CompositionBucket {
  return { label, copyCount: 0, uniqueCardCount: 0, cardIds: [] };
}

function addToBucket(buckets: Map<string, CompositionBucket>, label: string, cardId: CardId, copies: number) {
  const bucket = buckets.get(label) ?? emptyBucket(label);
  bucket.copyCount += copies;
  if (!bucket.cardIds.includes(cardId)) {
    bucket.uniqueCardCount += 1;
    bucket.cardIds.push(cardId);
  }
  buckets.set(label, bucket);
}

function sortedBuckets(buckets: Map<string, CompositionBucket>): CompositionBucket[] {
  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, cardIds: [...bucket.cardIds].sort() }))
    .sort((left, right) => right.copyCount - left.copyCount || left.label.localeCompare(right.label));
}

function sortedNumberBuckets(buckets: Map<string, CompositionNumberBucket>): CompositionNumberBucket[] {
  return [...buckets.values()]
    .map((bucket) => ({ ...bucket, cardIds: [...bucket.cardIds].sort() }))
    .sort((left, right) => {
      if (left.value === "none" && right.value === "none") return 0;
      if (left.value === "none") return 1;
      if (right.value === "none") return -1;
      return left.value - right.value;
    });
}

function addToNumberBucket(
  buckets: Map<string, CompositionNumberBucket>,
  value: number | null,
  cardId: CardId,
  copies: number
) {
  const key = value == null ? "none" : String(value);
  const bucket = buckets.get(key) ?? {
    label: value == null ? "None" : String(value),
    value: value ?? "none",
    copyCount: 0,
    uniqueCardCount: 0,
    cardIds: []
  };
  bucket.copyCount += copies;
  if (!bucket.cardIds.includes(cardId)) {
    bucket.uniqueCardCount += 1;
    bucket.cardIds.push(cardId);
  }
  buckets.set(key, bucket);
}

function addToRoleBucket(buckets: Map<string, CompositionRoleBucket>, role: RoleDefinition, cardId: CardId, copies: number) {
  const bucket = buckets.get(role.id) ?? {
    roleId: role.id,
    label: role.label,
    description: role.description,
    copyCount: 0,
    uniqueCardCount: 0,
    cardIds: []
  };
  bucket.copyCount += copies;
  if (!bucket.cardIds.includes(cardId)) {
    bucket.uniqueCardCount += 1;
    bucket.cardIds.push(cardId);
  }
  buckets.set(role.id, bucket);
}

function sectionReport(entries: DeckCardEntry[], cards: Map<CardId, Card>): CompositionSectionReport {
  const colors = new Map<string, CompositionBucket>();
  const types = new Map<string, CompositionBucket>();
  const classifications = new Map<string, CompositionBucket>();
  const keywords = new Map<string, CompositionBucket>();
  const costs = new Map<string, CompositionNumberBucket>();
  const powers = new Map<string, CompositionNumberBucket>();
  const rams = new Map<string, CompositionNumberBucket>();
  const roles = new Map<string, CompositionRoleBucket>();
  const unknownCardIds = new Set<CardId>();
  let cardCount = 0;
  let uniqueCardCount = 0;

  for (const entry of entries) {
    cardCount += entry.count;
    const card = cards.get(entry.cardId);
    if (!card) {
      unknownCardIds.add(entry.cardId);
      continue;
    }

    uniqueCardCount += 1;
    addToBucket(colors, card.color, card.id, entry.count);
    addToBucket(types, card.card_type, card.id, entry.count);
    for (const classification of card.classifications) addToBucket(classifications, classification, card.id, entry.count);
    for (const keyword of card.keywords) addToBucket(keywords, keyword, card.id, entry.count);
    addToNumberBucket(costs, card.cost, card.id, entry.count);
    addToNumberBucket(powers, card.power, card.id, entry.count);
    addToNumberBucket(rams, card.ram, card.id, entry.count);
    for (const role of roleDefinitions) {
      if (role.matches(card)) addToRoleBucket(roles, role, card.id, entry.count);
    }
  }

  return {
    cardCount,
    uniqueCardCount,
    colorBuckets: sortedBuckets(colors),
    typeBuckets: sortedBuckets(types),
    classificationBuckets: sortedBuckets(classifications),
    keywordBuckets: sortedBuckets(keywords),
    costBuckets: sortedNumberBuckets(costs),
    powerBuckets: sortedNumberBuckets(powers),
    ramBuckets: sortedNumberBuckets(rams),
    roleBuckets: sortedBuckets(roles) as CompositionRoleBucket[],
    unknownCardIds: [...unknownCardIds].sort()
  };
}

function bucketDelta(current: CompositionBucket[], previous: CompositionBucket[]): CompositionBucket[] {
  const labels = new Set([...current.map((bucket) => bucket.label), ...previous.map((bucket) => bucket.label)]);
  return [...labels].map((label) => {
    const currentBucket = current.find((bucket) => bucket.label === label);
    const previousBucket = previous.find((bucket) => bucket.label === label);
    return {
      label,
      copyCount: (currentBucket?.copyCount ?? 0) - (previousBucket?.copyCount ?? 0),
      uniqueCardCount: (currentBucket?.uniqueCardCount ?? 0) - (previousBucket?.uniqueCardCount ?? 0),
      cardIds: [...new Set([...(currentBucket?.cardIds ?? []), ...(previousBucket?.cardIds ?? [])])].sort()
    };
  }).filter((bucket) => bucket.copyCount !== 0 || bucket.uniqueCardCount !== 0)
    .sort((left, right) => Math.abs(right.copyCount) - Math.abs(left.copyCount) || left.label.localeCompare(right.label));
}

function versionComparisons(deck: Deck, currentMain: CompositionSectionReport, currentLegends: CompositionSectionReport, cards: Map<CardId, Card>): CompositionVersionComparison[] {
  return (deck.versions ?? []).map((version) => {
    const previousMain = sectionReport(version.main, cards);
    const previousLegends = sectionReport(version.legends, cards);
    return {
      versionId: version.id,
      versionName: version.name,
      createdAt: version.createdAt,
      mainCardDelta: currentMain.cardCount - previousMain.cardCount,
      legendCardDelta: currentLegends.cardCount - previousLegends.cardCount,
      colorDeltas: bucketDelta(currentMain.colorBuckets, previousMain.colorBuckets),
      typeDeltas: bucketDelta(currentMain.typeBuckets, previousMain.typeBuckets)
    };
  }).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function analyzeDeckComposition(deck: Deck, cardDb: CardDatabase): DeckCompositionReport {
  const cards = new Map(cardDb.cards.map((card) => [card.id, card]));
  const main = sectionReport(deck.main, cards);
  const legends = sectionReport(deck.legends, cards);
  const warnings: CompositionWarning[] = [];
  const unknownCardIds = [...new Set([...main.unknownCardIds, ...legends.unknownCardIds])].sort();

  if (unknownCardIds.length > 0) {
    warnings.push({
      code: "unknown-card",
      message: "Some deck entries are not present in the current card snapshot.",
      affectedCards: unknownCardIds
    });
  }

  const untaggedMainCardIds = deck.main.flatMap((entry) => {
    const card = cards.get(entry.cardId);
    if (!card) return [];
    return roleDefinitions.some((role) => role.matches(card)) ? [] : [card.id];
  });
  if (untaggedMainCardIds.length > 0) {
    warnings.push({
      code: "role-coverage",
      message: "Some main-deck cards do not match any current role tag; they remain visible in raw distributions.",
      affectedCards: [...new Set(untaggedMainCardIds)].sort()
    });
  }

  return {
    version: "deck-composition.v1",
    roleRegistryVersion: compositionRoleRegistryVersion,
    cardDataVersion: cardDb.metadata.cardDataVersion,
    main,
    legends,
    versionComparisons: versionComparisons(deck, main, legends, cards),
    warnings,
    assumptions: [
      "Composition counts use card copies, not draw probabilities.",
      "Role tags are deterministic text/metadata matches from a versioned local registry.",
      "Role tags are descriptive buckets, not deck-quality ratings.",
      "Cards that do not match a role tag remain represented in color, type, cost, power, RAM, keyword, and classification distributions."
    ]
  };
}

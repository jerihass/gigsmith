import type { Card, CardColor, CardType, RamCompatibilityStatus } from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";

export type CardColorFilter = "Any" | CardColor;
export type CardTypeFilter = "Any" | CardType;
export type NumberFilter = "Any" | string;
export type TextListFilter = "Any" | string;
export type SellableFilter = "Any" | "Sellable" | "Not Sellable";
export type DeckMembershipFilter = "All" | "In Deck" | "Not In Deck";
export type RamCompatibilityFilter = "All" | "Compatible" | "Incompatible";
export type CardSort = "Snapshot" | "Name" | "Cost" | "RAM" | "Power" | "Color" | "Type";

export interface CardFilters {
  query: string;
  color: CardColorFilter;
  type: CardTypeFilter;
  ram: NumberFilter;
  cost: NumberFilter;
  classification: TextListFilter;
  keyword: TextListFilter;
  sellable: SellableFilter;
}

export function numberFilterOptions(
  cards: Card[],
  field: "ram" | "cost"
): NumberFilter[] {
  const values = new Set<number>();
  let hasMissingValue = false;

  for (const card of cards) {
    const value = card[field];
    if (value === null) hasMissingValue = true;
    else values.add(value);
  }

  const options: NumberFilter[] = [
    "Any",
    ...[...values].sort((left, right) => left - right).map(String)
  ];
  if (hasMissingValue) options.push("none");
  return options;
}

export function textListFilterOptions(
  cards: Card[],
  field: "classifications" | "keywords"
): TextListFilter[] {
  const values = new Set<string>();
  for (const card of cards) {
    for (const value of card[field]) values.add(value);
  }
  return ["Any", ...[...values].sort((left, right) => left.localeCompare(right))];
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function fieldMatchesNumberFilter(value: number | null, filter: NumberFilter): boolean {
  if (filter === "Any") return true;
  if (filter === "none") return value === null;
  const expected = Number(filter);
  return Number.isFinite(expected) && value === expected;
}

function matchesQuery(card: Card, query: string): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const haystack = [
    card.display_name,
    card.name,
    card.slug,
    card.external_id,
    card.color,
    card.card_type,
    card.rules_text ?? "",
    card.classifications.join(" "),
    card.keywords.join(" ")
  ].join(" ");

  return normalize(haystack).includes(normalizedQuery);
}

export function filterCards(cards: Card[], filters: CardFilters): Card[] {
  return cards.filter((card) => {
    if (!matchesQuery(card, filters.query)) return false;
    if (filters.color !== "Any" && card.color !== filters.color) return false;
    if (filters.type !== "Any" && card.card_type !== filters.type) return false;
    if (!fieldMatchesNumberFilter(card.ram, filters.ram)) return false;
    if (!fieldMatchesNumberFilter(card.cost, filters.cost)) return false;
    if (filters.classification !== "Any" && !card.classifications.includes(filters.classification)) return false;
    if (filters.keyword !== "Any" && !card.keywords.includes(filters.keyword)) return false;
    if (filters.sellable === "Sellable" && !isSellableCard(card)) return false;
    if (filters.sellable === "Not Sellable" && isSellableCard(card)) return false;
    return true;
  });
}

export function filterCardsByRamCompatibility(
  cards: Card[],
  filter: RamCompatibilityFilter,
  compatibilityByCardId: ReadonlyMap<string, RamCompatibilityStatus>
): Card[] {
  if (filter === "All") return cards;
  const expectedStatus: RamCompatibilityStatus = filter === "Compatible" ? "compatible" : "incompatible";
  return cards.filter((card) => compatibilityByCardId.get(card.id) === expectedStatus);
}

function compareNullableNumber(left: number | null, right: number | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return left - right;
}

function compareCards(left: Card, right: Card, sort: CardSort): number {
  if (sort === "Name") return left.display_name.localeCompare(right.display_name);
  if (sort === "Cost") return compareNullableNumber(left.cost, right.cost);
  if (sort === "RAM") return compareNullableNumber(left.ram, right.ram);
  if (sort === "Power") return compareNullableNumber(left.power, right.power);
  if (sort === "Color") return left.color.localeCompare(right.color);
  if (sort === "Type") return left.card_type.localeCompare(right.card_type);
  return 0;
}

export function browseCards(
  cards: Card[],
  filters: CardFilters,
  membership: DeckMembershipFilter,
  sort: CardSort,
  deckCardIds: ReadonlySet<string>
): Card[] {
  const filtered = filterCards(cards, filters).filter((card) => {
    if (membership === "In Deck") return deckCardIds.has(card.id);
    if (membership === "Not In Deck") return !deckCardIds.has(card.id);
    return true;
  });
  if (sort === "Snapshot") return filtered;

  return filtered
    .map((card, index) => ({ card, index }))
    .sort((left, right) =>
      compareCards(left.card, right.card, sort) ||
      left.card.display_name.localeCompare(right.card.display_name) ||
      left.card.external_id.localeCompare(right.card.external_id) ||
      left.index - right.index
    )
    .map(({ card }) => card);
}

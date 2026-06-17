import type { Card, CardColor, CardType } from "@gigsmith/data-contracts";

export type CardColorFilter = "Any" | CardColor;
export type CardTypeFilter = "Any" | CardType;
export type NumberFilter = "Any" | string;

export interface CardFilters {
  query: string;
  color: CardColorFilter;
  type: CardTypeFilter;
  ram: NumberFilter;
  cost: NumberFilter;
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
    return true;
  });
}

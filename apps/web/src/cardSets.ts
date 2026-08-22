import type { Card, CardSet } from "@gigsmith/data-contracts";

export function cardSetKey(code: string): string {
  return code.trim().toLowerCase();
}

function isCardSet(value: unknown): value is CardSet {
  return typeof value === "object" && value !== null &&
    "code" in value && typeof value.code === "string" && value.code.trim().length > 0 &&
    "name" in value && typeof value.name === "string" && value.name.trim().length > 0;
}

/** Returns the current set first, followed by unique alternate-printing sets. */
export function cardSets(card: Pick<Card, "set" | "printings">): CardSet[] {
  const sets = [card.set];
  const seen = new Set([cardSetKey(card.set.code)]);
  const printings = Array.isArray(card.printings) ? card.printings : [];

  for (const printing of printings) {
    if (!isCardSet(printing.set) || seen.has(cardSetKey(printing.set.code))) continue;
    seen.add(cardSetKey(printing.set.code));
    sets.push(printing.set);
  }

  return sets;
}

export function alternateCardSets(card: Pick<Card, "set" | "printings">): CardSet[] {
  return cardSets(card).slice(1);
}

export function cardHasSet(card: Pick<Card, "set" | "printings">, code: string): boolean {
  const target = cardSetKey(code);
  if (cardSetKey(card.set.code) === target) return true;

  const printings = Array.isArray(card.printings) ? card.printings : [];
  return printings.some((printing) => isCardSet(printing.set) && cardSetKey(printing.set.code) === target);
}

/** Creates a short visual label while preserving the full set name in accessible text. */
export function cardSetBadgeLabel(set: CardSet): string {
  const code = set.code.trim();
  if (/^[A-Z0-9]{2,7}$/.test(code)) return code;

  const setTitle = set.name.split(/[\u2013\u2014-]/, 1)[0];
  const words = setTitle.match(/[A-Za-z0-9]+/g) ?? [];
  const significantWords = words.filter((word) => !["a", "an", "and", "of", "to"].includes(word.toLowerCase()));
  const label = significantWords.map((word) => word[0]).join("").toUpperCase();

  return label || code.slice(0, 5).toUpperCase();
}

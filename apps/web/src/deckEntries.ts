import type { DeckCardEntry } from "@gigsmith/data-contracts";

export function adjustDeckEntry(
  entries: DeckCardEntry[],
  cardId: string,
  delta: number
): DeckCardEntry[] {
  const existing = entries.find((entry) => entry.cardId === cardId);

  if (!existing) {
    return delta > 0 ? [...entries, { cardId, count: delta }] : entries;
  }

  const nextCount = existing.count + delta;
  if (nextCount <= 0) {
    return entries.filter((entry) => entry.cardId !== cardId);
  }

  return entries.map((entry) =>
    entry.cardId === cardId ? { ...entry, count: nextCount } : entry
  );
}

export function hasDeckEntry(entries: DeckCardEntry[], cardId: string): boolean {
  return entries.some((entry) => entry.cardId === cardId);
}

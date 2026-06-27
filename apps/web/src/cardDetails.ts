import type { Card } from "@gigsmith/data-contracts";

export interface CardDetailStat {
  label: string;
  value: string;
}

export const eddieSymbol = "€$";

function displayNumber(value: number | null): string {
  return value === null ? "—" : String(value);
}

export function displayPreviewNumber(value: number | null): string {
  return value === null ? "-" : String(value);
}

export function cardDetailStats(card: Card): CardDetailStat[] {
  return [
    { label: eddieSymbol, value: displayNumber(card.cost) },
    { label: "Power", value: displayNumber(card.power) },
    { label: "RAM", value: displayNumber(card.ram) },
    { label: "Rarity", value: card.rarity ?? "Unknown" }
  ];
}

export function cardDetailText(value: string | null, fallback: string): string {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
}

export function cardDetailTags(values: string[]): string {
  return values.length > 0 ? values.join(" · ") : "None";
}

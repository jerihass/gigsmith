import type { Card } from "@gigsmith/data-contracts";

export interface CardDetailStat {
  label: string;
  value: string;
}

export interface CardDetailTextPart {
  kind: "text" | "keyword";
  text: string;
  shape?: "convex" | "concave";
  tone?: "yellow" | "green" | "red" | "pink" | "neutral";
}

interface CardDetailKeywordPresentation {
  shape: "convex" | "concave";
  tone: "yellow" | "green" | "red" | "pink" | "neutral";
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

export function cardDetailTextParts(value: string | null, fallback: string): CardDetailTextPart[] {
  const text = cardDetailText(value, fallback);
  const parts: CardDetailTextPart[] = [];
  const keywordPattern = /\{([^{}]+)\}/g;
  let cursor = 0;
  for (const match of text.matchAll(keywordPattern)) {
    const index = match.index ?? 0;
    if (index > cursor) parts.push({ kind: "text", text: text.slice(cursor, index) });
    const keyword = match[1].trim();
    parts.push({ kind: "keyword", text: keyword, ...cardDetailKeywordPresentation(keyword) });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) parts.push({ kind: "text", text: text.slice(cursor) });
  return parts.length > 0 ? parts : [{ kind: "text", text }];
}

export function cardDetailKeywordPresentation(keyword: string): CardDetailKeywordPresentation {
  const normalized = keyword.toLowerCase();
  if (normalized === "attack") return { shape: "convex", tone: "green" };
  if (normalized === "defeated") return { shape: "convex", tone: "red" };
  if (normalized === "play" || normalized === "call") return { shape: "convex", tone: "yellow" };
  if (normalized === "quick" || normalized === "blocker") return { shape: "concave", tone: "pink" };
  if (normalized === "adrenaline" || normalized === "go solo") return { shape: "concave", tone: "yellow" };
  return { shape: "concave", tone: "neutral" };
}

export function cardDetailTags(values: string[]): string {
  return values.length > 0 ? values.join(" · ") : "None";
}

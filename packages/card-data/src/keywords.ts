import type { Card } from "@gigsmith/data-contracts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function bracedKeywordPattern(keyword: string): RegExp {
  const escaped = escapeRegExp(keyword).replace(/\\ /g, "\\s+");
  return new RegExp(`\\{\\s*${escaped}\\s*\\}`, "i");
}

function hasUnbracedKeyword(keyword: string, rulesText: string): boolean {
  if (keyword === "Bottom-deck") return /\bBottom-deck\b/i.test(rulesText);
  if (keyword === "Trash") {
    return /(?:^|[\n.]\s*|}\s*|\band\s+)trash\s+\d+\b/i.test(rulesText);
  }
  return false;
}

export function deriveKeywordsFromRulesText(rulesText: string | null, knownKeywords: readonly string[]): string[] {
  if (!rulesText) return [];
  return knownKeywords.filter((keyword) => (
    bracedKeywordPattern(keyword).test(rulesText) || hasUnbracedKeyword(keyword, rulesText)
  ));
}

export function enrichCardKeywords(card: Card, knownKeywords: readonly string[]): Card {
  const existing = new Set(card.keywords);
  deriveKeywordsFromRulesText(card.rules_text, knownKeywords).forEach((keyword) => existing.add(keyword));

  return {
    ...card,
    keywords: [
      ...knownKeywords.filter((keyword) => existing.has(keyword)),
      ...card.keywords.filter((keyword) => !knownKeywords.includes(keyword))
    ]
  };
}

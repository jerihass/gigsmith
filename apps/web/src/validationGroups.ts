import type { Card, ValidationIssue, ValidationResult } from "@gigsmith/data-contracts";

export type ValidationGroupId =
  | "deck-size"
  | "legends"
  | "copies"
  | "ram"
  | "format"
  | "unknown-cards"
  | "data-warnings"
  | "status";

export interface DisplayValidationIssue extends ValidationIssue {
  affectedCardLabels: string[];
}

export interface ValidationGroup {
  id: ValidationGroupId;
  title: string;
  issues: DisplayValidationIssue[];
}

const groupDefinitions: Array<{ id: ValidationGroupId; title: string; codes: string[] }> = [
  { id: "deck-size", title: "Deck Size", codes: ["main-deck-size"] },
  {
    id: "legends",
    title: "Legends",
    codes: ["legend-total", "legend-count", "legend-duplicate-name", "legend-section-type", "main-section-type"]
  },
  { id: "copies", title: "Copies", codes: ["max-copies", "invalid-count"] },
  { id: "ram", title: "RAM", codes: ["ram-limit"] },
  { id: "format", title: "Format", codes: ["unknown-format", "banned-card", "restricted-card"] },
  { id: "unknown-cards", title: "Unknown Cards", codes: ["unknown-card"] },
  {
    id: "data-warnings",
    title: "Data Warnings",
    codes: ["missing-ram", "ruleset-version-mismatch", "card-data-version-mismatch"]
  },
  { id: "status", title: "Status", codes: ["deck-legal"] }
];

const codeToGroup = new Map(
  groupDefinitions.flatMap((group) => group.codes.map((code) => [code, group.id] as const))
);

export function groupValidationResult(result: ValidationResult, cards: Card[]): ValidationGroup[] {
  const cardNames = new Map(cards.map((card) => [card.id, card.display_name]));
  const grouped = new Map<ValidationGroupId, DisplayValidationIssue[]>();
  const issues = [...result.errors, ...result.warnings, ...result.info];

  for (const issue of issues) {
    const groupId = codeToGroup.get(issue.code) ?? "data-warnings";
    const affectedCardLabels = [...new Set(
      issue.affectedCards.map((cardId) => cardNames.get(cardId) ?? cardId)
    )];
    const displayIssue: DisplayValidationIssue = { ...issue, affectedCardLabels };
    grouped.set(groupId, [...(grouped.get(groupId) ?? []), displayIssue]);
  }

  return groupDefinitions
    .filter((group) => grouped.has(group.id))
    .map((group) => ({ id: group.id, title: group.title, issues: grouped.get(group.id) ?? [] }));
}

import { describe, expect, it } from "vitest";
import type { ValidationGroup } from "./validationGroups";
import { summarizeMobileDeckHealth } from "./mobileDeckHealth";

describe("summarizeMobileDeckHealth", () => {
  it("keeps the four mobile dock metrics in stable priority order", () => {
    const groups: ValidationGroup[] = [
      {
        id: "ram",
        title: "RAM",
        issues: [{ code: "ram-limit", severity: "error", message: "RAM exceeded.", affectedCards: [], affectedCardLabels: [] }]
      },
      {
        id: "data-warnings",
        title: "Data Warnings",
        issues: [{ code: "card-data-version-mismatch", severity: "warning", message: "Snapshot mismatch.", affectedCards: [], affectedCardLabels: [] }]
      }
    ];

    expect(summarizeMobileDeckHealth(groups, false)).toEqual({
      legal: false,
      metrics: [
        { id: "deck-size", label: "Size", state: "good", issueCount: 0 },
        { id: "legends", label: "Legends", state: "good", issueCount: 0 },
        { id: "copies", label: "Copies", state: "good", issueCount: 0 },
        { id: "ram", label: "RAM", state: "error", issueCount: 1 }
      ],
      topIssue: {
        groupId: "ram",
        title: "RAM",
        message: "RAM exceeded.",
        severity: "error"
      }
    });
  });

  it("surfaces the first non-info grouped issue even when core metrics are clean", () => {
    const groups: ValidationGroup[] = [
      {
        id: "status",
        title: "Status",
        issues: [{ code: "deck-legal", severity: "info", message: "Deck is legal.", affectedCards: [], affectedCardLabels: [] }]
      },
      {
        id: "data-warnings",
        title: "Data Warnings",
        issues: [{ code: "ruleset-version-mismatch", severity: "warning", message: "Rules mismatch.", affectedCards: [], affectedCardLabels: [] }]
      }
    ];

    expect(summarizeMobileDeckHealth(groups, true).topIssue).toEqual({
      groupId: "data-warnings",
      title: "Data Warnings",
      message: "Rules mismatch.",
      severity: "warning"
    });
  });
});

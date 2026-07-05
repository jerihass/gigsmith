import { describe, expect, it } from "vitest";
import {
  compareCardSources,
  compareRulesSource,
  renderSourceChangeMarkdown
} from "./check-source-changes.mjs";

function localSnapshot() {
  return {
    metadata: { sourceCardCount: 2 },
    cards: [
      { external_id: "a", display_name: "Alpha", slug: "alpha", color: "Red", card_type: "Unit", ram: 1, cost: 2, power: 3, rules_text: "Go.", is_eddiable: true, legality: "legal" },
      { external_id: "b", display_name: "Beta", slug: "beta", color: "Blue", card_type: "Program", ram: 2, cost: 1, power: null, rules_text: null, is_eddiable: false, legality: "legal" }
    ]
  };
}

describe("source change reporting", () => {
  it("reports unchanged card sources", () => {
    const report = compareCardSources(localSnapshot(), { total: 2, items: localSnapshot().cards }, "2026-07-05T00:00:00Z");

    expect(report.changed).toBe(false);
    expect(report.added).toEqual([]);
    expect(report.removed).toEqual([]);
    expect(report.modified).toEqual([]);
  });

  it("reports added, removed, and modified card sources", () => {
    const report = compareCardSources(localSnapshot(), {
      total: 2,
      items: [
        { external_id: "a", display_name: "Alpha", slug: "alpha", color: "Green", card_type: "Unit", ram: 1, cost: 2, power: 3, rules_text: "Go.", is_eddiable: true, legality: "legal" },
        { external_id: "c", display_name: "Gamma", slug: "gamma", color: "Yellow", card_type: "Gear", ram: 1, cost: 1, power: null, rules_text: "New.", is_eddiable: true, legality: "legal" }
      ]
    });

    expect(report.changed).toBe(true);
    expect(report.added).toEqual([{ id: "c", displayName: "Gamma" }]);
    expect(report.removed).toEqual([{ id: "b", displayName: "Beta" }]);
    expect(report.modified).toEqual([{ id: "a", displayName: "Alpha", fields: ["color"] }]);
  });

  it("reports rules hash changes and renders a markdown summary", () => {
    const rules = compareRulesSource({ localHash: "abc", remoteHash: "def", etag: "\"v2\"", lastModified: "Sun, 05 Jul 2026 00:00:00 GMT" });
    expect(rules.changed).toBe(true);

    const markdown = renderSourceChangeMarkdown({
      checkedAt: "2026-07-05T00:00:00Z",
      changed: true,
      cards: {
        localCount: 2,
        remoteCount: 3,
        remoteTotal: 3,
        added: [{ id: "c", displayName: "Gamma" }],
        removed: [],
        modified: []
      },
      rules
    });
    expect(markdown).toContain("### Added Cards");
    expect(markdown).toContain("Gamma (c)");
    expect(markdown).toContain("Changes were detected");
  });
});

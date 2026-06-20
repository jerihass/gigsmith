import { describe, expect, it } from "vitest";
import { cyberpunkCardDb } from "./index";
import { cyberpunkGigRequirements } from "./gigRequirements";

describe("cyberpunkGigRequirements", () => {
  it("references only cards in the current snapshot", () => {
    const externalIds = new Set(cyberpunkCardDb.cards.map((card) => card.external_id));
    expect(cyberpunkGigRequirements.entries.every((entry) => externalIds.has(entry.externalCardId))).toBe(true);
  });

  it("curates the Green package as same-value pairs", () => {
    const pairCards = cyberpunkGigRequirements.entries
      .filter((entry) => entry.conditions.includes("value-pair"))
      .map((entry) => entry.externalCardId);
    expect(pairCards).toEqual(expect.arrayContaining([
      "cb-goro-takemura-vengeful-bodyguard",
      "cb-sandayu-oda-hanako-s-guardian",
      "cb-peace-offering"
    ]));
  });
});

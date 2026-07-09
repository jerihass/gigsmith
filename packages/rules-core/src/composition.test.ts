import { describe, expect, it } from "vitest";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import { cardBySlug, createValidDeck } from "@gigsmith/test-fixtures";
import { analyzeDeckComposition, compositionRoleRegistryVersion } from "./composition";

describe("analyzeDeckComposition", () => {
  function roleIdsForSlugs(slugs: string[]): string[] {
    const report = analyzeDeckComposition(
      createValidDeck({
        main: slugs.map((slug) => ({ cardId: cardBySlug(slug).id, count: 1 }))
      }),
      cyberpunkCardDb
    );
    return report.main.roleBuckets.map((bucket) => bucket.roleId).sort();
  }

  it("reports field distributions and role buckets for the golden deck", () => {
    const report = analyzeDeckComposition(createValidDeck(), cyberpunkCardDb);

    expect(report).toMatchObject({
      version: "deck-composition.v1",
      roleRegistryVersion: compositionRoleRegistryVersion,
      cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion,
      main: {
        cardCount: 40,
        uniqueCardCount: 14,
        unknownCardIds: []
      },
      legends: {
        cardCount: 3,
        uniqueCardCount: 3
      }
    });
    expect(report.main.colorBuckets.map(({ label, copyCount }) => ({ label, copyCount }))).toEqual([
      { label: "Red", copyCount: 21 },
      { label: "Yellow", copyCount: 15 },
      { label: "Green", copyCount: 4 }
    ]);
    expect(report.main.typeBuckets.map(({ label, copyCount }) => ({ label, copyCount }))).toEqual([
      { label: "Unit", copyCount: 31 },
      { label: "Gear", copyCount: 6 },
      { label: "Program", copyCount: 3 }
    ]);
    expect(report.main.roleBuckets.some((bucket) => bucket.roleId === "economy" && bucket.copyCount > 0)).toBe(true);
    expect(report.assumptions).toContain("Role tags are descriptive buckets, not deck-quality ratings.");
  });

  it("reports unknown cards without crashing", () => {
    const deck = createValidDeck({
      main: [{ cardId: "missing-card", count: 2 }]
    });

    const report = analyzeDeckComposition(deck, cyberpunkCardDb);

    expect(report.main.unknownCardIds).toEqual(["missing-card"]);
    expect(report.warnings).toContainEqual({
      code: "unknown-card",
      message: "Some deck entries are not present in the current card snapshot.",
      affectedCards: ["missing-card"]
    });
  });

  it("compares current deck composition to saved versions", () => {
    const swordwise = cardBySlug("swordwise-huscle");
    const deck = createValidDeck({
      versions: [{
        id: "v1",
        name: "Earlier",
        createdAt: "2026-07-01T00:00:00Z",
        deckName: "Earlier Deck",
        legends: createValidDeck().legends,
        main: [{ cardId: swordwise.id, count: 3 }],
        formatId: "open-guide",
        rulesetVersion: "ruleset.v1-printable-2026-06-19",
        cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion
      }]
    });

    const report = analyzeDeckComposition(deck, cyberpunkCardDb);

    expect(report.versionComparisons[0]).toMatchObject({
      versionId: "v1",
      versionName: "Earlier",
      mainCardDelta: 37,
      legendCardDelta: 0
    });
    expect(report.versionComparisons[0].typeDeltas.some((delta) => delta.label === "Program")).toBe(true);
  });

  it("does not derive roles from reminder text or baseline Gig stealing", () => {
    expect(roleIdsForSlugs(["secondhand-bombus"])).toEqual(["protection"]);
    expect(roleIdsForSlugs(["sketchy-ripper"])).toEqual(["draw-search"]);
    expect(roleIdsForSlugs(["evelyn-parker-scheming-siren"])).toEqual(["draw-search"]);
  });

  it("separates rival disruption, protection, Gig control, and power effects", () => {
    expect(roleIdsForSlugs(["satori-sword-of-saburo"])).toEqual(["draw-search", "economy"]);
    expect(roleIdsForSlugs(["reboot-optics"])).toEqual(["economy", "protection"]);
    expect(roleIdsForSlugs(["chrome-reverie"])).toEqual(["economy", "interaction"]);
    expect(roleIdsForSlugs(["take-control"])).toEqual(["draw-search", "economy", "interaction", "protection"]);
    expect(roleIdsForSlugs(["cyberpsychosis"])).toEqual(["economy", "interaction", "power-effects"]);
    expect(roleIdsForSlugs(["over-the-edge"])).toEqual(["economy", "interaction", "power-effects"]);
  });
});

import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { createGigMatch, gainGig } from "./gigMatch";
import { analyzeGigOdds } from "./gigOdds";

function cardId(externalId: string): string {
  const card = cyberpunkCardDb.cards.find((candidate) => candidate.external_id === externalId);
  if (!card) throw new Error(`Missing test card ${externalId}`);
  return card.id;
}

function deck(entries: Array<[string, number]>): Deck {
  return {
    id: "odds-deck",
    name: "Odds Deck",
    legends: [],
    main: entries.map(([externalId, count]) => ({ cardId: cardId(externalId), count })),
    formatId: cyberpunkRulesetV1Printable.defaultFormatId,
    rulesetVersion: cyberpunkRulesetV1Printable.version,
    cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion
  };
}

describe("Gig odds analysis", () => {
  it("computes exact single-die minimum, maximum, and expected Street Cred", () => {
    const report = analyzeGigOdds(deck([]), cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable);
    const d4 = report.turns.find((turn) => turn.dice.length === 1 && turn.dieType === "d4");

    expect(d4?.profile).toMatchObject({
      outcomeCount: 4,
      expectedStreetCred: 2.5,
      minimumProbability: 0.25,
      maximumProbability: 0.25,
      valuePairProbability: 0
    });
  });

  it("puts high-value dice first for a Red 8+ package", () => {
    const report = analyzeGigOdds(
      deck([["cb-kerry-eurodyne-the-last-rockerboy", 3], ["cb-carnage-at-the-colosseum", 3]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable
    );

    expect(report.recommendedOrder[0]).toBe("d12");
    expect(report.demands[0]).toMatchObject({ condition: "high-8", copies: 6, supported: true });
  });

  it("puts overlapping low-sided dice first for Green same-value pairs", () => {
    const report = analyzeGigOdds(
      deck([["cb-goro-takemura-vengeful-bodyguard", 1], ["cb-peace-offering", 3]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable
    );

    expect(new Set(report.recommendedOrder.slice(0, 2))).toEqual(new Set(["d4", "d6"]));
    expect(report.demands[0]).toMatchObject({ condition: "value-pair", copies: 4 });
  });

  it("scores next-die pair odds from the current match state", () => {
    let match = createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable);
    match = gainGig(match, "player:d4", 4, cyberpunkRulesetV1Printable).state;
    const report = analyzeGigOdds(
      deck([["cb-peace-offering", 3]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable,
      match
    );

    expect(report.nextDieOptions[0].dieType).toBe("d6");
    expect(report.nextDieOptions[0].profile.valuePairProbability).toBeCloseTo(1 / 6, 4);
    expect(report.nextDieOptions.find((option) => option.dieType === "d20")).toBeUndefined();
  });

  it("lists Rival-relative Street Cred cards without scoring them", () => {
    const report = analyzeGigOdds(
      deck([["cb-mt0d12-flathead", 3]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable
    );

    expect(report.demands[0]).toMatchObject({ condition: "street-cred-trail", supported: false });
    expect(report.unsupportedCardIds).toContain(cardId("cb-mt0d12-flathead"));
    expect(report.turns.every((turn) => turn.deckFitScore === 0)).toBe(true);
  });
});

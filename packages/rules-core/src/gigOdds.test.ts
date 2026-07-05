import { describe, expect, it } from "vitest";
import { cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { advanceGigMatchTurn, createGigMatch, gainGig } from "./gigMatch";
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

  it("preserves exact probabilities across multiple dice", () => {
    const report = analyzeGigOdds(deck([]), cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable);
    const turn = report.turns.find((candidate) => candidate.turn === 2);

    expect(turn?.dice).toEqual(["d4", "d6"]);
    expect(turn?.profile).toMatchObject({
      outcomeCount: 24,
      expectedStreetCred: 6,
      high8Probability: 0,
      maximumProbability: 0.375,
      minimumProbability: 0.375,
      parityMixProbability: 0.5,
      distinct2Probability: 0.8333,
      distinct3Probability: 0,
      valuePairProbability: 0.1667,
      streetCred20Probability: 0
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

  it("breaks equal Street Cred recommendation scores toward higher early dice", () => {
    const report = analyzeGigOdds(
      {
        ...deck([["cb-minotaur", 1]]),
        legends: [{ cardId: cardId("cb-yorinobu-arasaka-embracing-destruction"), count: 1 }]
      },
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable
    );

    expect(report.recommendedOrder.slice(0, 2)).toEqual(["d12", "d10"]);
    expect(report.demands).toEqual(expect.arrayContaining([
      expect.objectContaining({ condition: "street-cred-20", supported: true }),
      expect.objectContaining({ condition: "street-cred-lead", supported: false })
    ]));
  });

  it("does not use high-die tie breaking for Blue minimum goals", () => {
    const report = analyzeGigOdds(
      deck([["cb-chrome-reverie", 3], ["cb-alt-cunningham-soulkiller-architect", 1]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable
    );

    expect(report.recommendedOrder[0]).toBe("d4");
    expect(report.demands[0]).toMatchObject({ condition: "minimum", supported: true });
  });

  it("keeps Yellow different-value goals on high-variety dice instead of low-only tie breaking", () => {
    const report = analyzeGigOdds(
      deck([["cb-afterparty-at-lizzie-s", 3], ["cb-zetatech-faceplate", 1]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable
    );

    expect(report.recommendedOrder.slice(0, 2)).toEqual(["d12", "d10"]);
    expect(report.demands).toEqual(expect.arrayContaining([
      expect.objectContaining({ condition: "distinct-2", supported: true }),
      expect.objectContaining({ condition: "distinct-3", supported: true })
    ]));
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

  it("scores next-die distinct-value odds from current friendly Gigs", () => {
    let match = createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable);
    match = gainGig(match, "player:d4", 4, cyberpunkRulesetV1Printable).state;
    const report = analyzeGigOdds(
      deck([["cb-afterparty-at-lizzie-s", 3]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable,
      match
    );

    const d6 = report.nextDieOptions.find((option) => option.dieType === "d6");
    expect(d6?.profile.distinct2Probability).toBeCloseTo(5 / 6, 4);
    expect(d6?.profile.distinct3Probability).toBe(0);
  });

  it("does not count opponent-controlled Gig values for the active player's next die", () => {
    let match = createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable);
    match = gainGig(match, "player:d12", 8, cyberpunkRulesetV1Printable).state;
    match = advanceGigMatchTurn(match, cyberpunkRulesetV1Printable).state;

    const report = analyzeGigOdds(
      deck([["cb-carnage-at-the-colosseum", 3], ["cb-peace-offering", 3]]),
      cyberpunkCardDb,
      cyberpunkGigRequirements,
      cyberpunkRulesetV1Printable,
      match,
      "rival"
    );

    const d4 = report.nextDieOptions.find((option) => option.dieType === "d4");
    expect(d4?.profile.high8Probability).toBe(0);
    expect(d4?.profile.valuePairProbability).toBe(0);
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

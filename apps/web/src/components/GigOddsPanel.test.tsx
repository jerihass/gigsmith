import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { createGigMatch } from "@gigsmith/rules-core";
import { GigOddsPanel } from "./GigOddsPanel";

function cardId(externalId: string): string {
  const card = cyberpunkCardDb.cards.find((candidate) => candidate.external_id === externalId);
  if (!card) throw new Error(`Missing test card ${externalId}`);
  return card.id;
}

describe("GigOddsPanel", () => {
  it("explains why next fixer dice are recommended", () => {
    const deck: Deck = {
      id: "gig-reason-deck",
      name: "Gig Reason Deck",
      legends: [{ cardId: cardId("cb-yorinobu-arasaka-embracing-destruction"), count: 1 }],
      main: [],
      formatId: cyberpunkRulesetV1Printable.defaultFormatId,
      rulesetVersion: cyberpunkRulesetV1Printable.version,
      cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion
    };
    const match = createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable);

    const markup = renderToStaticMarkup(<GigOddsPanel deck={deck} cardDb={cyberpunkCardDb} match={match} onMatchChange={() => {}} />);

    expect(markup).toContain("Why: 20 Street Cred");
    expect(markup).toContain("Deck fit");
  });
});

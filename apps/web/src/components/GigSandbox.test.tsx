import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { createGigMatch, gainGig, advanceGigMatchTurn } from "@gigsmith/rules-core";
import { GigSandbox } from "./GigSandbox";

const ruleset = cyberpunkRulesetV1Printable;

describe("GigSandbox", () => {
  it("renders player boards with Fixer and controlled Gig zones", () => {
    let match = createGigMatch(["player", "rival"], "player", ruleset);
    match = gainGig(match, "player:d4", 3, ruleset).state;
    match = advanceGigMatchTurn(match, ruleset).state;

    const markup = renderToStaticMarkup(<GigSandbox match={match} onChange={() => {}} />);

    expect(markup).toContain("Gig Match Tracker");
    expect(markup).toContain("Fixer");
    expect(markup).toContain("Controlled Gigs");
    expect(markup).toContain("Roll &amp; gain");
    expect(markup).toContain("Steal for Rival");
    expect(markup).not.toContain("original dice");
  });
});

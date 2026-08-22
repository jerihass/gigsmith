import { describe, expect, it } from "vitest";
import type { Card } from "@gigsmith/data-contracts";
import { alternateCardSets, cardHasSet, cardSetBadgeLabel, cardSetKey, cardSets } from "./cardSets";

const primarySet = { code: "welcometonightcityretail", name: "Welcome to Night City — Retail" };
const alternateSet = { code: "ALT", name: "Alternate Set" };
const promoSet = { code: "PRM01", name: "Set 1 Promos" };

const multiSetCard = {
  set: primarySet,
  printings: [
    { printing_id: "current", set: primarySet },
    { printing_id: "alternate", set: alternateSet },
    { printing_id: "alternate-duplicate", set: alternateSet },
    { printing_id: "promo", set: promoSet }
  ]
} satisfies Pick<Card, "set" | "printings">;

describe("card set helpers", () => {
  it("keeps the current set first and removes duplicate alternate printings", () => {
    expect(cardSets(multiSetCard)).toEqual([primarySet, alternateSet, promoSet]);
    expect(alternateCardSets(multiSetCard)).toEqual([alternateSet, promoSet]);
  });

  it("matches the current and alternate set codes without case sensitivity", () => {
    expect(cardHasSet(multiSetCard, "welcometonightcityretail")).toBe(true);
    expect(cardHasSet(multiSetCard, "alt")).toBe(true);
    expect(cardHasSet(multiSetCard, "PRM01")).toBe(true);
    expect(cardHasSet(multiSetCard, "missing")).toBe(false);
  });

  it("normalizes codes for snapshot-wide set deduplication", () => {
    expect(cardSetKey(" Alt ")).toBe("alt");
  });

  it("uses official short codes when available and derives readable compact labels otherwise", () => {
    expect(cardSetBadgeLabel(promoSet)).toBe("PRM01");
    expect(cardSetBadgeLabel(primarySet)).toBe("WNC");
  });
});

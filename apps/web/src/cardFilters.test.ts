import { describe, expect, it } from "vitest";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import budgets from "../performance-budgets.json" with { type: "json" };
import { browseCards, filterCards, numberFilterOptions } from "./cardFilters";

const defaultFilters = {
  query: "",
  color: "Any" as const,
  type: "Any" as const,
  ram: "Any",
  cost: "Any"
};

describe("filterCards", () => {
  it("filters by text across rules text and classifications", () => {
    const quickHackCards = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      query: "quickhack"
    });

    expect(quickHackCards.map((card) => card.display_name)).toContain("Floor It");
  });

  it("filters by color and type", () => {
    const redLegends = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      color: "Red",
      type: "Legend"
    });

    expect(redLegends.every((card) => card.color === "Red" && card.card_type === "Legend")).toBe(true);
    expect(redLegends.length).toBeGreaterThan(0);
  });

  it("filters by RAM and cost values", () => {
    const cards = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      ram: "2",
      cost: "1"
    });

    expect(cards.every((card) => card.ram === 2 && card.cost === 1)).toBe(true);
  });
});

describe("numberFilterOptions", () => {
  it("derives sorted values and missing-value support from card data", () => {
    expect(numberFilterOptions(cyberpunkCardDb.cards, "cost")).toContain("9");
    expect(numberFilterOptions(cyberpunkCardDb.cards, "cost")).toContain("none");
  });

  it("keeps RAM and cost options independent", () => {
    const cards = cyberpunkCardDb.cards.slice(0, 1).map((card) => ({
      ...card,
      ram: 2,
      cost: 9
    }));

    expect(numberFilterOptions(cards, "ram")).toEqual(["Any", "2"]);
    expect(numberFilterOptions(cards, "cost")).toEqual(["Any", "9"]);
  });
});

describe("browseCards", () => {
  const cards = cyberpunkCardDb.cards;
  const selectedIds = new Set([cards[0].id, cards[4].id]);

  it("filters by active-deck membership", () => {
    expect(browseCards(cards, defaultFilters, "In Deck", "Snapshot", selectedIds).map((card) => card.id))
      .toEqual([cards[0].id, cards[4].id]);
    expect(browseCards(cards, defaultFilters, "Not In Deck", "Snapshot", selectedIds))
      .toHaveLength(cards.length - 2);
  });

  it.each([
    ["Name", (card: typeof cards[number]) => card.display_name],
    ["Color", (card: typeof cards[number]) => card.color],
    ["Type", (card: typeof cards[number]) => card.card_type]
  ] as const)("sorts by %s", (sort, value) => {
    const sorted = browseCards(cards, defaultFilters, "All", sort, selectedIds);
    const values = sorted.map(value);
    expect(values).toEqual([...values].sort((left, right) => left.localeCompare(right)));
  });

  it.each(["Cost", "RAM", "Power"] as const)("sorts known %s values before missing values", (sort) => {
    const sorted = browseCards(cards, defaultFilters, "All", sort, selectedIds);
    const field = sort.toLowerCase() as "cost" | "ram" | "power";
    const values = sorted.map((card) => card[field]);
    const known = values.filter((value): value is number => value !== null);
    expect(known).toEqual([...known].sort((left, right) => left - right));
    expect(values.slice(known.length).every((value) => value === null)).toBe(true);
  });

  it("keeps filter computation responsive at the expected card-count target", () => {
    const expandedCards = Array.from({ length: budgets.expectedCardCountTarget }, (_, index) => {
      const source = cards[index % cards.length];
      return {
        ...source,
        id: `${source.id}-${index}`,
        external_id: `${source.external_id}-${index}`,
        slug: `${source.slug}-${index}`
      };
    });
    const iterations = 50;
    const startedAt = performance.now();
    for (let iteration = 0; iteration < iterations; iteration += 1) {
      expect(browseCards(expandedCards, defaultFilters, "All", "Name", selectedIds)).toHaveLength(expandedCards.length);
    }
    const averageMs = (performance.now() - startedAt) / iterations;
    console.log(`[performance] ${budgets.expectedCardCountTarget}-card filter computation averaged ${averageMs.toFixed(3)} ms`);

    expect(averageMs).toBeLessThanOrEqual(budgets.interactions.filterComputationAtTargetMs);
  });
});

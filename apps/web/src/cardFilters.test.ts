import { describe, expect, it } from "vitest";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import { isSellableCard } from "@gigsmith/data-contracts";
import budgets from "../performance-budgets.json" with { type: "json" };
import { browseCards, cardSetFilterOptions, filterCards, filterCardsByRamCompatibility, numberFilterOptions, textListFilterOptions } from "./cardFilters";

const defaultFilters = {
  query: "",
  color: "Any" as const,
  type: "Any" as const,
  ram: "Any",
  cost: "Any",
  set: "Any",
  classification: "Any",
  keyword: "Any",
  sellable: "Any" as const
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

  it("filters by set code", () => {
    const setCode = cyberpunkCardDb.cards[0].set.code;
    const cards = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      set: setCode
    });

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.set.code === setCode)).toBe(true);
  });

  it("filters once by an alternate printing set and includes set names in search", () => {
    const alternateSetCard = {
      ...cyberpunkCardDb.cards[0],
      set: { code: "PRIMARY", name: "Primary Set" },
      printings: [
        { printing_id: "current", set: { code: "PRIMARY", name: "Primary Set" } },
        { printing_id: "alternate", set: { code: "ALT", name: "Alternate Set" } }
      ]
    };
    const otherCard = {
      ...cyberpunkCardDb.cards[1],
      set: { code: "OTHER", name: "Other Set" },
      printings: []
    };

    expect(filterCards([alternateSetCard, otherCard], {
      ...defaultFilters,
      set: "ALT"
    })).toEqual([alternateSetCard]);
    expect(filterCards([alternateSetCard, otherCard], {
      ...defaultFilters,
      query: "alternate set"
    })).toEqual([alternateSetCard]);
  });

  it("filters by sellable status", () => {
    const sellable = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      sellable: "Sellable"
    });
    const notSellable = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      sellable: "Not Sellable"
    });

    expect(sellable.length).toBeGreaterThan(0);
    expect(notSellable.length).toBeGreaterThan(0);
    expect(sellable.every(isSellableCard)).toBe(true);
    expect(notSellable.every((card) => !isSellableCard(card))).toBe(true);
  });

  it("filters by classification and keyword", () => {
    const classifiedCards = filterCards(cyberpunkCardDb.cards, {
      ...defaultFilters,
      classification: "Netrunner"
    });
    const keywordCards = filterCards([
      { ...cyberpunkCardDb.cards[0], keywords: ["Quick"] },
      { ...cyberpunkCardDb.cards[1], keywords: [] }
    ], {
      ...defaultFilters,
      keyword: "Quick"
    });

    expect(classifiedCards.length).toBeGreaterThan(0);
    expect(classifiedCards.every((card) => card.classifications.includes("Netrunner"))).toBe(true);
    expect(keywordCards).toHaveLength(1);
    expect(keywordCards[0].keywords).toContain("Quick");
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

describe("textListFilterOptions", () => {
  it("derives sorted classifications and keywords from card data", () => {
    expect(textListFilterOptions(cyberpunkCardDb.cards, "classifications")).toContain("Netrunner");
    expect(textListFilterOptions([
      { ...cyberpunkCardDb.cards[0], keywords: ["Quick"] },
      { ...cyberpunkCardDb.cards[1], keywords: ["Adrenaline"] }
    ], "keywords")).toEqual(["Any", "Adrenaline", "Quick"]);
  });
});

describe("cardSetFilterOptions", () => {
  it("returns readable, sorted set names with stable code values", () => {
    const options = cardSetFilterOptions(cyberpunkCardDb.cards);
    const nonAnyOptions = options.slice(1);

    expect(options[0]).toEqual({ value: "Any", label: "Any" });
    expect(nonAnyOptions.map((option) => option.label)).toEqual(
      [...nonAnyOptions].map((option) => option.label).sort((left, right) => left.localeCompare(right))
    );
    expect(nonAnyOptions.every((option) => option.value !== "Any")).toBe(true);
  });

  it("includes alternate-printing sets without repeating the current set", () => {
    const card = {
      ...cyberpunkCardDb.cards[0],
      set: { code: "PRIMARY", name: "Primary Set" },
      printings: [
        { set: { code: "PRIMARY", name: "Primary Set" } },
        { set: { code: "ALT", name: "Alternate Set" } }
      ]
    };

    expect(cardSetFilterOptions([card])).toEqual([
      { value: "Any", label: "Any" },
      { value: "ALT", label: "Alternate Set" },
      { value: "PRIMARY", label: "Primary Set" }
    ]);
  });

  it("uses the first stable source code when equivalent codes differ only by case", () => {
    const card = {
      ...cyberpunkCardDb.cards[0],
      set: { code: "ALT", name: "Alternate Set" },
      printings: [{ set: { code: "alt", name: "Alternate Set" } }]
    };

    expect(cardSetFilterOptions([card])).toEqual([
      { value: "Any", label: "Any" },
      { value: "ALT", label: "Alternate Set" }
    ]);
  });
});

describe("filterCardsByRamCompatibility", () => {
  it("filters explicit compatible and incompatible statuses without treating unknowns or Legends as compatible", () => {
    const cards = cyberpunkCardDb.cards.slice(0, 4);
    const statuses = new Map([
      [cards[0].id, "not-applicable" as const],
      [cards[1].id, "compatible" as const],
      [cards[2].id, "incompatible" as const],
      [cards[3].id, "unknown" as const]
    ]);

    expect(filterCardsByRamCompatibility(cards, "Compatible", statuses)).toEqual([cards[1]]);
    expect(filterCardsByRamCompatibility(cards, "Incompatible", statuses)).toEqual([cards[2]]);
    expect(filterCardsByRamCompatibility(cards, "All", statuses)).toEqual(cards);
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

import { describe, expect, it } from "vitest";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import { filterCards, numberFilterOptions } from "./cardFilters";

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

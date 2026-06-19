import { describe, expect, it } from "vitest";
import type { Card } from "@gigsmith/data-contracts";
import { cardDetailStats, cardDetailTags, cardDetailText } from "./cardDetails";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    external_id: "CP-001",
    name: "Test Card",
    subname: null,
    display_name: "Test Card",
    slug: "test-card",
    rules_text: null,
    flavor_text: null,
    printing_id: "print-1",
    set: { code: "CORE", name: "Core" },
    rarity: null,
    color: "Red",
    card_type: "Unit",
    is_eddiable: false,
    classifications: [],
    keywords: [],
    cost: null,
    power: null,
    ram: null,
    artist: null,
    print_number: null,
    printings: [],
    selected_printing_id: null,
    legality: "legal",
    ...overrides
  };
}

describe("card detail formatting", () => {
  it("formats numeric stats and missing values", () => {
    expect(cardDetailStats(card({ cost: 2, power: 5, ram: 1, rarity: "Rare" }))).toEqual([
      { label: "Cost", value: "2" },
      { label: "Power", value: "5" },
      { label: "RAM", value: "1" },
      { label: "Rarity", value: "Rare" }
    ]);
    expect(cardDetailStats(card()).map((stat) => stat.value)).toEqual(["—", "—", "—", "Unknown"]);
  });

  it("provides readable text and tag fallbacks", () => {
    expect(cardDetailText("  Draw 1.  ", "None")).toBe("Draw 1.");
    expect(cardDetailText("   ", "None")).toBe("None");
    expect(cardDetailTags(["Arasaka", "Solo"])).toBe("Arasaka · Solo");
    expect(cardDetailTags([])).toBe("None");
  });
});

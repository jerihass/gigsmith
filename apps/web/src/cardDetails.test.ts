import { describe, expect, it } from "vitest";
import type { Card } from "@gigsmith/data-contracts";
import {
  cardDetailKeywordPresentation,
  cardDetailStats,
  cardDetailTags,
  cardDetailText,
  cardDetailTextParts,
  displayPreviewNumber
} from "./cardDetails";

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
      { label: "€$", value: "2" },
      { label: "Power", value: "5" },
      { label: "RAM", value: "1" },
      { label: "Rarity", value: "Rare" }
    ]);
    expect(cardDetailStats(card()).map((stat) => stat.value)).toEqual(["—", "—", "—", "Unknown"]);
  });

  it("formats compact preview numbers", () => {
    expect(displayPreviewNumber(2)).toBe("2");
    expect(displayPreviewNumber(null)).toBe("-");
  });

  it("provides readable text and tag fallbacks", () => {
    expect(cardDetailText("  Draw 1.  ", "None")).toBe("Draw 1.");
    expect(cardDetailText("   ", "None")).toBe("None");
    expect(cardDetailTags(["Arasaka", "Solo"])).toBe("Arasaka · Solo");
    expect(cardDetailTags([])).toBe("None");
  });

  it("splits rules text brace keywords for card detail rendering", () => {
    expect(cardDetailTextParts("{Call} Trash 3.\n{Go Solo} reminder", "None")).toEqual([
      { kind: "keyword", text: "Call", shape: "convex", tone: "yellow" },
      { kind: "text", text: " Trash 3.\n" },
      { kind: "keyword", text: "Go Solo", shape: "concave", tone: "yellow" },
      { kind: "text", text: " reminder" }
    ]);
    expect(cardDetailTextParts("   ", "None")).toEqual([{ kind: "text", text: "None" }]);
  });

  it("maps rulebook timing triggers and keywords to chip presentations", () => {
    expect(cardDetailKeywordPresentation("Play")).toEqual({ shape: "convex", tone: "yellow" });
    expect(cardDetailKeywordPresentation("Attack")).toEqual({ shape: "convex", tone: "green" });
    expect(cardDetailKeywordPresentation("Defeated")).toEqual({ shape: "convex", tone: "red" });
    expect(cardDetailKeywordPresentation("Quick")).toEqual({ shape: "concave", tone: "pink" });
    expect(cardDetailKeywordPresentation("Blocker")).toEqual({ shape: "concave", tone: "pink" });
    expect(cardDetailKeywordPresentation("Spend")).toEqual({ shape: "concave", tone: "neutral" });
  });
});

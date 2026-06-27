import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Card } from "@gigsmith/data-contracts";
import { CardPreviewIdentity, CardPreviewStats } from "./CardPreviewStats";

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

describe("CardPreviewStats", () => {
  it("renders compact color and type identity", () => {
    const markup = renderToStaticMarkup(<CardPreviewIdentity card={card({ color: "Blue", card_type: "Program" })} />);

    expect(markup).toContain("Blue Program");
    expect(markup).toContain("data-color=\"blue\"");
    expect(markup).toContain("aria-hidden=\"true\">·</span>");
    expect(markup).toContain("Program");
  });

  it("renders compact card stats with icons for RAM and power", () => {
    const markup = renderToStaticMarkup(<CardPreviewStats card={card({ cost: 2, power: 5, ram: 1, is_eddiable: true })} />);

    expect(markup).toContain("RAM 1");
    expect(markup).toContain("€$ 2");
    expect(markup).toContain("Power");
    expect(markup).toContain("lucide-memory-stick");
    expect(markup).toContain("lucide-swords");
    expect(markup).toContain("class=\"sellable-badge\"");
    expect(markup).toContain("title=\"Sellable\"");
    expect(markup).toContain("class=\"visually-hidden\">Sellable</span>");
    expect(markup).toContain(">5</span>");
  });

  it("renders missing preview stats as dashes", () => {
    const markup = renderToStaticMarkup(<CardPreviewStats card={card()} />);

    expect(markup).toContain("RAM -");
    expect(markup).toContain("€$ -");
    expect(markup).toContain("Power -");
  });
});

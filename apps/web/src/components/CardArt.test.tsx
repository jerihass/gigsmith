import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Card } from "@gigsmith/data-contracts";
import { CardArt } from "./CardArt";

function card(source_image_url?: string): Card {
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
    source_image_url,
    color: "Red",
    card_type: "Unit",
    is_eddiable: false,
    classifications: [],
    keywords: [],
    cost: 1,
    power: 1,
    ram: 1,
    artist: null,
    print_number: null,
    printings: [],
    selected_printing_id: null,
    legality: "legal"
  };
}

describe("CardArt", () => {
  it("renders no image or placeholder while disabled", () => {
    expect(renderToStaticMarkup(<CardArt card={card("https://images.example/card.webp")} enabled={false} variant="thumbnail" />)).toBe("");
  });

  it("renders a stable loading surface for enabled artwork", () => {
    const markup = renderToStaticMarkup(<CardArt card={card("https://images.example/card.webp")} enabled variant="detail" />);
    expect(markup).toContain("Loading art");
    expect(markup).toContain("loading=\"lazy\"");
    expect(markup).toContain("referrerPolicy=\"no-referrer\"");
    expect(markup).toContain("Test Card card art");
  });

  it("renders a text fallback when no stable artwork is available", () => {
    const markup = renderToStaticMarkup(<CardArt card={card()} enabled variant="thumbnail" />);
    expect(markup).not.toContain("<img");
    expect(markup).toContain("No art");
    expect(markup).toContain("Artwork unavailable for Test Card");
  });
});

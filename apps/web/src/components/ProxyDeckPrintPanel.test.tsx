import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { Card, CardDatabase, Deck } from "@gigsmith/data-contracts";
import { ProxyDeckPrintPanel, proxyDeckCards } from "./ProxyDeckPrintPanel";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    external_id: "CP-001",
    name: "Test Card",
    subname: null,
    display_name: "Test Card",
    slug: "test-card",
    rules_text: "{Play} Draw 1.",
    flavor_text: null,
    printing_id: "print-1",
    set: { code: "CORE", name: "Core" },
    rarity: "Common",
    color: "Red",
    card_type: "Unit",
    is_eddiable: true,
    classifications: ["Solo"],
    keywords: ["Quick"],
    cost: 2,
    power: 3,
    ram: 1,
    artist: null,
    print_number: "007",
    printings: [],
    selected_printing_id: null,
    legality: "legal",
    ...overrides
  };
}

function cardDb(cards: Card[]): CardDatabase {
  return {
    metadata: {
      game: "cyberpunk",
      sourceName: "Test",
      sourceUrl: "https://example.test/cards",
      sourceRetrievedAt: "2026-07-05T00:00:00.000Z",
      cardDataVersion: "cards-test",
      sourceCardCount: cards.length,
      notes: "test"
    },
    cards
  };
}

function deck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: "deck-1",
    name: "Proxy Test",
    legends: [{ cardId: "legend-1", count: 1 }],
    main: [{ cardId: "card-1", count: 2 }],
    formatId: "casual",
    rulesetVersion: "rules",
    cardDataVersion: "cards-test",
    ...overrides
  };
}

describe("ProxyDeckPrintPanel", () => {
  it("expands one proxy per physical deck copy and reports missing cards", () => {
    const result = proxyDeckCards(deck({ main: [{ cardId: "card-1", count: 3 }, { cardId: "missing", count: 2 }] }), cardDb([
      card({ id: "legend-1", display_name: "Legend", card_type: "Legend", cost: null, power: null, ram: 2 }),
      card()
    ]));

    expect(result.copies).toHaveLength(4);
    expect(result.copies.map((copy) => copy.copyNumber)).toEqual([1, 1, 2, 3]);
    expect(result.missing).toEqual([{ cardId: "missing", deckSection: "Main", count: 2 }]);
  });

  it("renders legible playable fields without artwork", () => {
    const markup = renderToStaticMarkup(<ProxyDeckPrintPanel deck={deck()} cardDb={cardDb([
      card({ id: "legend-1", display_name: "Legend Card", card_type: "Legend", color: "Blue", cost: null, power: null, ram: 2 }),
      card()
    ])} />);

    expect(markup).toContain("Printable Proxy Deck");
    expect(markup).toContain("Black and white");
    expect(markup).toContain("Test Card");
    expect(markup).toContain("Red Unit");
    expect(markup).toContain("RAM");
    expect(markup).toContain("€$");
    expect(markup).toContain("PWR");
    expect(markup).toContain("{Play} Draw 1.");
    expect(markup).toContain("Quick");
    expect(markup).toContain("Solo");
    expect(markup).toContain("Sell €$");
    expect(markup).toContain("Proxy sheet page 1");
    expect(markup).not.toContain("<img");
  });
});

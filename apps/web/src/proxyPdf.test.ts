import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { Card } from "@gigsmith/data-contracts";
import { generateProxyDeckPdf, proxyPdfFileName } from "./proxyPdf";
import type { ProxyCardCopy } from "./components/ProxyDeckPrintPanel";

function card(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    external_id: "CP-001",
    name: "Test Card",
    subname: null,
    display_name: "V — StreetKid",
    slug: "test-card",
    rules_text: "{Play} Gain 1 ☆. Pay 2 €$.",
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

function copy(index: number): ProxyCardCopy {
  return {
    card: card({ id: `card-${index}`, display_name: `Proxy ${index}` }),
    deckSection: "Main",
    copyNumber: 1,
    totalCopies: 1
  };
}

describe("proxy PDF export", () => {
  it("creates exact 9-up Letter pages offline", async () => {
    const bytes = await generateProxyDeckPdf(Array.from({ length: 10 }, (_, index) => copy(index + 1)), { tone: "bw" });
    const document = await PDFDocument.load(bytes);

    expect(document.getPageCount()).toBe(2);
    expect(document.getPage(0).getWidth()).toBe(612);
    expect(document.getPage(0).getHeight()).toBe(792);
    expect(bytes.length).toBeGreaterThan(1000);
  });

  it("generates stable deck PDF file names", () => {
    expect(proxyPdfFileName("Red Rage!!")).toBe("gigsmith-red-rage-proxies.pdf");
    expect(proxyPdfFileName("???")).toBe("gigsmith-deck-proxies.pdf");
  });
});

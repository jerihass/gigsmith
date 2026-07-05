import { useState } from "react";
import { Printer } from "lucide-react";
import type { Card, CardDatabase, Deck, DeckCardEntry } from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";
import { cardDetailTags, cardDetailText, displayPreviewNumber, eddieSymbol } from "../cardDetails";

export type ProxyPrintTone = "bw" | "color";

export interface ProxyCardCopy {
  card: Card;
  deckSection: "Legend" | "Main";
  copyNumber: number;
  totalCopies: number;
}

export interface MissingProxyCard {
  cardId: string;
  deckSection: "Legend" | "Main";
  count: number;
}

const proxiesPerPrintedPage = 6;

function chunkProxyCopies(copies: ProxyCardCopy[]): ProxyCardCopy[][] {
  const pages: ProxyCardCopy[][] = [];
  for (let index = 0; index < copies.length; index += proxiesPerPrintedPage) {
    pages.push(copies.slice(index, index + proxiesPerPrintedPage));
  }
  return pages;
}

function expandEntries(
  entries: DeckCardEntry[],
  section: "Legend" | "Main",
  cardsById: ReadonlyMap<string, Card>
): { copies: ProxyCardCopy[]; missing: MissingProxyCard[] } {
  const copies: ProxyCardCopy[] = [];
  const missing: MissingProxyCard[] = [];

  for (const entry of entries) {
    const card = cardsById.get(entry.cardId);
    if (!card) {
      missing.push({ cardId: entry.cardId, deckSection: section, count: entry.count });
      continue;
    }

    for (let index = 1; index <= entry.count; index += 1) {
      copies.push({ card, deckSection: section, copyNumber: index, totalCopies: entry.count });
    }
  }

  return { copies, missing };
}

export function proxyDeckCards(deck: Deck, cardDb: CardDatabase): { copies: ProxyCardCopy[]; missing: MissingProxyCard[] } {
  const cardsById = new Map(cardDb.cards.map((card) => [card.id, card]));
  const legends = expandEntries(deck.legends, "Legend", cardsById);
  const main = expandEntries(deck.main, "Main", cardsById);
  return {
    copies: [...legends.copies, ...main.copies],
    missing: [...legends.missing, ...main.missing]
  };
}

function proxyValue(label: string, value: string) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>;
}

function rulesDensity(card: Card): "standard" | "compact" | "dense" {
  const length = cardDetailText(card.rules_text, "No rules text.").length;
  if (length > 220) return "dense";
  if (length > 160) return "compact";
  return "standard";
}

function ProxyCard({ copy }: { copy: ProxyCardCopy }) {
  const card = copy.card;
  return (
    <article className="proxy-card" data-color={card.color.toLowerCase()} aria-label={`${card.display_name} proxy`}>
      <header className="proxy-card-header">
        <div>
          <p>{card.color} {card.card_type}{isSellableCard(card) ? ` · Sell ${eddieSymbol}` : ""}</p>
          <h3>{card.display_name}</h3>
        </div>
        <span>{card.print_number ?? card.set.code}</span>
      </header>

      <dl className="proxy-card-stats" aria-label="Card stats">
        {proxyValue("RAM", displayPreviewNumber(card.ram))}
        {proxyValue(eddieSymbol, displayPreviewNumber(card.cost))}
        {proxyValue("PWR", displayPreviewNumber(card.power))}
      </dl>

      <section className="proxy-card-rules" data-density={rulesDensity(card)}>
        <h4>Ability</h4>
        <p>{cardDetailText(card.rules_text, "No rules text.")}</p>
      </section>

      <dl className="proxy-card-tags">
        <div><dt>Keywords</dt><dd>{cardDetailTags(card.keywords)}</dd></div>
        <div><dt>Class</dt><dd>{cardDetailTags(card.classifications)}</dd></div>
      </dl>

      <footer className="proxy-card-footer">
        <span>{copy.deckSection} · {copy.copyNumber}/{copy.totalCopies}</span>
        <span>{card.rarity ?? "Unknown rarity"}</span>
      </footer>
    </article>
  );
}

export function ProxyDeckPrintPanel({ deck, cardDb }: { deck: Deck; cardDb: CardDatabase }) {
  const { copies, missing } = proxyDeckCards(deck, cardDb);
  const pages = chunkProxyCopies(copies);
  const mainCount = deck.main.reduce((total, entry) => total + entry.count, 0);
  const legendCount = deck.legends.reduce((total, entry) => total + entry.count, 0);
  const [tone, setTone] = useState<ProxyPrintTone>("bw");

  return (
    <section className="panel proxy-print-panel" data-print-tone={tone}>
      <div className="panel-title proxy-print-title">
        <div>
          <p className="section-kicker">Sleeve-ready proxies</p>
          <h2>Printable Proxy Deck</h2>
        </div>
        <div className="proxy-print-controls">
          <label className="field compact-field">
            <span>Print mode</span>
            <select aria-label="Proxy print mode" value={tone} onChange={(event) => setTone(event.target.value as ProxyPrintTone)}>
              <option value="bw">Black and white</option>
              <option value="color">Color accents</option>
            </select>
          </label>
          <button className="primary" onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Print proxies</button>
        </div>
      </div>

      <p className="proxy-print-summary">
        {copies.length} proxies: {legendCount} Legends and {mainCount} main-deck cards. Cards print at 2.5 by 3.5 inches with no artwork.
      </p>

      {missing.length > 0 && (
        <div className="proxy-print-warning" role="alert">
          Missing card data for {missing.reduce((total, item) => total + item.count, 0)} deck slot(s): {missing.map((item) => `${item.cardId} x${item.count}`).join(", ")}.
        </div>
      )}

      <div className="proxy-page" aria-label={`${deck.name} printable proxy sheet`}>
        {pages.map((page, pageIndex) => (
          <div className="proxy-sheet-page" aria-label={`Proxy sheet page ${pageIndex + 1}`} key={pageIndex}>
            {page.map((copy, index) => <ProxyCard copy={copy} key={`${copy.card.id}-${copy.deckSection}-${copy.copyNumber}-${index}`} />)}
          </div>
        ))}
      </div>
    </section>
  );
}

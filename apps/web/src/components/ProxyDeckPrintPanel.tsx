import { useState } from "react";
import { Download, Minus, Plus, Printer } from "lucide-react";
import type { Card, CardDatabase, Deck, DeckCardEntry, DeckVersionSnapshot } from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";
import { cardDetailTags, cardDetailText, displayPreviewNumber, eddieSymbol } from "../cardDetails";
import { generateProxyDeckPdf, proxyPdfFileName } from "../proxyPdf";

export type ProxyPrintTone = "bw" | "color";
export type ProxyPrintContents = "full" | "changes" | "selected";

export interface ProxyPrintSelectionEntry extends DeckCardEntry {
  deckSection: "Legend" | "Main";
}

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

export interface ProxyDeckCardsResult {
  copies: ProxyCardCopy[];
  missing: MissingProxyCard[];
  baselineVersion?: DeckVersionSnapshot;
  removedOrDecreasedCount: number;
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

function countByCard(entries: DeckCardEntry[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + entry.count);
  return counts;
}

function latestVersion(deck: Deck): DeckVersionSnapshot | undefined {
  return [...(deck.versions ?? [])].sort((left, right) => {
    const timeDelta = Date.parse(right.createdAt) - Date.parse(left.createdAt);
    return timeDelta || right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id);
  })[0];
}

function positiveDeltaEntries(beforeEntries: DeckCardEntry[], afterEntries: DeckCardEntry[]): {
  entries: DeckCardEntry[];
  removedOrDecreasedCount: number;
} {
  const before = countByCard(beforeEntries);
  const after = countByCard(afterEntries);
  const cardIds = new Set([...before.keys(), ...after.keys()]);
  const entries: DeckCardEntry[] = [];
  let removedOrDecreasedCount = 0;

  for (const cardId of cardIds) {
    const beforeCount = before.get(cardId) ?? 0;
    const afterCount = after.get(cardId) ?? 0;
    const delta = afterCount - beforeCount;
    if (delta > 0) entries.push({ cardId, count: delta });
    else if (delta < 0) removedOrDecreasedCount += Math.abs(delta);
  }

  return {
    entries: entries.sort((left, right) => left.cardId.localeCompare(right.cardId)),
    removedOrDecreasedCount
  };
}

export function proxyDeckCards(
  deck: Deck,
  cardDb: CardDatabase,
  contents: ProxyPrintContents = "full",
  selection: ProxyPrintSelectionEntry[] = []
): ProxyDeckCardsResult {
  const cardsById = new Map(cardDb.cards.map((card) => [card.id, card]));
  const baselineVersion = contents === "changes" ? latestVersion(deck) : undefined;
  const selectedLegendEntries = selection
    .filter((entry) => entry.deckSection === "Legend")
    .map(({ cardId, count }) => ({ cardId, count }));
  const selectedMainEntries = selection
    .filter((entry) => entry.deckSection === "Main")
    .map(({ cardId, count }) => ({ cardId, count }));
  const legendEntries = contents === "selected"
    ? { entries: selectedLegendEntries, removedOrDecreasedCount: 0 }
    : baselineVersion
    ? positiveDeltaEntries(baselineVersion.legends, deck.legends)
    : { entries: deck.legends, removedOrDecreasedCount: 0 };
  const mainEntries = contents === "selected"
    ? { entries: selectedMainEntries, removedOrDecreasedCount: 0 }
    : baselineVersion
    ? positiveDeltaEntries(baselineVersion.main, deck.main)
    : { entries: deck.main, removedOrDecreasedCount: 0 };
  const legends = expandEntries(legendEntries.entries, "Legend", cardsById);
  const main = expandEntries(mainEntries.entries, "Main", cardsById);
  return {
    copies: [...legends.copies, ...main.copies],
    missing: [...legends.missing, ...main.missing],
    baselineVersion,
    removedOrDecreasedCount: legendEntries.removedOrDecreasedCount + mainEntries.removedOrDecreasedCount
  };
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
        <div className="proxy-corner-stat proxy-cost-stat" aria-label={`Cost ${displayPreviewNumber(card.cost)}`}>
          <span>{eddieSymbol}</span>
          <strong>{displayPreviewNumber(card.cost)}</strong>
        </div>
        <div className="proxy-title-block">
          <p>{card.color} {card.card_type}{isSellableCard(card) ? ` · Sell ${eddieSymbol}` : ""}</p>
          <h3>{card.display_name}</h3>
        </div>
        <div className="proxy-corner-stat proxy-ram-stat" aria-label={`RAM ${displayPreviewNumber(card.ram)}`}>
          <span>RAM</span>
          <strong>{displayPreviewNumber(card.ram)}</strong>
        </div>
      </header>

      <section className="proxy-card-rules" data-density={rulesDensity(card)}>
        <h4>Ability</h4>
        <p>{cardDetailText(card.rules_text, "No rules text.")}</p>
      </section>

      <dl className="proxy-card-tags">
        <div><dt>Class</dt><dd>{cardDetailTags(card.classifications)}</dd></div>
      </dl>

      <footer className="proxy-card-footer">
        <div>
          <span>{copy.deckSection} · {copy.copyNumber}/{copy.totalCopies}</span>
          <span>{card.print_number ?? card.set.code} · {card.rarity ?? "Unknown rarity"}</span>
        </div>
        <div className="proxy-power-stat" aria-label={`Power ${displayPreviewNumber(card.power)}`}>
          <span>PWR</span>
          <strong>{displayPreviewNumber(card.power)}</strong>
        </div>
      </footer>
    </article>
  );
}

interface ProxySelectionOption {
  key: string;
  cardId: string;
  deckSection: "Legend" | "Main";
  deckCount: number;
  displayName: string;
}

function proxySelectionOptions(deck: Deck, cardDb: CardDatabase): ProxySelectionOption[] {
  const cardsById = new Map(cardDb.cards.map((card) => [card.id, card]));

  function sectionOptions(entries: DeckCardEntry[], deckSection: "Legend" | "Main"): ProxySelectionOption[] {
    return [...countByCard(entries)].map(([cardId, deckCount]) => ({
      key: `${deck.id}:${deckSection}:${cardId}`,
      cardId,
      deckSection,
      deckCount,
      displayName: cardsById.get(cardId)?.display_name ?? cardId
    }));
  }

  return [
    ...sectionOptions(deck.legends, "Legend"),
    ...sectionOptions(deck.main, "Main")
  ];
}

export function ProxyDeckPrintPanel({ deck, cardDb }: { deck: Deck; cardDb: CardDatabase }) {
  const [tone, setTone] = useState<ProxyPrintTone>("bw");
  const [contents, setContents] = useState<ProxyPrintContents>("full");
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [downloadStatus, setDownloadStatus] = useState("");
  const hasVersions = (deck.versions?.length ?? 0) > 0;
  const selectionOptions = proxySelectionOptions(deck, cardDb);
  const selection = selectionOptions.flatMap<ProxyPrintSelectionEntry>((option) => {
    const count = selectedQuantities[option.key];
    return count
      ? [{ cardId: option.cardId, deckSection: option.deckSection, count }]
      : [];
  });
  const resolvedContents = contents === "changes" && !hasVersions ? "full" : contents;
  const { copies, missing, baselineVersion, removedOrDecreasedCount } = proxyDeckCards(deck, cardDb, resolvedContents, selection);
  const pages = chunkProxyCopies(copies);
  const mainCount = copies.filter((copy) => copy.deckSection === "Main").length;
  const legendCount = copies.filter((copy) => copy.deckSection === "Legend").length;

  function setCardSelected(option: ProxySelectionOption, selected: boolean) {
    setSelectedQuantities((current) => {
      if (selected) return { ...current, [option.key]: current[option.key] ?? option.deckCount };
      const next = { ...current };
      delete next[option.key];
      return next;
    });
  }

  function setCardQuantity(option: ProxySelectionOption, requestedCount: number) {
    const count = Math.max(1, Math.min(99, Number.isFinite(requestedCount) ? Math.round(requestedCount) : 1));
    setSelectedQuantities((current) => ({ ...current, [option.key]: count }));
  }

  function selectAllCards() {
    setSelectedQuantities((current) => {
      const next = { ...current };
      for (const option of selectionOptions) next[option.key] = current[option.key] ?? option.deckCount;
      return next;
    });
  }

  async function downloadPdf() {
    try {
      setDownloadStatus("Preparing PDF...");
      const bytes = await generateProxyDeckPdf(copies, { tone });
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([buffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = proxyPdfFileName(deck.name);
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDownloadStatus(`Downloaded ${Math.ceil(copies.length / 9)} PDF sheet${copies.length <= 9 ? "" : "s"}.`);
    } catch {
      setDownloadStatus("PDF export failed.");
    }
  }

  return (
    <section className="panel proxy-print-panel" data-print-tone={tone}>
      <div className="panel-title proxy-print-title">
        <div>
          <p className="section-kicker">Sleeve-ready proxies</p>
          <h2>Printable Proxy Deck</h2>
        </div>
        <div className="proxy-print-controls">
          <label className="field compact-field">
            <span>Tone</span>
            <select aria-label="Proxy print mode" value={tone} onChange={(event) => setTone(event.target.value as ProxyPrintTone)}>
              <option value="bw">Black and white</option>
              <option value="color">Color accents</option>
            </select>
          </label>
          <label className="field compact-field">
            <span>Contents</span>
            <select
              aria-label="Proxy print contents"
              value={resolvedContents}
              onChange={(event) => setContents(event.target.value as ProxyPrintContents)}
            >
              <option value="full">Full current deck</option>
              <option value="selected">Selected cards</option>
              <option value="changes" disabled={!hasVersions}>Changes since latest version</option>
            </select>
          </label>
          <button className="primary" disabled={copies.length === 0} onClick={downloadPdf}><Download size={16} aria-hidden="true" /> Download 9-up PDF</button>
          <button disabled={copies.length === 0} onClick={() => window.print()}><Printer size={16} aria-hidden="true" /> Browser print</button>
        </div>
      </div>

      {resolvedContents === "selected" && (
        <section className="proxy-selection" aria-labelledby="proxy-selection-title">
          <div className="proxy-selection-header">
            <div>
              <h3 id="proxy-selection-title">Cards to print</h3>
              <span className="result-count">{selection.length === 0 ? "Choose cards and set the number of proxies for each." : `${selection.length} card${selection.length === 1 ? "" : "s"} selected.`}</span>
            </div>
            <div className="proxy-selection-actions">
              <button disabled={selectionOptions.length === 0} onClick={selectAllCards}>Select all</button>
              <button disabled={selection.length === 0} onClick={() => setSelectedQuantities({})}>Clear</button>
            </div>
          </div>
          <ul className="proxy-selection-list">
            {selectionOptions.map((option) => {
              const selected = selectedQuantities[option.key] !== undefined;
              const quantity = selectedQuantities[option.key] ?? option.deckCount;
              return (
                <li className="proxy-selection-row" key={option.key}>
                  <label className="proxy-selection-card">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={(event) => setCardSelected(option, event.target.checked)}
                    />
                    <span>
                      <strong>{option.displayName}</strong>
                      <br />
                      <small className="result-count">{option.deckSection} · {option.deckCount} in deck</small>
                    </span>
                  </label>
                  <div className="proxy-quantity-stepper">
                    <button
                      className="icon-button"
                      aria-label={`Decrease print quantity for ${option.displayName}`}
                      title="Decrease print quantity"
                      disabled={!selected || quantity <= 1}
                      onClick={() => setCardQuantity(option, quantity - 1)}
                    >
                      <Minus size={16} aria-hidden="true" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      inputMode="numeric"
                      aria-label={`Print quantity for ${option.displayName}`}
                      disabled={!selected}
                      value={quantity}
                      onChange={(event) => setCardQuantity(option, Number(event.target.value))}
                    />
                    <button
                      className="icon-button"
                      aria-label={`Increase print quantity for ${option.displayName}`}
                      title="Increase print quantity"
                      disabled={!selected || quantity >= 99}
                      onClick={() => setCardQuantity(option, quantity + 1)}
                    >
                      <Plus size={16} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="proxy-print-summary">
        {copies.length} proxies: {legendCount} Legends and {mainCount} main-deck cards.
        {resolvedContents === "selected"
          ? selection.length > 0 ? " Printing only the selected cards." : " Select at least one card to print."
          : baselineVersion ? ` Showing cards added or increased since ${baselineVersion.name}.` : " Printing the full current deck."}
        {removedOrDecreasedCount > 0 ? ` ${removedOrDecreasedCount} removed/decreased slot${removedOrDecreasedCount === 1 ? "" : "s"} are not printed.` : ""}
        {" "}PDF export prints 9 cards per Letter sheet at 2.5 by 3.5 inches with no artwork.
      </p>
      {downloadStatus && <p className="proxy-download-status" role="status">{downloadStatus}</p>}

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

import { memo, useEffect, useMemo, useState } from "react";
import type { Card, CardDatabase, Deck, DeckCompositionReport, EddyCurveReport, GigOddsReport, RamLimitReport, ValidationResult } from "@gigsmith/data-contracts";
import { encodeDeckSharePayload } from "@gigsmith/deck-io";

function countCards(entries: Array<{ count: number }>): number {
  return entries.reduce((total, entry) => total + entry.count, 0);
}

function cardName(cardId: string, cards: Map<string, Card>): string {
  return cards.get(cardId)?.display_name ?? cardId;
}

export const DeckReportPanel = memo(function DeckReportPanel({
  deck,
  cardDb,
  validation,
  ram,
  eddyCurve,
  composition,
  gigOdds
}: {
  deck: Deck;
  cardDb: CardDatabase;
  validation: ValidationResult;
  ram: RamLimitReport;
  eddyCurve: EddyCurveReport;
  composition: DeckCompositionReport;
  gigOdds: GigOddsReport;
}) {
  const cards = useMemo(() => new Map(cardDb.cards.map((card) => [card.id, card])), [cardDb]);
  const sharePayload = useMemo(() => encodeDeckSharePayload(deck), [deck]);
  const [qrCode, setQrCode] = useState("");
  const [qrError, setQrError] = useState("");
  const shareUrl = useMemo(() => {
    const origin = typeof window === "undefined" ? "https://example.invalid/" : window.location.href;
    const url = new URL(origin);
    url.hash = `deck=${sharePayload}`;
    return url.toString();
  }, [sharePayload]);

  useEffect(() => {
    let cancelled = false;
    setQrCode("");
    setQrError("");
    if (shareUrl.length > 1800) {
      setQrError("Share payload is too large for a practical QR code. Use text/JSON export instead.");
      return;
    }

    import("qrcode")
      .then((module) => module.toDataURL(shareUrl, {
        errorCorrectionLevel: "M",
        margin: 1,
        scale: 5,
        color: { dark: "#05070a", light: "#ffffff" }
      }))
      .then((url) => {
        if (!cancelled) setQrCode(url);
      })
      .catch(() => {
        if (!cancelled) setQrError("QR generation failed. The share link remains available in Transfer.");
      });

    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  const mainDeckRows = deck.main.map((entry) => ({ entry, card: cards.get(entry.cardId) }));

  return (
    <section className="panel deck-report-panel" aria-labelledby="deck-report-title">
      <div className="panel-title">
        <div>
          <p className="section-kicker">Read-only table report</p>
          <h2 id="deck-report-title">Deck Report</h2>
        </div>
        <button onClick={() => window.print()}>Print report</button>
      </div>

      <div className="deck-report-sheet">
        <header className="deck-report-header">
          <div>
            <h3>{deck.name}</h3>
            <p>{validation.legal ? "Legal" : `${validation.errors.length} legality issue${validation.errors.length === 1 ? "" : "s"}`} · {countCards(deck.legends)} Legends · {countCards(deck.main)} main</p>
          </div>
          <div className="deck-report-qr" aria-label="Deck share QR code">
            {qrCode && <img src={qrCode} alt="QR code for deck share link" />}
            {!qrCode && !qrError && <span>QR loading</span>}
            {qrError && <span>{qrError}</span>}
          </div>
        </header>

        <section className="deck-report-grid">
          <div>
            <h4>Legends</h4>
            <ul>
              {deck.legends.map((entry) => (
                <li key={entry.cardId}>{entry.count} {cardName(entry.cardId, cards)}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>RAM</h4>
            <ul>
              {ram.limits.map((limit) => (
                <li key={limit.color}>{limit.color}: {limit.limit}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Eddy Curve</h4>
            <ul>
              <li>Sellable: {eddyCurve.supply.sellableCardCount} / {eddyCurve.mainDeckDemand.cardCount}</li>
              <li>Average cost: {eddyCurve.mainDeckDemand.averagePrintedCost?.toFixed(1) ?? "-"}</li>
              <li>Total printed cost: {eddyCurve.mainDeckDemand.totalPrintedCost}</li>
            </ul>
          </div>
          <div>
            <h4>Gig Goals</h4>
            <ul>
              <li>Natural order: {gigOdds.recommendedOrder.join(" -> ") || "-"}</li>
              <li>Supported goals: {gigOdds.demands.filter((demand) => demand.supported).length}</li>
            </ul>
          </div>
        </section>

        <section className="deck-report-grid">
          <div>
            <h4>Colors</h4>
            <ul>{composition.main.colorBuckets.map((bucket) => <li key={bucket.label}>{bucket.label}: {bucket.copyCount}</li>)}</ul>
          </div>
          <div>
            <h4>Types</h4>
            <ul>{composition.main.typeBuckets.map((bucket) => <li key={bucket.label}>{bucket.label}: {bucket.copyCount}</li>)}</ul>
          </div>
          <div>
            <h4>Roles</h4>
            <ul>{composition.main.roleBuckets.slice(0, 6).map((bucket) => <li key={bucket.roleId}>{bucket.label}: {bucket.copyCount}</li>)}</ul>
          </div>
          <div>
            <h4>Validation</h4>
            <ul>
              {validation.errors.length === 0 && validation.warnings.length === 0 && <li>No issues.</li>}
              {[...validation.errors, ...validation.warnings].slice(0, 6).map((issue) => <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>)}
            </ul>
          </div>
        </section>

        <section>
          <h4>Main Deck</h4>
          <div className="deck-report-list">
            {mainDeckRows.map(({ entry, card }) => (
              <article key={entry.cardId} data-color={card?.color.toLowerCase()}>
                <strong>{entry.count} {card?.display_name ?? entry.cardId}</strong>
                <span>{card?.color ?? "Unknown"} {card?.card_type ?? "Card"} · RAM {card?.ram ?? "-"} · €$ {card?.cost ?? "-"} · PWR {card?.power ?? "-"}</span>
                {card?.rules_text && <p>{card.rules_text}</p>}
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
});

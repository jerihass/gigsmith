import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, X } from "lucide-react";
import type { Card, CardDatabase } from "@gigsmith/data-contracts";
import { refreshStoredCardDatabase, resetStoredCardDatabase } from "../cardDatabase";
import { selectExternalCardArtUrl } from "../externalCardArt";
import { CardArt } from "./CardArt";

interface CardDatabaseRefreshProps {
  cardDb: CardDatabase;
  usingOverride: boolean;
  initialError?: string;
  cardArtEnabled: boolean;
  cardArtUrls: ReadonlyMap<string, string>;
  cardArtSourcePending: boolean;
  onChange: (cardDb: CardDatabase, usingOverride: boolean) => void;
  onViewCard: (card: Card, trigger: HTMLButtonElement) => void;
}

export function CardDatabaseRefresh({
  cardDb,
  usingOverride,
  initialError,
  cardArtEnabled,
  cardArtUrls,
  cardArtSourcePending,
  onChange,
  onViewCard
}: CardDatabaseRefreshProps) {
  const [status, setStatus] = useState<"idle" | "refreshing">("idle");
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | undefined>(
    initialError ? { kind: "error", message: initialError } : undefined
  );
  const [newCards, setNewCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  async function refresh() {
    const controller = new AbortController();
    setStatus("refreshing");
    try {
      const result = await refreshStoredCardDatabase(window.localStorage, cardDb, controller.signal);
      if (result.cardDb) onChange(result.cardDb, true);
      setNewCards(result.newCards);
      setToast({ kind: "success", message: result.message });
    } catch (error) {
      setToast({
        kind: "error",
        message: error instanceof Error ? `Refresh failed: ${error.message}` : "Refresh failed; using saved card database."
      });
    } finally {
      setStatus("idle");
    }
  }

  function reset() {
    const result = resetStoredCardDatabase(window.localStorage);
    onChange(result.cardDb, false);
    setNewCards([]);
    setToast({ kind: "success", message: `Reset to bundled card database: ${result.cardDb.cards.length} cards.` });
  }

  return (
    <section className="panel data-refresh-panel" aria-labelledby="card-data-refresh-title">
      <div className="panel-title">
        <div>
          <p className="section-kicker">Local card data</p>
          <h2 id="card-data-refresh-title">Card Database</h2>
        </div>
        <span className="result-count">{usingOverride ? "User refreshed" : "Bundled"}</span>
      </div>
      <dl className="data-refresh-facts">
        <div><dt>Version</dt><dd>{cardDb.metadata.cardDataVersion}</dd></div>
        <div><dt>Cards</dt><dd>{cardDb.cards.length}</dd></div>
        <div><dt>Retrieved</dt><dd>{cardDb.metadata.sourceRetrievedAt}</dd></div>
      </dl>
      <div className="data-refresh-actions">
        <button className="primary" disabled={status === "refreshing"} onClick={refresh}>
          <RefreshCw size={16} aria-hidden="true" />
          {status === "refreshing" ? "Refreshing" : "Refresh card database"}
        </button>
        <button disabled={!usingOverride || status === "refreshing"} onClick={reset}>
          <RotateCcw size={16} aria-hidden="true" />
          Reset bundled
        </button>
      </div>
      {newCards.length > 0 && (
        <section className="new-card-results" aria-labelledby="new-card-results-title">
          <div className="new-card-results-title">
            <div>
              <p className="section-kicker">Refresh result</p>
              <h3 id="new-card-results-title">New Cards</h3>
            </div>
            <span className="result-count">{newCards.length} found</span>
          </div>
          <div className="new-card-list">
            {newCards.map((card) => (
              <article className="new-card-row" data-color={card.color.toLowerCase()} key={card.id}>
                <CardArt
                  card={card}
                  enabled={cardArtEnabled}
                  source={selectExternalCardArtUrl(card, cardArtUrls)}
                  sourcePending={cardArtSourcePending}
                  variant="thumbnail"
                />
                <div className="new-card-copy">
                  <strong>{card.display_name}</strong>
                  <span>{card.color} {card.card_type} · RAM {card.ram ?? "-"} · Cost {card.cost ?? "-"}</span>
                </div>
                <button onClick={(event) => onViewCard(card, event.currentTarget)}>Details</button>
              </article>
            ))}
          </div>
        </section>
      )}
      {toast && (
        <div
          className={`import-toast ${toast.kind}`}
          role={toast.kind === "error" ? "alert" : "status"}
        >
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss card database notification"
            title="Dismiss"
            onClick={() => setToast(undefined)}
          ><X size={17} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}

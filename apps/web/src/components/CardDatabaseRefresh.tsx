import { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, X } from "lucide-react";
import type { CardDatabase } from "@gigsmith/data-contracts";
import { refreshStoredCardDatabase, resetStoredCardDatabase } from "../cardDatabase";

interface CardDatabaseRefreshProps {
  cardDb: CardDatabase;
  usingOverride: boolean;
  initialError?: string;
  onChange: (cardDb: CardDatabase, usingOverride: boolean) => void;
}

export function CardDatabaseRefresh({
  cardDb,
  usingOverride,
  initialError,
  onChange
}: CardDatabaseRefreshProps) {
  const [status, setStatus] = useState<"idle" | "refreshing">("idle");
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | undefined>(
    initialError ? { kind: "error", message: initialError } : undefined
  );

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

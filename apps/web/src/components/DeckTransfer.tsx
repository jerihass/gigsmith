import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { CardDatabase, Deck } from "@gigsmith/data-contracts";
import { encodeDeckSharePayload, exportDeckJson, exportDecklist, importDeckJson, importDecklist } from "@gigsmith/deck-io";

export function DeckTransfer({
  deck,
  cardDb,
  onReplace
}: {
  deck: Deck;
  cardDb: CardDatabase;
  onReplace: (deck: Deck) => void;
}) {
  const [format, setFormat] = useState<"text" | "json">("text");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [importToast, setImportToast] = useState<{ kind: "success" | "error"; message: string }>();
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [includeVersionHistory, setIncludeVersionHistory] = useState(false);
  const exportText = useMemo(
    () => format === "json"
      ? exportDeckJson(deck, { includeVersionHistory })
      : exportDecklist(deck, cardDb),
    [cardDb, deck, format, includeVersionHistory]
  );

  useEffect(() => {
    if (!importToast) return;
    const timeout = window.setTimeout(() => setImportToast(undefined), 5000);
    return () => window.clearTimeout(timeout);
  }, [importToast]);

  function changeFormat(next: "text" | "json") {
    setFormat(next);
    setImportText("");
    setImportError("");
    setImportToast(undefined);
  }

  function handleImport() {
    if (format === "json") {
      const result = importDeckJson(importText);
      if (!result.document) {
        const errorText = result.errors.map((error) => `${error.path}: ${error.message}`).join("\n");
        const firstError = result.errors[0]?.message ?? "The JSON deck document is invalid.";
        setImportError(errorText);
        setImportToast({
          kind: "error",
          message: `Import failed: ${firstError}${result.errors.length > 1 ? ` (+${result.errors.length - 1} more)` : ""}`
        });
        return;
      }
      const imported = result.document.deck;
      setImportError("");
      onReplace({
        id: deck.id,
        name: imported.name,
        legends: imported.legends,
        main: imported.main,
        formatId: imported.formatId,
        rulesetVersion: imported.rulesetVersion,
        cardDataVersion: imported.cardDataVersion,
        metadata: { ...deck.metadata, notes: imported.notes },
        versions: imported.versions
      });
      setImportToast({
        kind: "success",
        message: `Imported ${imported.name} successfully${imported.versions?.length ? ` with ${imported.versions.length} saved version${imported.versions.length === 1 ? "" : "s"}` : ""}.`
      });
      return;
    }

    const result = importDecklist(importText, cardDb, {
      deckName: deck.name,
      formatId: deck.formatId,
      rulesetVersion: deck.rulesetVersion
    });
    if (!result.deck) {
      const errorText = result.errors.map((error) => `Line ${error.line}: ${error.message}`).join("\n");
      const firstError = result.errors[0]?.message ?? "The decklist is invalid.";
      setImportError(errorText);
      setImportToast({
        kind: "error",
        message: `Import failed: ${firstError}${result.errors.length > 1 ? ` (+${result.errors.length - 1} more)` : ""}`
      });
      return;
    }
    setImportError("");
    onReplace({ ...result.deck, id: deck.id, name: deck.name, metadata: deck.metadata });
    setImportToast({ kind: "success", message: `Imported decklist into ${deck.name}.` });
  }

  async function copyShareLink() {
    const url = new URL(window.location.href);
    url.hash = `deck=${encodeDeckSharePayload(deck)}`;
    setShareUrl(url.toString());
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareStatus("Link copied");
    } catch {
      setShareStatus("Link ready below");
    }
  }

  return (
    <section className="io-section">
      <div className="panel-title io-title">
        <div><p className="section-kicker">Portable deck</p><h2>Import / Export</h2></div>
        <div className="io-actions">
          <div className="segmented-control" role="group" aria-label="Deck transfer format">
            <button aria-pressed={format === "text"} onClick={() => changeFormat("text")}>Text</button>
            <button aria-pressed={format === "json"} onClick={() => changeFormat("json")}>JSON</button>
          </div>
          {format === "json" && (
            <label className="binary-field">
              <input
                type="checkbox"
                checked={includeVersionHistory}
                onChange={(event) => setIncludeVersionHistory(event.target.checked)}
              />
              <span>Include versions</span>
            </label>
          )}
          <button onClick={copyShareLink}>Copy share link</button>
          <span className="share-status" aria-live="polite">{shareStatus}</span>
        </div>
      </div>
      {shareUrl && <label className="field share-link-field"><span>Deck share link</span><input aria-label="Deck share link" readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} /></label>}
      <div className="workspace io">
        <section className="panel">
          <div className="panel-title"><h2>Export</h2><span className="result-count">{format === "json" ? "Schema v1" : "Decklist"}</span></div>
          <textarea aria-label={`${format === "json" ? "JSON" : "Text"} deck export`} readOnly value={exportText} />
        </section>
        <section className="panel">
          <h2>Import</h2>
          <textarea aria-label={`${format === "json" ? "JSON" : "Text"} deck import`} value={importText} onChange={(event) => setImportText(event.target.value)} placeholder={format === "json" ? "Paste a gigsmith.deck JSON document" : "Legends:\n1 V — StreetKid\n\nMain:\n3 Swordwise Huscle"} />
          <button className="primary" onClick={handleImport}>Import {format === "json" ? "JSON" : "decklist"}</button>
          {importError && <pre className="import-error">{importError}</pre>}
        </section>
      </div>
      {importToast && (
        <div
          className={`import-toast ${importToast.kind}`}
          role={importToast.kind === "error" ? "alert" : "status"}
        >
          <span>{importToast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss import notification"
            title="Dismiss"
            onClick={() => setImportToast(undefined)}
          ><X size={17} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}

import { useMemo, useState } from "react";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { encodeDeckSharePayload, exportDeckJson, exportDecklist, importDeckJson, importDecklist } from "@gigsmith/deck-io";

export function DeckTransfer({ deck, onReplace }: { deck: Deck; onReplace: (deck: Deck) => void }) {
  const [format, setFormat] = useState<"text" | "json">("text");
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const exportText = useMemo(() => format === "json" ? exportDeckJson(deck) : exportDecklist(deck, cyberpunkCardDb), [deck, format]);

  function changeFormat(next: "text" | "json") {
    setFormat(next);
    setImportText("");
    setImportError("");
  }

  function handleImport() {
    if (format === "json") {
      const result = importDeckJson(importText);
      if (!result.document) {
        setImportError(result.errors.map((error) => `${error.path}: ${error.message}`).join("\n"));
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
        metadata: { ...deck.metadata, notes: imported.notes }
      });
      return;
    }

    const result = importDecklist(importText, cyberpunkCardDb, {
      deckName: deck.name,
      formatId: deck.formatId,
      rulesetVersion: deck.rulesetVersion
    });
    if (!result.deck) {
      setImportError(result.errors.map((error) => `Line ${error.line}: ${error.message}`).join("\n"));
      return;
    }
    setImportError("");
    onReplace({ ...result.deck, id: deck.id, name: deck.name, metadata: deck.metadata });
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
    </section>
  );
}

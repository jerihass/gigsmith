import { useState } from "react";
import type { DeckLibraryRecovery } from "../deckLibrary";

export function DeckRecovery({
  recovery,
  onRetry,
  onReset
}: {
  recovery: DeckLibraryRecovery;
  onRetry: () => void;
  onReset: () => void;
}) {
  const [copyStatus, setCopyStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const reason = recovery.reason === "invalid-json"
    ? "The saved data is not valid JSON."
    : "The saved data does not match Gigsmith's deck-library format.";

  async function copyRawData() {
    try {
      await navigator.clipboard.writeText(recovery.rawValue);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy unavailable");
    }
  }

  function downloadRawData() {
    const blob = new Blob([recovery.rawValue], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gigsmith-deck-recovery.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="recovery-page">
      <section className="recovery-panel" aria-labelledby="recovery-title">
        <p className="eyebrow">Local data recovery</p>
        <h1 id="recovery-title">Saved decks need attention</h1>
        <p>{reason} Gigsmith preserved the original value and has not replaced it.</p>

        <label className="field recovery-data">
          <span>Preserved data from {recovery.sourceKey}</span>
          <textarea readOnly value={recovery.rawValue} onFocus={(event) => event.currentTarget.select()} />
        </label>

        <div className="recovery-actions">
          <button onClick={copyRawData}>Copy recovery data</button>
          <button onClick={downloadRawData}>Download recovery data</button>
          <button onClick={onRetry}>Retry loading</button>
          <span className="copy-status" aria-live="polite">{copyStatus}</span>
        </div>

        {confirmReset ? (
          <div className="recovery-reset-confirmation" role="alert">
            <p>Reset Gigsmith's saved decks on this device? Download or copy the preserved data first if you may need it.</p>
            <div>
              <button onClick={() => setConfirmReset(false)}>Cancel</button>
              <button className="danger" onClick={onReset}>Reset saved decks</button>
            </div>
          </div>
        ) : (
          <button className="danger recovery-reset" onClick={() => setConfirmReset(true)}>Reset saved decks</button>
        )}
      </section>
    </main>
  );
}

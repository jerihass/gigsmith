import { useEffect, useRef, useState } from "react";
import { Download, Upload, X } from "lucide-react";
import type { CardDatabase, GigMatchState } from "@gigsmith/data-contracts";
import type { DeckLibrary } from "../deckLibrary";
import type { PlaytestJournal } from "../playtestJournal";
import {
  exportPortableBackup,
  importPortableBackup,
  type PortableBackupV1
} from "../portableBackup";
import { measurePerformance } from "../performanceInstrumentation";
import type { AppTheme } from "../themePreference";
import type { AppView } from "../appViews";

type RestoreMode = "replace" | "merge";
export interface RestoreResult {
  kind: "success" | "error";
  message: string;
}

function libraryFingerprint(library: DeckLibrary): string {
  return JSON.stringify({
    activeDeckId: library.activeDeckId,
    decks: library.decks.map((deck) => ({
      id: deck.id,
      name: deck.name,
      legends: deck.legends.length,
      main: deck.main.length,
      updatedAt: deck.metadata?.updatedAt
    }))
  });
}

export function PortableBackup({
  library,
  theme,
  cardArtEnabled,
  activeView,
  cardDb,
  usingCardDatabaseOverride,
  gigMatch,
  playtestJournal,
  onBeforeExport,
  onRestore
}: {
  library: DeckLibrary;
  theme: AppTheme;
  cardArtEnabled: boolean;
  activeView: AppView;
  cardDb: CardDatabase;
  usingCardDatabaseOverride: boolean;
  gigMatch: GigMatchState;
  playtestJournal: PlaytestJournal;
  onBeforeExport?: () => void;
  onRestore: (backup: PortableBackupV1, mode: RestoreMode) => RestoreResult;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<PortableBackupV1>();
  const [pendingLibraryFingerprint, setPendingLibraryFingerprint] = useState("");
  const [mode, setMode] = useState<RestoreMode>("replace");
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string }>();
  const currentLibraryFingerprint = libraryFingerprint(library);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(undefined), 6000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (pendingBackup && pendingLibraryFingerprint && pendingLibraryFingerprint !== currentLibraryFingerprint) {
      setPendingBackup(undefined);
      setPendingLibraryFingerprint("");
      setMode("replace");
      setToast({ kind: "error", message: "Restore confirmation expired because local decks changed. Re-select the backup to continue." });
    }
  }, [currentLibraryFingerprint, pendingBackup, pendingLibraryFingerprint]);

  function downloadBackup() {
    onBeforeExport?.();
    const text = measurePerformance(
      "backup.export",
      () => exportPortableBackup({
        library,
        preferences: { theme, cardArtEnabled, activeView },
        cardDatabaseOverride: usingCardDatabaseOverride ? { metadata: cardDb.metadata, cards: cardDb.cards } : undefined,
        gigMatch,
        playtestJournal
      }),
      { decks: library.decks.length, cards: cardDb.cards.length, records: playtestJournal.records.length }
    );
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gigsmith-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setToast({ kind: "success", message: `Backup downloaded with ${library.decks.length} deck${library.decks.length === 1 ? "" : "s"}.` });
  }

  async function selectBackup(file: File | undefined) {
    if (!file) return;
    try {
      const text = await file.text();
      const result = measurePerformance(
        "backup.import",
        () => importPortableBackup(text),
        { bytes: text.length }
      );
      if (!result.backup) {
        setPendingBackup(undefined);
        setToast({ kind: "error", message: `Backup import failed: ${result.errors[0] ?? "Unknown error."}` });
        return;
      }
      setPendingBackup(result.backup);
      setPendingLibraryFingerprint(currentLibraryFingerprint);
      setMode("replace");
    } catch {
      setPendingBackup(undefined);
      setToast({ kind: "error", message: "Backup import failed: the file could not be read." });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function restoreBackup() {
    if (!pendingBackup) return;
    const result = onRestore(pendingBackup, mode);
    if (result.kind === "success") {
      setPendingBackup(undefined);
      setPendingLibraryFingerprint("");
      return;
    }
    setToast(result);
  }

  return (
    <section className="panel portable-backup-panel" aria-labelledby="portable-backup-title">
      <div className="panel-title">
        <div>
          <p className="section-kicker">Device recovery</p>
          <h2 id="portable-backup-title">Backup & Restore</h2>
        </div>
        <span className="result-count">{library.decks.length} decks</span>
      </div>
      <p className="backup-description">Download one file with your decks, preferences, card-data refresh, and Gig Sandbox state. Keep it in Files or cloud storage before resetting this device.</p>
      <div className="data-refresh-actions">
        <button className="primary" onClick={downloadBackup}><Download size={16} aria-hidden="true" /> Download backup</button>
        <button onClick={() => fileInputRef.current?.click()}><Upload size={16} aria-hidden="true" /> Restore backup</button>
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-label="Backup file"
          onChange={(event) => void selectBackup(event.target.files?.[0])}
        />
      </div>
      {pendingBackup && (
        <div className="backup-restore-confirmation" role="status">
          <strong>{pendingBackup.library.decks.length} deck{pendingBackup.library.decks.length === 1 ? "" : "s"} from {new Date(pendingBackup.exportedAt).toLocaleDateString()}</strong>
          <label><input type="radio" checked={mode === "replace"} onChange={() => setMode("replace")} /> Replace this device</label>
          <label><input type="radio" checked={mode === "merge"} onChange={() => setMode("merge")} /> Add backup decks only</label>
          <div>
            <button className="primary" onClick={restoreBackup}>Confirm restore</button>
            <button onClick={() => { setPendingBackup(undefined); setPendingLibraryFingerprint(""); }}>Cancel</button>
          </div>
        </div>
      )}
      {toast && (
        <div className={`import-toast ${toast.kind}`} role={toast.kind === "error" ? "alert" : "status"}>
          <span>{toast.message}</span>
          <button className="icon-button" aria-label="Dismiss backup notification" title="Dismiss" onClick={() => setToast(undefined)}><X size={17} aria-hidden="true" /></button>
        </div>
      )}
    </section>
  );
}

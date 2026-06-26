import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { latestReleaseNote, releaseNotes } from "../releaseNotes";

export function ReleaseNotesDialog({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      className="release-notes-dialog"
      ref={dialogRef}
      aria-labelledby="release-notes-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="release-notes-content">
        <header className="release-notes-header">
          <div>
            <p>App info</p>
            <h2 id="release-notes-title">Release Notes</h2>
            <span>Latest: {latestReleaseNote.version} · {latestReleaseNote.date}</span>
          </div>
          <button className="icon-button" ref={closeRef} aria-label="Close release notes" title="Close" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className="release-note-list">
          {releaseNotes.map((release) => (
            <article className="release-note" key={release.version}>
              <div>
                <p>{release.version} · {release.date}</p>
                <h3>{release.title}</h3>
              </div>
              <ul>
                {release.changes.map((change) => <li key={change}>{change}</li>)}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </dialog>
  );
}

import type { DeckDocumentV1 } from "@gigsmith/data-contracts";

function entryCount(entries: Array<{ count: number }>): number {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

export function SharedDeckPreview({
  document,
  error,
  onDismiss,
  onAdd
}: {
  document?: DeckDocumentV1;
  error: string;
  onDismiss: () => void;
  onAdd: () => void;
}) {
  if (!document && !error) return null;
  return (
    <section aria-label="Shared deck preview" className={`share-preview ${error ? "invalid" : ""}`}>
      <div>
        <p className="section-kicker">Shared deck</p>
        {document ? (
          <>
            <h2>{document.deck.name}</h2>
            <p>{entryCount(document.deck.legends)} Legends · {entryCount(document.deck.main)} main-deck cards</p>
            <small>{document.deck.rulesetVersion} · {document.deck.cardDataVersion}</small>
          </>
        ) : (
          <><h2>Unable to open shared deck</h2><p>{error}</p></>
        )}
      </div>
      <div className="share-preview-actions">
        <button onClick={onDismiss}>Dismiss</button>
        {document && <button className="primary" onClick={onAdd}>Add to library</button>}
      </div>
    </section>
  );
}

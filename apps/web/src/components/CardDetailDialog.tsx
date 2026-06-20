import { useEffect, useRef } from "react";
import { cyberpunkCardSnapshot } from "@gigsmith/card-data";
import type { Card } from "@gigsmith/data-contracts";
import { cardDetailStats, cardDetailTags, cardDetailText } from "../cardDetails";
import { CardArt } from "./CardArt";

export function CardDetailDialog({
  card,
  artEnabled,
  artSource,
  artSourcePending,
  onClose
}: {
  card?: Card;
  artEnabled: boolean;
  artSource?: string;
  artSourcePending: boolean;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (card && !dialog.open) {
      dialog.showModal();
      closeRef.current?.focus();
    } else if (!card && dialog.open) {
      dialog.close();
    }
  }, [card]);

  return (
    <dialog
      className="card-detail-dialog"
      ref={dialogRef}
      aria-labelledby="card-detail-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onClose(); } }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {card && (
        <div className="card-detail-content">
          <header className="card-detail-header">
            <div>
              <p>{card.color} {card.card_type}</p>
              <h2 id="card-detail-title">{card.display_name}</h2>
              <code>{card.external_id}</code>
            </div>
            <button className="icon-button" ref={closeRef} aria-label="Close card details" title="Close" onClick={onClose}>×</button>
          </header>

          <CardArt card={card} enabled={artEnabled} source={artSource} sourcePending={artSourcePending} variant="detail" />
          <dl className="card-detail-stats">
            {cardDetailStats(card).map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
          <section className="card-detail-section"><h3>Rules</h3><p className="rules-text">{cardDetailText(card.rules_text, "No rules text.")}</p></section>
          {card.flavor_text && <section className="card-detail-section"><h3>Flavor</h3><p className="flavor-text">{card.flavor_text}</p></section>}
          <dl className="card-detail-taxonomy">
            <div><dt>Keywords</dt><dd>{cardDetailTags(card.keywords)}</dd></div>
            <div><dt>Classifications</dt><dd>{cardDetailTags(card.classifications)}</dd></div>
            <div><dt>Set</dt><dd>{card.set.name} ({card.set.code})</dd></div>
            <div><dt>Printing</dt><dd>{card.print_number ?? card.printing_id}</dd></div>
          </dl>
          <footer className="card-detail-footer">
            <span>Card ID: <code>{card.id}</code></span>
            <a href={cyberpunkCardSnapshot.metadata.sourceUrl} target="_blank" rel="noreferrer">Snapshot source</a>
          </footer>
        </div>
      )}
    </dialog>
  );
}

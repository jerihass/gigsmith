import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Card } from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";
import { cardDetailStats, cardDetailTags, cardDetailTextParts } from "../cardDetails";
import { alternateCardSets } from "../cardSets";
import { CardArt } from "./CardArt";

export function CardDetailDialog({
  card,
  artEnabled,
  artSource,
  artSourcePending,
  sourceUrl,
  navigation,
  onClose
}: {
  card?: Card;
  artEnabled: boolean;
  artSource?: string;
  artSourcePending: boolean;
  sourceUrl: string;
  navigation?: {
    position: number;
    total: number;
    previousCardName: string;
    nextCardName: string;
    onPrevious: () => void;
    onNext: () => void;
  };
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const alternateSets = card ? alternateCardSets(card) : [];

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
      data-color={card?.color.toLowerCase()}
      ref={dialogRef}
      aria-labelledby="card-detail-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        } else if (navigation && event.key === "ArrowLeft") {
          event.preventDefault();
          navigation.onPrevious();
        } else if (navigation && event.key === "ArrowRight") {
          event.preventDefault();
          navigation.onNext();
        }
      }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      {card && (
        <div className="card-detail-content">
          <header className="card-detail-header">
            <div>
              <p>{card.color} {card.card_type}</p>
              <h2 id="card-detail-title">{card.display_name}</h2>
            </div>
            <button className="icon-button" ref={closeRef} aria-label="Close card details" title="Close" onClick={onClose}>
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          {navigation && (
            <nav className="card-detail-navigation" aria-label="Deck card details">
              <button
                className="icon-button"
                aria-label={`Previous card: ${navigation.previousCardName}`}
                title={`Previous: ${navigation.previousCardName}`}
                onClick={navigation.onPrevious}
              ><ChevronLeft size={19} aria-hidden="true" /></button>
              <span>{navigation.position} of {navigation.total} in deck</span>
              <button
                className="icon-button"
                aria-label={`Next card: ${navigation.nextCardName}`}
                title={`Next: ${navigation.nextCardName}`}
                onClick={navigation.onNext}
              ><ChevronRight size={19} aria-hidden="true" /></button>
            </nav>
          )}

          <CardArt card={card} enabled={artEnabled} source={artSource} sourcePending={artSourcePending} variant="detail" />
          <dl className="card-detail-stats">
            {cardDetailStats(card).map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
          </dl>
          <section className="card-detail-section">
            <h3>Rules</h3>
            <p className="rules-text">
              {cardDetailTextParts(card.rules_text, "No rules text.").map((part, index) => (
                part.kind === "keyword"
                  ? (
                    <span
                      className="rules-keyword"
                      data-shape={part.shape}
                      data-tone={part.tone}
                      key={`${part.text}-${index}`}
                    >
                      {part.text}
                    </span>
                  )
                  : <span key={index}>{part.text}</span>
              ))}
            </p>
          </section>
          {card.flavor_text && <section className="card-detail-section"><h3>Flavor</h3><p className="flavor-text">{card.flavor_text}</p></section>}
          <dl className="card-detail-taxonomy">
            <div><dt>Keywords</dt><dd>{cardDetailTags(card.keywords)}</dd></div>
            <div><dt>Economy</dt><dd>{isSellableCard(card) ? "Sellable" : "Not sellable"}</dd></div>
            <div><dt>Classifications</dt><dd>{cardDetailTags(card.classifications)}</dd></div>
            <div><dt>Current set</dt><dd>{card.set.name}<br /><code>{card.set.code}</code></dd></div>
            <div><dt>Printing</dt><dd>{card.print_number ?? card.printing_id}</dd></div>
            {alternateSets.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>Also printed in</dt>
                <dd>{alternateSets.map((set) => `${set.name} (${set.code})`).join(" · ")}</dd>
              </div>
            )}
          </dl>
          <footer className="card-detail-footer">
            <span>Card ID: <code>{card.id}</code></span>
            <a href={sourceUrl} target="_blank" rel="noreferrer">Snapshot source</a>
          </footer>
        </div>
      )}
    </dialog>
  );
}

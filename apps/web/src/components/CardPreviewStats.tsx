import { Layers, MemoryStick, Swords } from "lucide-react";
import type { Card } from "@gigsmith/data-contracts";
import { isSellableCard } from "@gigsmith/data-contracts";
import { displayPreviewNumber, eddieSymbol } from "../cardDetails";
import { alternateCardSets, cardSetBadgeLabel } from "../cardSets";

export function CardPreviewIdentity({ card }: { card: Card }) {
  return (
    <span className="card-preview-identity" aria-label={`${card.color} ${card.card_type}`}>
      <span className="card-preview-color" data-color={card.color.toLowerCase()}>
        <span aria-hidden="true" />
        {card.color}
      </span>
      <span className="card-preview-separator" aria-hidden="true">·</span>
      <span className="card-preview-type">{card.card_type}</span>
    </span>
  );
}

export function CardSetBadge({ card }: { card: Card }) {
  const alternateSets = alternateCardSets(card);
  const alternateCount = alternateSets.length;
  const accessibleText = alternateCount > 0
    ? `Printing set: ${card.set.name}; also printed in ${alternateCount} additional ${alternateCount === 1 ? "set" : "sets"}`
    : `Printing set: ${card.set.name}`;
  const title = alternateCount > 0
    ? `${card.set.name}. Also printed in ${alternateSets.map((set) => set.name).join(", ")}.`
    : card.set.name;

  return (
    <span className="deck-membership-badge card-set-badge" role="img" aria-label={accessibleText} title={title}>
      <Layers size={12} strokeWidth={2.4} aria-hidden="true" />
      <span aria-hidden="true">{cardSetBadgeLabel(card.set)}</span>
      {alternateCount > 0 && <span className="card-set-badge-count" aria-hidden="true">+{alternateCount}</span>}
    </span>
  );
}

export function CardPreviewStats({ card }: { card: Card }) {
  const sellable = isSellableCard(card);

  return (
    <span className="card-preview-stats" aria-label={`RAM ${displayPreviewNumber(card.ram)}, Eddies ${displayPreviewNumber(card.cost)}, Power ${displayPreviewNumber(card.power)}`}>
      <span className="card-preview-ram" title="RAM">
        <MemoryStick size={14} strokeWidth={2.4} aria-hidden="true" />
        {displayPreviewNumber(card.ram)}
      </span>
      <span>{eddieSymbol} {displayPreviewNumber(card.cost)}</span>
      <span className="card-preview-power" title="Power">
        <Swords size={14} strokeWidth={2.4} aria-hidden="true" />
        {displayPreviewNumber(card.power)}
      </span>
      {sellable && (
        <span className="sellable-badge" title="Sellable">
          <span aria-hidden="true">{eddieSymbol}</span>
          <span className="visually-hidden">Sellable</span>
        </span>
      )}
    </span>
  );
}

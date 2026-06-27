import { MemoryStick, Swords } from "lucide-react";
import type { Card } from "@gigsmith/data-contracts";
import { displayPreviewNumber, eddieSymbol } from "../cardDetails";

export function CardPreviewIdentity({ card }: { card: Card }) {
  return (
    <span className="card-preview-identity" aria-label={`${card.color} ${card.card_type}`}>
      <span className="card-preview-color" data-color={card.color.toLowerCase()}>
        <span aria-hidden="true" />
        {card.color}
      </span>
      <span className="card-preview-type">{card.card_type}</span>
    </span>
  );
}

export function CardPreviewStats({ card }: { card: Card }) {
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
    </span>
  );
}

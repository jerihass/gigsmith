import { MemoryStick, Swords } from "lucide-react";
import type { Card } from "@gigsmith/data-contracts";
import { displayPreviewNumber, eddieSymbol } from "../cardDetails";

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

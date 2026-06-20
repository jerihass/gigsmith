import { useMemo } from "react";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { previewDeckBaselineUpgrade } from "../deckBaseline";

const fieldLabels = {
  rulesetVersion: "Ruleset",
  cardDataVersion: "Card data",
  formatId: "Format"
};

export function DeckBaselineNotice({ deck, onUpgrade }: { deck: Deck; onUpgrade: (deck: Deck) => void }) {
  const preview = useMemo(
    () => previewDeckBaselineUpgrade(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable),
    [deck]
  );
  if (!preview.needed) return null;

  return (
    <section className="baseline-notice" aria-label="Deck baseline update">
      <div>
        <strong>New validation baseline available</strong>
        <ul>
          {preview.changes.map((change) => (
            <li key={change.field}>{fieldLabels[change.field]}: {change.from} → {change.to}</li>
          ))}
        </ul>
      </div>
      <button onClick={() => onUpgrade(preview.deck)}>Use current baseline</button>
    </section>
  );
}

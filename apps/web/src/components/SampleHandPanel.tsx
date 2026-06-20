import { useMemo, useState } from "react";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck } from "@gigsmith/data-contracts";
import { drawSampleHand } from "@gigsmith/rules-core";

const initialSeed = "night-city-1";

function createSeed(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function SampleHandPanel({ deck }: { deck: Deck }) {
  const [seedInput, setSeedInput] = useState(initialSeed);
  const [activeSeed, setActiveSeed] = useState(initialSeed);
  const report = useMemo(
    () => drawSampleHand(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable, activeSeed),
    [activeSeed, deck]
  );

  function generateNewSeed() {
    const seed = createSeed();
    setSeedInput(seed);
    setActiveSeed(seed);
  }

  return (
    <section className="panel sample-hand-panel" aria-labelledby="sample-hand-title">
      <div className="panel-title sample-hand-title">
        <div>
          <p className="section-kicker">Opening draw</p>
          <h2 id="sample-hand-title">Sample Hand</h2>
        </div>
        <form
          className="sample-hand-controls"
          onSubmit={(event) => {
            event.preventDefault();
            setActiveSeed(seedInput);
          }}
        >
          <label className="field sample-seed-field">
            <span>Seed</span>
            <input value={seedInput} onChange={(event) => setSeedInput(event.target.value)} />
          </label>
          <button type="submit">Generate</button>
          <button type="button" className="secondary" onClick={generateNewSeed}>New seed</button>
        </form>
      </div>

      <dl className="sample-hand-summary">
        <div><dt>Cards drawn</dt><dd>{report.cards.length} <span>/ {report.requestedHandSize}</span></dd></div>
        <div><dt>Sellable</dt><dd>{report.sellableCount}</dd></div>
        <div><dt>Printed cost</dt><dd>{report.knownPrintedCostTotal}</dd></div>
      </dl>

      <ol className="sample-hand-cards" aria-label="Sample hand cards">
        {report.cards.map((card, index) => (
          <li className="sample-hand-card" key={`${card.cardId}-${card.copyNumber}`}>
            <span className="sample-card-position">{index + 1}</span>
            <strong>{card.displayName ?? card.cardId}</strong>
            <dl>
              <div><dt>Cost</dt><dd>{card.cost ?? "Unknown"}</dd></div>
              <div><dt>Sellable</dt><dd>{card.known ? (card.isSellable ? "Yes" : "No") : "Unknown"}</dd></div>
            </dl>
            <span className="sample-card-types">
              {card.classifications.length > 0 ? card.classifications.join(" / ") : "No classification"}
            </span>
          </li>
        ))}
      </ol>

      {report.cards.length === 0 && <div className="empty-state">Add main-deck cards to draw a sample hand.</div>}

      {report.issues.length > 0 && (
        <div className="sample-hand-issues" role="status">
          {report.issues.map((issue) => <p key={`${issue.code}-${issue.message}`}>{issue.message}</p>)}
        </div>
      )}

      <details className="eddy-assumptions sample-hand-assumptions">
        <summary>Sample details</summary>
        <p>Seed: <code>{report.seed}</code></p>
        <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        <small>{report.rulesetVersion} · {report.cardDataVersion}</small>
      </details>
    </section>
  );
}

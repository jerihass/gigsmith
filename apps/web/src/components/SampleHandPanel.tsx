import { memo, useMemo, useState } from "react";
import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Deck, MulliganGoal, MulliganPlayerOrder, MulliganRecommendation } from "@gigsmith/data-contracts";
import { analyzeMulligan } from "@gigsmith/rules-core";

const initialSeed = "night-city-1";

function createSeed(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const recommendationLabels: Record<MulliganRecommendation, string> = {
  "lean-keep": "Lean keep",
  "lean-mulligan": "Lean mulligan",
  "close-call": "Close call"
};

const goalLabels: Record<MulliganGoal, string> = {
  balanced: "Balanced opening",
  "early-play": "Early plays",
  "eddy-supply": "Eddy supply"
};

export const SampleHandPanel = memo(function SampleHandPanel({ deck }: { deck: Deck }) {
  const [seedInput, setSeedInput] = useState(initialSeed);
  const [activeSeed, setActiveSeed] = useState(initialSeed);
  const [goal, setGoal] = useState<MulliganGoal>("balanced");
  const [playerOrder, setPlayerOrder] = useState<MulliganPlayerOrder>("first");
  const report = useMemo(
    () => analyzeMulligan(deck, cyberpunkCardDb, cyberpunkRulesetV1Printable, {
      seed: activeSeed,
      goal,
      playerOrder
    }),
    [activeSeed, deck, goal, playerOrder]
  );
  const sample = report.currentHand;

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
        <div><dt>Cards drawn</dt><dd>{sample.cards.length} <span>/ {sample.requestedHandSize}</span></dd></div>
        <div><dt>Sellable</dt><dd>{sample.sellableCount}</dd></div>
        <div><dt>Printed cost</dt><dd>{sample.knownPrintedCostTotal}</dd></div>
      </dl>

      <ol className="sample-hand-cards" aria-label="Sample hand cards">
        {sample.cards.map((card, index) => (
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

      {sample.cards.length === 0 && <div className="empty-state">Add main-deck cards to draw a sample hand.</div>}

      {sample.issues.length > 0 && (
        <div className="sample-hand-issues" role="status">
          {sample.issues.map((issue) => <p key={`${issue.code}-${issue.message}`}>{issue.message}</p>)}
        </div>
      )}

      <details className="eddy-assumptions sample-hand-assumptions">
        <summary>Sample details</summary>
        <p>Seed: <code>{sample.seed}</code></p>
        <ul>{sample.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        <small>{sample.rulesetVersion} · {sample.cardDataVersion}</small>
      </details>

      <section className="mulligan-comparison" aria-labelledby="mulligan-title">
        <div className="mulligan-heading">
          <div>
            <p className="section-kicker">Full-hand redraw</p>
            <h3 id="mulligan-title">Mulligan Comparison</h3>
          </div>
          <strong className={`mulligan-recommendation ${report.recommendation}`}>
            {recommendationLabels[report.recommendation]}
          </strong>
        </div>

        <div className="mulligan-controls">
          <label className="field">
            <span>Goal</span>
            <select value={goal} onChange={(event) => setGoal(event.target.value as MulliganGoal)}>
              {Object.entries(goalLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <div>
            <span className="control-label">Player order</span>
            <div className="segmented-control" role="group" aria-label="Mulligan player order">
              <button type="button" aria-pressed={playerOrder === "first"} onClick={() => setPlayerOrder("first")}>Going first</button>
              <button type="button" aria-pressed={playerOrder === "second"} onClick={() => setPlayerOrder("second")}>Going second</button>
            </div>
          </div>
        </div>

        <div className="mulligan-table-scroll" role="region" aria-label="Mulligan metric comparison" tabIndex={0}>
          <table className="mulligan-table">
            <thead><tr><th scope="col">Metric</th><th scope="col">Current hand</th><th scope="col">Redraw average</th></tr></thead>
            <tbody>
              <tr><th scope="row">Playable cards</th><td>{report.currentMetrics.playableCardCount}</td><td>{report.expectedMulliganMetrics.playableCardCount.toFixed(1)}</td></tr>
              <tr><th scope="row">Sellable cards</th><td>{report.currentMetrics.sellableCount}</td><td>{report.expectedMulliganMetrics.sellableCount.toFixed(1)}</td></tr>
              <tr><th scope="row">Average cost</th><td>{report.currentMetrics.averagePrintedCost?.toFixed(1) ?? "Unknown"}</td><td>{report.expectedMulliganMetrics.averagePrintedCost?.toFixed(1) ?? "Unknown"}</td></tr>
              <tr><th scope="row">Gross capacity</th><td>{report.currentMetrics.firstTurnPaymentCapacity}</td><td>{report.expectedMulliganMetrics.firstTurnPaymentCapacity.toFixed(1)}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="mulligan-reasons">
          {report.reasons.map((reason) => <p key={reason}>{reason}</p>)}
        </div>

        <div className="mulligan-redraw">
          <h4>Seeded example redraw</h4>
          <ul aria-label="Sample mulligan cards">
            {report.sampledMulliganHand.cards.map((card) => (
              <li key={`${card.cardId}-${card.copyNumber}`}>{card.displayName ?? card.cardId}</li>
            ))}
          </ul>
        </div>

        {report.issues.length > 0 && (
          <div className="mulligan-issues">
            {report.issues.map((issue) => <p key={issue.code}>{issue.message}</p>)}
          </div>
        )}

        <details className="eddy-assumptions mulligan-assumptions">
          <summary>Recommendation method and limits</summary>
          <p>
            {report.method === "exact" ? `${report.sampleSize} exact outcomes` : `${report.sampleSize} seeded samples`}
            {report.method === "seeded-simulation" && ` · 95% score margin ±${report.scoreMarginOfError.toFixed(3)}`}
          </p>
          <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
          <small>{report.version} · {report.rulesetVersion} · {report.cardDataVersion}</small>
        </details>
      </section>
    </section>
  );
});

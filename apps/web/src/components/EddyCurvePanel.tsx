import type { Card, EddyCurveReport } from "@gigsmith/data-contracts";

export function EddyCurvePanel({
  cards,
  report,
  playerOrder,
  onPlayerOrderChange
}: {
  cards: Card[];
  report: EddyCurveReport;
  playerOrder: "first" | "second";
  onPlayerOrderChange: (value: "first" | "second") => void;
}) {
  const maximumBucket = Math.max(1, ...report.mainDeckDemand.costBuckets.map((bucket) => bucket.cardCount));
  const percentSellable = Math.round(report.supply.sellableDensity * 100);
  const cardLabels = new Map(cards.map((card) => [card.id, card.display_name]));

  return (
    <section className="panel eddy-panel">
      <div className="panel-title eddy-title">
        <div>
          <p className="section-kicker">Deck economy</p>
          <h2>Eddy Curve</h2>
        </div>
        <div className="segmented-control" role="group" aria-label="Play order">
          <button aria-pressed={playerOrder === "first"} onClick={() => onPlayerOrderChange("first")}>Going first</button>
          <button aria-pressed={playerOrder === "second"} onClick={() => onPlayerOrderChange("second")}>Going second</button>
        </div>
      </div>

      <dl className="eddy-summary">
        <div>
          <dt>Sellable</dt>
          <dd>{report.supply.sellableCardCount} <span>/ {report.mainDeckDemand.cardCount}</span></dd>
          <small>{percentSellable}% of main deck</small>
        </div>
        <div>
          <dt>Average cost</dt>
          <dd>{report.mainDeckDemand.averagePrintedCost?.toFixed(1) ?? "-"}</dd>
          <small>printed main-deck cost</small>
        </div>
        <div>
          <dt>Total demand</dt>
          <dd>{report.mainDeckDemand.totalPrintedCost}</dd>
          <small>sum of printed costs</small>
        </div>
        <div>
          <dt>Eddy ceiling</dt>
          <dd>{report.supply.maximumPersistentEddies}</dd>
          <small>sellable cards in deck</small>
        </div>
      </dl>

      <div className="eddy-analysis-layout">
        <section className="cost-curve" aria-labelledby="cost-curve-title">
          <h3 id="cost-curve-title">Printed Cost Distribution</h3>
          <div className="cost-bars">
            {report.mainDeckDemand.costBuckets.map((bucket) => (
              <div className="cost-bar-row" key={bucket.cost}>
                <span className="cost-label">{bucket.cost}</span>
                <div className="cost-track" aria-hidden="true">
                  <span style={{ width: `${bucket.cardCount / maximumBucket * 100}%` }} />
                </div>
                <strong>{bucket.cardCount}</strong>
              </div>
            ))}
            {report.mainDeckDemand.costBuckets.length === 0 && <div className="empty-state">No printed costs available.</div>}
          </div>
        </section>

        <section className="eddy-projection" aria-labelledby="eddy-projection-title">
          <div className="projection-heading">
            <h3 id="eddy-projection-title">Expected Supply by Turn</h3>
            <span>{playerOrder === "first" ? "First player" : "Second player"}</span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr><th scope="col">Turn</th><th scope="col">Seen</th><th scope="col">Eddies</th><th scope="col">Legends</th><th scope="col">Capacity</th></tr>
              </thead>
              <tbody>
                {report.supply.turnProjections.map((projection) => {
                  const legendCapacity = playerOrder === "first" ? projection.firstPlayerLegendCapacity : projection.secondPlayerLegendCapacity;
                  const paymentCapacity = playerOrder === "first" ? projection.expectedFirstPlayerPaymentCapacity : projection.expectedSecondPlayerPaymentCapacity;
                  return (
                    <tr key={projection.turn}>
                      <th scope="row">{projection.turn}</th>
                      <td>{projection.cardsSeen}</td>
                      <td>{projection.expectedPersistentEddies.toFixed(1)}</td>
                      <td>{legendCapacity}</td>
                      <td><strong>{paymentCapacity.toFixed(1)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {report.warnings.length > 0 && (
        <div className="eddy-warnings">
          {report.warnings.map((warning) => (
            <div key={warning.code}>
              <strong>{warning.message}</strong>
              {warning.affectedCards.length > 0 && <span>{warning.affectedCards.map((cardId) => cardLabels.get(cardId) ?? cardId).join(", ")}</span>}
            </div>
          ))}
        </div>
      )}

      <details className="eddy-assumptions">
        <summary>Calculation assumptions</summary>
        <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
    </section>
  );
}

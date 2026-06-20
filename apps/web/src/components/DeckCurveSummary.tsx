import type { EddyDemandSummary } from "@gigsmith/data-contracts";

export function DeckCurveSummary({ demand }: { demand: EddyDemandSummary }) {
  const maximum = Math.max(1, ...demand.costBuckets.map((bucket) => bucket.cardCount));
  return (
    <section className="deck-curve-summary" aria-label="Main deck cost curve">
      <div className="deck-curve-heading">
        <span>Cost curve</span>
        <small>{demand.averagePrintedCost?.toFixed(1) ?? "-"} average</small>
      </div>
      <div className="deck-curve-bars">
        {demand.costBuckets.map((bucket) => (
          <div key={bucket.cost} title={`Cost ${bucket.cost}: ${bucket.cardCount} cards`}>
            <span style={{ height: `${Math.max(12, bucket.cardCount / maximum * 100)}%` }} />
            <strong>{bucket.cost}</strong>
            <small>{bucket.cardCount}</small>
          </div>
        ))}
        {demand.costBuckets.length === 0 && <span className="result-count">No printed costs</span>}
      </div>
    </section>
  );
}

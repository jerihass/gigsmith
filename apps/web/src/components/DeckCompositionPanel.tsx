import { memo } from "react";
import type { Card, DeckCompositionReport, CompositionBucket } from "@gigsmith/data-contracts";

function bucketPercent(bucket: CompositionBucket, total: number): string {
  return `${total === 0 ? 0 : Math.round(bucket.copyCount / total * 100)}%`;
}

function CardSources({ bucket, cards }: { bucket: CompositionBucket; cards: Map<string, Card> }) {
  return (
    <details className="composition-sources">
      <summary>{bucket.uniqueCardCount} source card{bucket.uniqueCardCount === 1 ? "" : "s"}</summary>
      <ul>
        {bucket.cardIds.map((cardId) => (
          <li key={cardId}>{cards.get(cardId)?.display_name ?? cardId}</li>
        ))}
      </ul>
    </details>
  );
}

function BucketBars({
  title,
  buckets,
  total,
  cards,
  limit = 8
}: {
  title: string;
  buckets: CompositionBucket[];
  total: number;
  cards: Map<string, Card>;
  limit?: number;
}) {
  const shown = buckets.slice(0, limit);
  return (
    <section className="composition-block" aria-labelledby={`composition-${title.toLowerCase().replaceAll(" ", "-")}`}>
      <h3 id={`composition-${title.toLowerCase().replaceAll(" ", "-")}`}>{title}</h3>
      <div className="composition-bars">
        {shown.map((bucket) => (
          <div className="composition-row" key={bucket.label}>
            <div className="composition-row-head">
              <span>{bucket.label}</span>
              <strong>{bucket.copyCount}</strong>
            </div>
            <div className="composition-track" aria-hidden="true">
              <span style={{ width: bucketPercent(bucket, total) }} />
            </div>
            <CardSources bucket={bucket} cards={cards} />
          </div>
        ))}
        {shown.length === 0 && <div className="empty-state">No data available.</div>}
      </div>
    </section>
  );
}

export const DeckCompositionPanel = memo(function DeckCompositionPanel({
  report,
  cards
}: {
  report: DeckCompositionReport;
  cards: Card[];
}) {
  const cardNames = new Map(cards.map((card) => [card.id, card]));

  return (
    <section className="panel composition-panel" aria-labelledby="composition-title">
      <div className="panel-title">
        <div>
          <p className="section-kicker">Explainable deck shape</p>
          <h2 id="composition-title">Composition</h2>
        </div>
        <span className="result-count">{report.roleRegistryVersion}</span>
      </div>

      <dl className="composition-summary">
        <div><dt>Main cards</dt><dd>{report.main.cardCount}</dd></div>
        <div><dt>Main uniques</dt><dd>{report.main.uniqueCardCount}</dd></div>
        <div><dt>Legends</dt><dd>{report.legends.cardCount}</dd></div>
        <div><dt>Role buckets</dt><dd>{report.main.roleBuckets.length}</dd></div>
      </dl>

      <div className="composition-grid">
        <BucketBars title="Colors" buckets={report.main.colorBuckets} total={report.main.cardCount} cards={cardNames} />
        <BucketBars title="Types" buckets={report.main.typeBuckets} total={report.main.cardCount} cards={cardNames} />
        <BucketBars title="Costs" buckets={report.main.costBuckets} total={report.main.cardCount} cards={cardNames} />
        <BucketBars title="Power" buckets={report.main.powerBuckets} total={report.main.cardCount} cards={cardNames} />
        <BucketBars title="Keywords" buckets={report.main.keywordBuckets} total={report.main.cardCount} cards={cardNames} />
        <section className="composition-block composition-roles" aria-labelledby="composition-roles">
          <h3 id="composition-roles">Roles</h3>
          <div className="composition-role-list">
            {report.main.roleBuckets.map((bucket) => (
              <details key={bucket.roleId}>
                <summary>
                  <span>{bucket.label}</span>
                  <strong>{bucket.copyCount}</strong>
                </summary>
                <p>{bucket.description}</p>
                <ul>
                  {bucket.cardIds.map((cardId) => (
                    <li key={cardId}>{cardNames.get(cardId)?.display_name ?? cardId}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>
      </div>

      {report.versionComparisons.length > 0 && (
        <details className="composition-versions">
          <summary>Compare saved versions</summary>
          <div className="composition-version-list">
            {report.versionComparisons.slice(0, 3).map((comparison) => (
              <article key={comparison.versionId}>
                <strong>{comparison.versionName}</strong>
                <span>Main {comparison.mainCardDelta >= 0 ? "+" : ""}{comparison.mainCardDelta}</span>
                <span>Legends {comparison.legendCardDelta >= 0 ? "+" : ""}{comparison.legendCardDelta}</span>
              </article>
            ))}
          </div>
        </details>
      )}

      {report.warnings.length > 0 && (
        <div className="composition-warnings">
          {report.warnings.map((warning) => (
            <details key={warning.code}>
              <summary>{warning.message}</summary>
              <p>{warning.affectedCards.map((cardId) => cardNames.get(cardId)?.display_name ?? cardId).join(", ")}</p>
            </details>
          ))}
        </div>
      )}

      <details className="eddy-assumptions">
        <summary>Analysis assumptions</summary>
        <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
    </section>
  );
});

import { useMemo } from "react";
import { cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Card, Deck, GigConditionId, GigMatchState, GigRollProfile } from "@gigsmith/data-contracts";
import { analyzeGigOdds } from "@gigsmith/rules-core";

const conditionLabels: Record<GigConditionId, string> = {
  "high-8": "8+ value",
  maximum: "maximum value",
  minimum: "minimum value",
  "parity-mix": "even + odd",
  "distinct-2": "2 different values",
  "distinct-3": "3 different values",
  "value-pair": "same-value pair",
  "cost-match": "deck-cost match",
  "street-cred-20": "20 Street Cred",
  "street-cred-lead": "more Cred than Rival",
  "street-cred-trail": "less Cred than Rival"
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function cardNames(cardIds: string[], cards: Map<string, Card>): string {
  return cardIds.map((cardId) => cards.get(cardId)?.display_name ?? cardId).join(", ");
}

function profileMetric(profile: GigRollProfile, condition: GigConditionId): string {
  switch (condition) {
    case "high-8": return percent(profile.high8Probability);
    case "maximum": return percent(profile.maximumProbability);
    case "minimum": return percent(profile.minimumProbability);
    case "parity-mix": return percent(profile.parityMixProbability);
    case "distinct-2": return percent(profile.distinct2Probability);
    case "distinct-3": return percent(profile.distinct3Probability);
    case "value-pair": return percent(profile.valuePairProbability);
    case "cost-match": return profile.expectedCostMatchDensity == null ? "n/a" : percent(profile.expectedCostMatchDensity);
    case "street-cred-20": return percent(profile.streetCred20Probability);
    default: return "Rival state required";
  }
}

export function GigOddsPanel({ deck, match }: { deck: Deck; match: GigMatchState }) {
  const report = useMemo(
    () => analyzeGigOdds(deck, cyberpunkCardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable, match),
    [deck, match]
  );
  const cards = useMemo(() => new Map(cyberpunkCardDb.cards.map((card) => [card.id, card])), []);
  const supportedDemands = report.demands.filter((demand) => demand.supported);

  return (
    <section className="panel gig-odds-panel" aria-labelledby="gig-odds-title">
      <div className="panel-title gig-odds-title">
        <div><p className="section-kicker">Deck-driven exact rolls</p><h2 id="gig-odds-title">Gig Odds &amp; Color Goals</h2></div>
        <span className="result-count">{report.registryVersion}</span>
      </div>

      <div className="gig-odds-layout">
        <section aria-labelledby="gig-demand-title">
          <h3 id="gig-demand-title">Deck Demand</h3>
          <div className="gig-demand-list">
            {report.demands.map((demand) => (
              <div className={`gig-demand${demand.supported ? "" : " unsupported"}`} key={demand.condition}>
                <div><strong>{conditionLabels[demand.condition]}</strong><span>{demand.colors.join("/")} · {demand.copies} {demand.copies === 1 ? "copy" : "copies"}</span></div>
                <small>{cardNames(demand.cardIds, cards)}</small>
                {!demand.supported && <em>Rival board state required</em>}
              </div>
            ))}
            {report.demands.length === 0 && <div className="empty-state">No current deck cards have curated Gig-value payoffs.</div>}
          </div>
        </section>

        <section aria-labelledby="gig-order-title">
          <div className="gig-order-heading">
            <h3 id="gig-order-title">Recommended Natural Order</h3>
            <span>{supportedDemands.length > 0 ? "Weighted by deck copies" : "No scored demand"}</span>
          </div>
          <div className="die-order" aria-label={`Recommended die order: ${report.recommendedOrder.join(", ")}`}>
            {report.recommendedOrder.map((dieType, index) => <span key={dieType}><small>{index + 1}</small>{dieType}</span>)}
          </div>
          <div className="gig-odds-table-scroll" role="region" aria-label="Gig probability by turn" tabIndex={0}>
            <table className="gig-odds-table">
              <thead><tr><th scope="col">Turn</th><th scope="col">Die</th><th scope="col">8+</th><th scope="col">Min</th><th scope="col">Even + odd</th><th scope="col">Pair</th><th scope="col">3 values</th><th scope="col">Expected Cred</th></tr></thead>
              <tbody>{report.turns.map((turn) => (
                <tr key={turn.turn}><th scope="row">{turn.turn}</th><td>{turn.dieType}</td><td>{percent(turn.profile.high8Probability)}</td><td>{percent(turn.profile.minimumProbability)}</td><td>{percent(turn.profile.parityMixProbability)}</td><td>{percent(turn.profile.valuePairProbability)}</td><td>{percent(turn.profile.distinct3Probability)}</td><td>{turn.profile.expectedStreetCred.toFixed(1)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      </div>

      {report.nextDieOptions.length > 0 && supportedDemands.length > 0 && (
        <section className="next-die-analysis" aria-labelledby="next-die-title">
          <div className="gig-order-heading"><h3 id="next-die-title">Your Next Fixer Die</h3><span>Uses current Gig values</span></div>
          <div className="next-die-options">
            {report.nextDieOptions.map((option) => (
              <article key={option.dieType}>
                <strong>{option.dieType}</strong>
                <span>Deck fit {percent(option.deckFitScore)}</span>
                <dl>{supportedDemands.slice(0, 3).map((demand) => <div key={demand.condition}><dt>{conditionLabels[demand.condition]}</dt><dd>{profileMetric(option.profile, demand.condition)}</dd></div>)}</dl>
              </article>
            ))}
          </div>
        </section>
      )}

      <details className="eddy-assumptions gig-odds-assumptions">
        <summary>Probability method and limits</summary>
        <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
    </section>
  );
}

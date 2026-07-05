import { useMemo } from "react";
import { cyberpunkGigRequirements, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Card, CardDatabase, Deck, GigConditionId, GigMatchState, GigRollProfile } from "@gigsmith/data-contracts";
import { analyzeGigOdds, availableFixerGigs, gainGig, gigDieMaximum } from "@gigsmith/rules-core";
import { measurePerformance } from "../performanceInstrumentation";

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

function profileMetric(profile: GigRollProfile, condition: GigConditionId, friendlyValues: number[]): string {
  const distinctFriendlyValues = new Set(friendlyValues).size;
  if (condition === "distinct-2" && friendlyValues.length === 0) return "Need 1 Gig";
  if (condition === "distinct-3" && distinctFriendlyValues < 2) return "Need 2 values";
  if ((condition === "parity-mix" || condition === "value-pair") && friendlyValues.length === 0) return "Need 1 Gig";
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

function optionReason(
  profile: GigRollProfile,
  demands: Array<{ condition: GigConditionId; copies: number }>
): string {
  const scored = demands
    .map((demand) => ({
      demand,
      value: conditionValueForReason(profile, demand.condition)
    }))
    .filter((entry): entry is { demand: { condition: GigConditionId; copies: number }; value: number } => entry.value !== undefined)
    .sort((left, right) => {
      const weightedDelta = right.value * right.demand.copies - left.value * left.demand.copies;
      if (weightedDelta !== 0) return weightedDelta;
      return right.demand.copies - left.demand.copies;
    });
  const top = scored.slice(0, 2).map((entry) => conditionLabels[entry.demand.condition]);
  return top.length > 0 ? top.join(" + ") : "No scored deck goal";
}

function conditionValueForReason(profile: GigRollProfile, condition: GigConditionId): number | undefined {
  switch (condition) {
    case "high-8": return profile.high8Probability;
    case "maximum": return profile.maximumProbability;
    case "minimum": return profile.minimumProbability;
    case "parity-mix": return profile.parityMixProbability;
    case "distinct-2": return profile.distinct2Probability;
    case "distinct-3": return profile.distinct3Probability;
    case "value-pair": return profile.valuePairProbability;
    case "cost-match": return profile.expectedCostMatchDensity ?? undefined;
    case "street-cred-20": return profile.streetCred20Probability;
    default: return undefined;
  }
}

interface GigOddsPanelProps {
  deck: Deck;
  cardDb: CardDatabase;
  match: GigMatchState;
  onMatchChange: (match: GigMatchState) => void;
}

export function GigOddsPanel({ deck, cardDb, match, onMatchChange }: GigOddsPanelProps) {
  const analysisPlayerId = "player";
  const report = useMemo(
    () => measurePerformance(
      "gig.odds",
      () => analyzeGigOdds(deck, cardDb, cyberpunkGigRequirements, cyberpunkRulesetV1Printable, match, analysisPlayerId),
      {
        controlledGigs: match.gigs.filter((gig) => gig.controllerId === analysisPlayerId).length,
        availableGigs: match.gigs.filter((gig) => !gig.controllerId).length
      }
    ),
    [cardDb, deck, match]
  );
  const cards = useMemo(() => new Map(cardDb.cards.map((card) => [card.id, card])), [cardDb]);
  const supportedDemands = report.demands.filter((demand) => demand.supported);
  const friendlyValues = match.gigs.filter((gig) => gig.controllerId === analysisPlayerId).map((gig) => gig.value);
  const availableGigs = availableFixerGigs(match, cyberpunkRulesetV1Printable);
  const availableGigIds = new Set(availableGigs.map((gig) => gig.id));
  const availableDieTypes = new Set(
    availableGigs
      .filter((gig) => gig.ownerId === analysisPlayerId)
      .map((gig) => gig.dieType)
  );

  function rollAndGain(dieType: string) {
    const gig = match.gigs.find((candidate) => candidate.ownerId === analysisPlayerId && candidate.dieType === dieType && !candidate.controllerId);
    if (!gig || !availableGigIds.has(gig.id) || match.gainedGigThisTurn) return;
    const value = Math.floor(Math.random() * gigDieMaximum(gig.dieType)) + 1;
    onMatchChange(gainGig(match, gig.id, value, cyberpunkRulesetV1Printable).state);
  }

  return (
    <section className="panel gig-odds-panel" aria-labelledby="gig-odds-title">
      <div className="panel-title gig-odds-title">
        <div><p className="section-kicker">Live deck-driven rolls</p><h2 id="gig-odds-title">Gig Odds &amp; Color Goals</h2></div>
        <span className="result-count">{report.registryVersion}</span>
      </div>

      {report.nextDieOptions.length > 0 && supportedDemands.length > 0 && (
        <section className="next-die-analysis" aria-labelledby="next-die-title">
          <div className="gig-order-heading">
            <h3 id="next-die-title">Your Next Fixer Die</h3>
            <span>{friendlyValues.length > 0 ? `Your Gig values: ${friendlyValues.join(", ")}` : "No friendly Gigs yet"}</span>
          </div>
          <div className="next-die-options">
            {report.nextDieOptions.map((option) => (
              <article key={option.dieType}>
                <strong>{option.dieType}</strong>
                <span>Deck fit {percent(option.deckFitScore)}</span>
                <small className="next-die-reason">Why: {optionReason(option.profile, supportedDemands)}</small>
                <dl>{supportedDemands.slice(0, 3).map((demand) => <div key={demand.condition}><dt>{conditionLabels[demand.condition]}</dt><dd>{profileMetric(option.profile, demand.condition, friendlyValues)}</dd></div>)}</dl>
                <button
                  aria-label={`Roll and gain your ${option.dieType}`}
                  disabled={!availableDieTypes.has(option.dieType) || match.gainedGigThisTurn}
                  onClick={() => rollAndGain(option.dieType)}
                >
                  Roll &amp; gain
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      <details className="gig-deep-analysis">
        <summary>Deck demand and natural-order analysis</summary>
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
      </details>

      <details className="eddy-assumptions gig-odds-assumptions">
        <summary>Probability method and limits</summary>
        <ul>{report.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
      </details>
    </section>
  );
}

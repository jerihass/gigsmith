# Mulligan Analysis

Gigsmith models the printable guide's mulligan procedure: after drawing six cards, a player may mulligan once by shuffling the entire hand back into the deck and drawing six new cards.

## Comparison Methods

The analysis enumerates every possible opening hand when the number of physical-card combinations is at most 50,000. Larger decks use 2,000 deterministic samples derived from the visible seed. Simulation reports include a 95% margin of error for the composite score.

The report is versioned as `mulligan-analysis.v1` and records the ruleset, card snapshot, seed, method, and sample size.

## Metrics

- Printed cost: known printed costs only.
- Sellable cards: cards marked sellable by the active snapshot.
- Gross first-turn capacity: ready Legend capacity plus starting Eddies and at most one available sale.
- Playable cards: cards with printed cost at or below gross first-turn capacity.

The selectable goals weight these metrics differently:

- Balanced opening: playable cards, Eddy supply, then lower cost.
- Early plays: playable cards dominate the comparison.
- Eddy supply: sellable density dominates the comparison.

## Recommendation Limits

Results use `Lean keep`, `Lean mulligan`, or `Close call`. They are directional comparisons under the selected goal, not objectively correct plays. Card text, matchup knowledge, combos, play sequencing, Gig state, and the identity of a card sold for an Eddie are not modeled. These limitations remain visible in the interface and structured report.

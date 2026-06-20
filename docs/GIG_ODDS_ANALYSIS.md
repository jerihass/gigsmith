# Gig Odds And Deck Synergy

Gigsmith uses exact enumeration to connect natural Gig rolls with curated card payoffs in the active deck. It does not infer strategy from card color alone or parse card text at runtime.

## Curated Goals

The registry `gig-requirements.2026-06-20` currently models:

- Red: value 8+, maximum-value Gigs, and 20 Street Cred.
- Blue: minimum-value Gigs.
- Yellow: even-and-odd coverage, different values, and values matching deck costs.
- Green: same-value pairs.

Cards comparing Street Cred with a Rival are listed as demand but are not scored without rival state. Cards that adjust, set, reroll, or steal Gigs remain visible as enablers; their effects are not added to natural-roll probabilities.

## Exact Method

For every legal subset of `d4`, `d6`, `d8`, `d10`, and `d12`, Gigsmith enumerates every face combination. The full six-die profile adds the mandatory-last `d20` and contains 460,800 outcomes.

The analyzer checks all 120 orders of the first five dice. Each order receives a cumulative deck-fit score across turns 1-6, weighted by copies of cards with supported Gig conditions. The report exposes the winning order and exact per-turn probabilities instead of claiming that it is universally optimal.

Cost matching is the expected proportion of known-cost main-deck copies whose printed cost equals at least one rolled friendly Gig value. It does not simulate Hanako's top-four search or an opponent's discard.

## Current Match

The Analysis view reads the shared Gig match state. For each legal next Fixer die, it holds current friendly Gig values constant, enumerates every face on that candidate die, and reports deck-fit and the three most represented supported goals. Original die ownership and the d20-last rule remain enforced by the match tracker.

## Limits

- Rolls are independent and every face is equally likely.
- Rival-relative Street Cred cannot be evaluated without a rival deck and projected rival state.
- Gig manipulation card effects and sequencing are not simulated.
- Recommendations optimize enabled payoff density, not complete game win probability.

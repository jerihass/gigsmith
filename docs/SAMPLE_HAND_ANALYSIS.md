# Sample-Hand Analysis

Gigsmith draws sample opening hands with a deterministic seeded shuffle. The same deck order, copy counts, and seed produce the same result, which makes a hand reproducible for discussion and regression testing.

## Scope

- Draws the ruleset's six-card opening hand from main-deck copies only.
- Reports printed cost, sellable status, and card classifications from the active card snapshot.
- Never mutates or persists changes to the deck.
- Returns structured issues for unknown cards, invalid copy counts, and decks shorter than the requested hand.

Sample generation does not itself model card draw effects, card-text interactions, or play sequencing. The adjacent mulligan comparison evaluates a full-hand redraw using the limits documented in `MULLIGAN_ANALYSIS.md`.

## Reproduction

Enter a seed and select **Generate**. Share that seed with the same deck export and data versions to reproduce the hand. **New seed** creates a different seed and immediately draws another hand.

The report records both `rulesetVersion` and `cardDataVersion`; a matching seed alone is not a guarantee across different deck or snapshot versions.

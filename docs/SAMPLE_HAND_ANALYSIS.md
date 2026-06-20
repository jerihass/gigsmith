# Sample-Hand Analysis

Gigsmith draws sample opening hands with a deterministic seeded shuffle. The same deck order, copy counts, and seed produce the same result, which makes a hand reproducible for discussion and regression testing.

## Scope

- Draws the ruleset's six-card opening hand from main-deck copies only.
- Reports printed cost, sellable status, and card classifications from the active card snapshot.
- Never mutates or persists changes to the deck.
- Returns structured issues for unknown cards, invalid copy counts, and decks shorter than the requested hand.

The analysis does not model mulligans, card draw effects, card-text interactions, or play sequencing. Those limitations remain visible beside every result. Mulligan comparisons are tracked separately as `GS-081`.

## Reproduction

Enter a seed and select **Generate**. Share that seed with the same deck export and data versions to reproduce the hand. **New seed** creates a different seed and immediately draws another hand.

The report records both `rulesetVersion` and `cardDataVersion`; a matching seed alone is not a guarantee across different deck or snapshot versions.

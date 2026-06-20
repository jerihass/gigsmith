# Deck Edit History

Gigsmith keeps a bounded in-memory edit history for each local deck.

## Recorded Edits

The previous deck snapshot is recorded before these active-deck changes:

- deck name changes
- adding or removing a Legend
- changing main-deck card counts
- importing text or JSON into the active deck
- resetting to the starter shell
- applying a card-data or ruleset baseline upgrade

Undo and redo restore the whole deck snapshot, so validation, RAM limits, counts,
and analysis all recalculate from the restored deck.

## Boundaries

- Each deck has an independent history capped at 50 previous snapshots.
- A new edit after undo clears that deck's redo stack.
- Switching decks preserves each deck's in-memory history.
- New, duplicated, and shared decks start with empty history.
- Deleting a deck deletes its history.
- Reloading the application clears all history but keeps the latest saved decks.
- History is not exported and does not change the deck JSON or local-storage schema.


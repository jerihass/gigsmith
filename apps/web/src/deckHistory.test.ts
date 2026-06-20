import { describe, expect, it } from "vitest";
import type { Deck } from "@gigsmith/data-contracts";
import { createValidDeck } from "@gigsmith/test-fixtures";
import {
  dropDeckHistory,
  getDeckHistory,
  recordDeckEdit,
  redoDeckEdit,
  undoDeckEdit,
  type DeckHistories
} from "./deckHistory";

function deck(id: string, name: string): Deck {
  return { ...createValidDeck(), id, name };
}

describe("deck history", () => {
  it("records, undoes, and redoes edits for one deck", () => {
    const original = deck("one", "Original");
    const edited = deck("one", "Edited");
    const histories = recordDeckEdit({}, original);
    const undone = undoDeckEdit(histories, edited);

    expect(undone.deck?.name).toBe("Original");
    const redone = redoDeckEdit(undone.histories, undone.deck!);
    expect(redone.deck?.name).toBe("Edited");
  });

  it("clears redo history when a new edit branches", () => {
    const original = deck("one", "Original");
    const edited = deck("one", "Edited");
    const undone = undoDeckEdit(recordDeckEdit({}, original), edited);
    const branched = recordDeckEdit(undone.histories, undone.deck!);

    expect(getDeckHistory(branched, "one").future).toEqual([]);
  });

  it("keeps deck histories isolated", () => {
    let histories: DeckHistories = recordDeckEdit({}, deck("one", "One"));
    histories = recordDeckEdit(histories, deck("two", "Two"));

    const result = undoDeckEdit(histories, deck("one", "One edited"));
    expect(result.deck?.name).toBe("One");
    expect(getDeckHistory(result.histories, "two").past).toHaveLength(1);
  });

  it("bounds history to the configured limit", () => {
    let histories: DeckHistories = {};
    for (let index = 0; index < 5; index += 1) {
      histories = recordDeckEdit(histories, deck("one", String(index)), 3);
    }

    expect(getDeckHistory(histories, "one").past.map((entry) => entry.name)).toEqual(["2", "3", "4"]);
  });

  it("drops only the deleted deck history", () => {
    const histories = {
      ...recordDeckEdit({}, deck("one", "One")),
      ...recordDeckEdit({}, deck("two", "Two"))
    };

    const next = dropDeckHistory(histories, "one");
    expect(next.one).toBeUndefined();
    expect(next.two).toBeDefined();
  });

  it("returns no transition when undo or redo is unavailable", () => {
    const current = deck("one", "Current");
    expect(undoDeckEdit({}, current).deck).toBeUndefined();
    expect(redoDeckEdit({}, current).deck).toBeUndefined();
  });
});

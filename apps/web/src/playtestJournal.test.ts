import { describe, expect, it } from "vitest";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { addDeckVersion } from "./deckVersions";
import {
  createPlaytestRecord,
  deletePlaytestRecord,
  loadPlaytestJournal,
  playtestJournalStorageKey,
  savePlaytestJournal,
  summarizePlaytests,
  upsertPlaytestRecord,
  type PlaytestJournal
} from "./playtestJournal";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("playtest journal", () => {
  it("records an immutable deck-version snapshot", () => {
    const versioned = addDeckVersion(createValidDeck({ name: "Event Deck" }), "Round 1", {
      id: "version-1",
      createdAt: "2026-06-28T12:00:00.000Z"
    });
    const version = versioned.versions![0];
    const record = createPlaytestRecord({
      id: "record-1",
      deck: versioned,
      deckVersion: version,
      playedAt: "2026-06-29",
      result: "win",
      playerOrder: "first",
      opponentName: "Blue Control",
      opponentColors: ["Blue"],
      turns: 5,
      finalStreetCred: 21,
      event: "Store Night",
      tags: ["testing"],
      now: "2026-06-29T00:00:00.000Z"
    });
    versioned.main = [];

    expect(record.deck).toMatchObject({
      deckId: versioned.id,
      deckName: "Event Deck",
      deckVersionId: "version-1",
      deckVersionName: "Round 1",
      rulesetVersion: version.rulesetVersion,
      cardDataVersion: version.cardDataVersion
    });
    expect(record.deck.main).toEqual(version.main);
    expect(record.opponent).toEqual({ name: "Blue Control", colors: ["Blue"] });
  });

  it("upserts, deletes, persists, and ignores invalid stored records", () => {
    const deck = createValidDeck();
    const first = createPlaytestRecord({
      id: "one",
      deck,
      playedAt: "2026-06-29",
      result: "loss",
      playerOrder: "second",
      now: "2026-06-29T00:00:00.000Z"
    });
    const edited = { ...first, result: "draw" as const, updatedAt: "2026-06-29T01:00:00.000Z" };
    const journal = upsertPlaytestRecord(upsertPlaytestRecord({ version: 1, records: [] }, first), edited);

    expect(journal.records).toHaveLength(1);
    expect(journal.records[0].result).toBe("draw");
    expect(deletePlaytestRecord(journal, "one").records).toEqual([]);

    const memory = storage();
    savePlaytestJournal(memory, journal);
    const malformed: PlaytestJournal = { version: 1, records: [edited, { id: "bad" } as never] };
    memory.setItem(playtestJournalStorageKey, JSON.stringify(malformed));
    expect(loadPlaytestJournal(memory).records).toEqual([edited]);
  });

  it("summarizes sample size, results, player order, turns, colors, and tags", () => {
    const deck = createValidDeck();
    const records = [
      createPlaytestRecord({
        id: "one",
        deck,
        playedAt: "2026-06-29",
        result: "win",
        playerOrder: "first",
        opponentColors: ["Red", "Blue"],
        turns: 4,
        tags: ["starter"],
        now: "2026-06-29T00:00:00.000Z"
      }),
      createPlaytestRecord({
        id: "two",
        deck,
        playedAt: "2026-06-29",
        result: "loss",
        playerOrder: "unknown",
        opponentColors: ["Blue"],
        tags: ["starter", "tempo"],
        now: "2026-06-29T01:00:00.000Z"
      })
    ];

    expect(summarizePlaytests(records)).toMatchObject({
      sampleSize: 2,
      wins: 1,
      losses: 1,
      draws: 0,
      firstPlayer: 1,
      secondPlayer: 0,
      unknownPlayerOrder: 1,
      averageTurns: 4,
      opponentColors: [{ color: "Blue", count: 2 }, { color: "Red", count: 1 }],
      tags: [{ tag: "starter", count: 2 }, { tag: "tempo", count: 1 }]
    });
  });
});

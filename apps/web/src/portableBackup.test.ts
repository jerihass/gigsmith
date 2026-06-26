import { describe, expect, it } from "vitest";
import { cyberpunkCardSnapshot, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { createGigMatch } from "@gigsmith/rules-core";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { addDeck, createDeckLibrary } from "./deckLibrary";
import {
  exportPortableBackup,
  importPortableBackup,
  mergeBackupDeckLibrary
} from "./portableBackup";

function backupInput() {
  const first = createValidDeck({ id: "one", name: "One" });
  const second = createValidDeck({ id: "two", name: "Two" });
  return {
    library: addDeck(createDeckLibrary(first), second),
    preferences: { theme: "neon" as const, cardArtEnabled: true, activeView: "gigs" as const },
    cardDatabaseOverride: cyberpunkCardSnapshot,
    gigMatch: createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable)
  };
}

describe("portable backup", () => {
  it("round-trips all supported local data", () => {
    const document = exportPortableBackup(backupInput());
    const result = importPortableBackup(document);

    expect(result.errors).toEqual([]);
    expect(result.backup).toMatchObject({
      schema: "gigsmith.backup",
      version: 1,
      library: { decks: [{ id: "one" }, { id: "two" }] },
      preferences: { theme: "neon", cardArtEnabled: true, activeView: "gigs" },
      cardDatabaseOverride: { metadata: cyberpunkCardSnapshot.metadata },
      gigMatch: { playerIds: ["player", "rival"] }
    });
  });

  it.each([
    "not json",
    JSON.stringify({ schema: "gigsmith.deck", version: 1 }),
    JSON.stringify({ schema: "gigsmith.backup", version: 2 }),
    JSON.stringify({ schema: "gigsmith.backup", version: 1, exportedAt: "today" })
  ])("rejects invalid documents", (document) => {
    expect(importPortableBackup(document).backup).toBeUndefined();
  });

  it("merges backup decks without overwriting local decks or colliding IDs", () => {
    const local = createDeckLibrary(createValidDeck({ id: "one", name: "Local" }));
    const imported = backupInput().library;
    const result = mergeBackupDeckLibrary(local, imported, () => "new-id");

    expect(result.addedDeckCount).toBe(2);
    expect(result.library.activeDeckId).toBe("one");
    expect(result.library.decks.map((deck) => deck.id)).toEqual(["one", "new-id", "two"]);
    expect(result.library.decks[0].name).toBe("Local");
  });
});

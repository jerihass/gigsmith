import { describe, expect, it } from "vitest";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { exportDeckJson, importDeckJson } from "./deckJson";

describe("deck JSON import/export", () => {
  it("round-trips all portable deck fields without local metadata", () => {
    const deck = createValidDeck({
      id: "device-local-id",
      metadata: {
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
        notes: "Keep the pressure on."
      }
    });
    const text = exportDeckJson(deck, { exportedAt: "2026-06-19T12:00:00.000Z" });
    const result = importDeckJson(text);

    expect(result.errors).toEqual([]);
    expect(result.document).toEqual({
      schema: "gigsmith.deck",
      version: 1,
      exportedAt: "2026-06-19T12:00:00.000Z",
      deck: {
        name: deck.name,
        legends: deck.legends,
        main: deck.main,
        formatId: deck.formatId,
        rulesetVersion: deck.rulesetVersion,
        cardDataVersion: deck.cardDataVersion,
        notes: "Keep the pressure on."
      }
    });
    expect(text).not.toContain("device-local-id");
    expect(text).not.toContain("createdAt");
  });

  it("reports a missing required field with its path", () => {
    const value = JSON.parse(exportDeckJson(createValidDeck())) as Record<string, unknown>;
    const deck = value.deck as Record<string, unknown>;
    delete deck.formatId;

    const result = importDeckJson(JSON.stringify(value));

    expect(result.document).toBeUndefined();
    expect(result.errors).toContainEqual({
      code: "invalid-field",
      path: "$.deck.formatId",
      message: "Expected a non-empty string."
    });
  });

  it("reports malformed JSON without throwing", () => {
    expect(importDeckJson("{")).toEqual({
      errors: [{
        code: "invalid-json",
        path: "$",
        message: "Input is not valid JSON."
      }]
    });
  });

  it("preserves unknown card IDs for versioned validation", () => {
    const value = JSON.parse(exportDeckJson(createValidDeck())) as {
      deck: { main: Array<{ cardId: string; count: number }> };
    };
    value.deck.main[0] = { cardId: "future-card-id", count: 3 };

    const result = importDeckJson(JSON.stringify(value));

    expect(result.errors).toEqual([]);
    expect(result.document?.deck.main[0]).toEqual({ cardId: "future-card-id", count: 3 });
  });

  it("accepts unknown future fields but rejects future document versions", () => {
    const value = JSON.parse(exportDeckJson(createValidDeck())) as Record<string, unknown>;
    value.futureField = { ignored: true };
    expect(importDeckJson(JSON.stringify(value)).errors).toEqual([]);

    value.version = 2;
    expect(importDeckJson(JSON.stringify(value)).errors).toContainEqual({
      code: "unsupported-version",
      path: "$.version",
      message: "Deck document version 2 is not supported."
    });
  });
});

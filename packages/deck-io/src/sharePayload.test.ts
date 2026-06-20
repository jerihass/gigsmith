import { describe, expect, it } from "vitest";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { decodeDeckSharePayload, encodeDeckSharePayload } from "./sharePayload";

describe("deck share payload", () => {
  it("round-trips a deck through URL-safe encoding", () => {
    const deck = createValidDeck();
    const payload = encodeDeckSharePayload(deck, {
      exportedAt: "2026-06-19T12:00:00.000Z"
    });
    const result = decodeDeckSharePayload(payload);

    expect(payload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.errors).toEqual([]);
    expect(result.document?.deck).toMatchObject({
      name: deck.name,
      legends: deck.legends,
      main: deck.main,
      formatId: deck.formatId,
      rulesetVersion: deck.rulesetVersion,
      cardDataVersion: deck.cardDataVersion
    });
  });

  it("returns a useful error for a malformed payload", () => {
    expect(decodeDeckSharePayload("not valid!")).toEqual({
      errors: [{
        code: "invalid-payload",
        path: "$",
        message: "Shared deck payload is not valid base64url data."
      }]
    });
  });

  it("passes decoded document-version errors through", () => {
    const payload = encodeDeckSharePayload(createValidDeck());
    const document = decodeDeckSharePayload(payload).document;
    expect(document).toBeDefined();

    const bytes = new TextEncoder().encode(JSON.stringify({ ...document, version: 2 }));
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const futurePayload = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

    expect(decodeDeckSharePayload(futurePayload).errors[0]?.code).toBe("unsupported-version");
  });
});

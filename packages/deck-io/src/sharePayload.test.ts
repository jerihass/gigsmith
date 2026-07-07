import { describe, expect, it } from "vitest";
import { createValidDeck } from "@gigsmith/test-fixtures";
import { exportDeckJson } from "./deckJson";
import { deckInputLimits } from "./limits";
import { decodeDeckSharePayload, encodeDeckSharePayload } from "./sharePayload";

function encodeLegacyFullDocument(deck: ReturnType<typeof createValidDeck>): string {
  const bytes = new TextEncoder().encode(JSON.stringify(JSON.parse(exportDeckJson(deck)) as unknown));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

describe("deck share payload", () => {
  it("round-trips a deck through compact URL-safe encoding", () => {
    const deck = createValidDeck();
    const payload = encodeDeckSharePayload(deck, {
      exportedAt: "2026-06-19T12:00:00.000Z"
    });
    const result = decodeDeckSharePayload(payload);

    expect(payload).toMatch(/^g1\|/);
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

  it("keeps compact share payloads materially smaller than full deck documents", () => {
    const deck = createValidDeck();
    const compactPayload = encodeDeckSharePayload(deck);
    const fullPayload = encodeLegacyFullDocument(deck);

    expect(compactPayload.length).toBeLessThan(fullPayload.length * 0.5);
  });

  it("survives URL hash parsing", () => {
    const deck = createValidDeck();
    const url = new URL("https://example.test/gigsmith/");
    url.hash = `deck=${encodeDeckSharePayload(deck)}`;
    const payload = new URLSearchParams(url.hash.slice(1)).get("deck");

    expect(payload).toBeTruthy();
    expect(decodeDeckSharePayload(payload ?? "").document?.deck.name).toBe(deck.name);
  });

  it("continues to decode legacy full-document share payloads", () => {
    const deck = createValidDeck();
    const result = decodeDeckSharePayload(encodeLegacyFullDocument(deck));

    expect(result.errors).toEqual([]);
    expect(result.document?.deck).toMatchObject({
      name: deck.name,
      legends: deck.legends,
      main: deck.main
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

  it("rejects oversized payloads before base64 decoding", () => {
    expect(decodeDeckSharePayload("A".repeat(deckInputLimits.sharePayloadCharacters + 1)).errors[0]).toMatchObject({
      code: "invalid-payload",
      path: "$"
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

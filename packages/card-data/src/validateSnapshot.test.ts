import { describe, expect, it } from "vitest";
import { cyberpunkCardSnapshot } from "./index";
import { validateCardSnapshot } from "./validateSnapshot";

describe("validateCardSnapshot", () => {
  it("accepts the bundled Cyberpunk card snapshot", () => {
    const result = validateCardSnapshot(cyberpunkCardSnapshot);
    expect(result).toEqual({ valid: true, errors: [] });
    expect(cyberpunkCardSnapshot.metadata.sourceCardCount).toBe(60);
    expect(cyberpunkCardSnapshot.cards.map((card) => card.external_id)).toEqual(
      expect.arrayContaining([
        "cb-sketchy-ripper",
        "cb-lizzy-wizzy-delicate-weapon"
      ])
    );
  });

  it("reports missing card ids with paths", () => {
    const snapshot = structuredClone(cyberpunkCardSnapshot) as unknown as {
      cards: Array<Record<string, unknown>>;
    };
    delete snapshot.cards[0].id;

    const result = validateCardSnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "cards[0].id",
      message: "Expected a non-empty string."
    });
  });

  it("reports invalid card types", () => {
    const snapshot = structuredClone(cyberpunkCardSnapshot) as unknown as {
      cards: Array<Record<string, unknown>>;
    };
    snapshot.cards[0].card_type = "ResourceThing";

    const result = validateCardSnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "cards[0].card_type",
      message: "Expected one of: Legend, Unit, Program, Gear."
    });
  });

  it("reports missing metadata count", () => {
    const snapshot = structuredClone(cyberpunkCardSnapshot) as unknown as {
      metadata: Record<string, unknown>;
    };
    delete snapshot.metadata.sourceCardCount;

    const result = validateCardSnapshot(snapshot);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      path: "metadata.sourceCardCount",
      message: "Expected a non-negative integer."
    });
  });
});

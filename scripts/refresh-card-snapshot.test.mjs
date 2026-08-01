import { describe, expect, it } from "vitest";
import { createCardSnapshot, sanitizeNetdeckCard } from "./refresh-card-snapshot.mjs";

describe("card snapshot refresh", () => {
  it("removes transient image signatures while preserving a stable artwork reference", () => {
    const card = sanitizeNetdeckCard({
      id: "card-1",
      image_url: "https://images.example/card.webp?Expires=1&Signature=temporary"
    });

    expect(card).not.toHaveProperty("image_url");
    expect(card.source_image_url).toBe("https://images.example/card.webp");
  });

  it("creates versioned metadata only for a complete payload", () => {
    const snapshot = createCardSnapshot({ total: 2, items: [{ id: "one" }, { id: "two" }] }, {
      sourceUrl: "https://api.example/cards",
      retrievedAt: "2026-07-31T12:00:00.000Z",
      etag: 'W/"cards-v3"'
    });

    expect(snapshot.metadata.cardDataVersion).toBe("netdeck-cyberpunk-2026-07-31");
    expect(snapshot.metadata.sourceCardCount).toBe(2);
    expect(snapshot.metadata.notes).toContain('W/"cards-v3"');
  });

  it("rejects an incomplete payload", () => {
    expect(() => createCardSnapshot({ total: 2, items: [{ id: "one" }] }, {
      sourceUrl: "https://api.example/cards"
    })).toThrow("received 1 of 2 cards");
  });
});

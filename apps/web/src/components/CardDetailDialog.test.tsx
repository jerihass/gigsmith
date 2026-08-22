import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cyberpunkCardDb } from "@gigsmith/card-data";
import { CardDetailDialog } from "./CardDetailDialog";

describe("CardDetailDialog", () => {
  it("distinguishes the current printing set from alternate sets", () => {
    const card = {
      ...cyberpunkCardDb.cards[0],
      set: { code: "CORE", name: "Core Set" },
      printings: [
        { printing_id: "current", set: { code: "CORE", name: "Core Set" } },
        { printing_id: "promo", set: { code: "PRM01", name: "Set 1 Promos" } },
        { printing_id: "starter", set: { code: "START", name: "Starter Deck" } }
      ]
    };

    const markup = renderToStaticMarkup(
      <CardDetailDialog
        card={card}
        artEnabled={false}
        artSourcePending={false}
        sourceUrl="https://example.test/cards"
        onClose={() => undefined}
      />
    );

    expect(markup).toContain("Current set");
    expect(markup).toContain("Core Set");
    expect(markup).toContain("CORE");
    expect(markup).toContain("Also printed in");
    expect(markup).toContain("Set 1 Promos (PRM01)");
    expect(markup).toContain("Starter Deck (START)");
  });
});

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DeckRecovery } from "./DeckRecovery";

describe("DeckRecovery", () => {
  it("renders the preserved payload and non-destructive recovery actions", () => {
    const markup = renderToStaticMarkup(
      <DeckRecovery
        recovery={{
          sourceKey: "gigsmith.deck-library.v1",
          rawValue: "not-json",
          reason: "invalid-json"
        }}
        onRetry={() => undefined}
        onReset={() => undefined}
      />
    );

    expect(markup).toContain("not-json");
    expect(markup).toContain("Copy recovery data");
    expect(markup).toContain("Download recovery data");
    expect(markup).toContain("Retry loading");
    expect(markup).toContain("Reset saved decks");
    expect(markup).not.toContain("Download or copy the preserved data first");
  });
});

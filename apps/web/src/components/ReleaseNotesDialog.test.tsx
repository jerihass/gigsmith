import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseNotesDialog } from "./ReleaseNotesDialog";

describe("ReleaseNotesDialog", () => {
  it("renders the latest release notes and prior history", () => {
    const markup = renderToStaticMarkup(<ReleaseNotesDialog open onClose={() => undefined} />);

    expect(markup).toContain("Release Notes");
    expect(markup).toContain("0.1.10");
    expect(markup).toContain("Deck Warning Cleanup");
    expect(markup).toContain("stale deck RAM warnings");
    expect(markup).toContain("0.1.9");
    expect(markup).toContain("Gig Odds Scope Fixes");
    expect(markup).toContain("0.1.8");
    expect(markup).toContain("Gig Sandbox Stability");
    expect(markup).toContain("0.1.7");
    expect(markup).toContain("Deck Version Snapshots");
    expect(markup).toContain("0.1.6");
    expect(markup).toContain("Faster Card Filtering");
    expect(markup).toContain("0.1.5");
    expect(markup).toContain("Sellable Tag Polish");
    expect(markup).toContain("0.1.4");
    expect(markup).toContain("Better Card Database Controls");
    expect(markup).toContain("0.1.3");
    expect(markup).toContain("Cleaner Card Previews");
    expect(markup).toContain("0.1.2");
    expect(markup).toContain("Sharper Card Readability");
    expect(markup).toContain("0.1.1");
    expect(markup).toContain("Refresh and Artwork Polish");
    expect(markup).toContain("0.1.0");
    expect(markup).toContain("Portable Local Companion");
    expect(markup).toContain("0.0.1");
    expect(markup).toContain("Rules Baseline");
  });
});

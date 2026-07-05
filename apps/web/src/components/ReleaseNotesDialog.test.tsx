import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseNotesDialog } from "./ReleaseNotesDialog";

describe("ReleaseNotesDialog", () => {
  it("renders the latest release notes and prior history", () => {
    const markup = renderToStaticMarkup(<ReleaseNotesDialog open onClose={() => undefined} />);

    expect(markup).toContain("Release Notes");
    expect(markup).toContain("0.1.13");
    expect(markup).toContain("Printable Proxy Decks");
    expect(markup).toContain("sleeve-sized proxy cards");
    expect(markup).toContain("0.1.12");
    expect(markup).toContain("Journal and Update Polish");
    expect(markup).toContain("PWA update banner");
    expect(markup).toContain("0.1.11");
    expect(markup).toContain("Playtest Journal");
    expect(markup).toContain("playtest journal data");
    expect(markup).toContain("0.1.10");
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

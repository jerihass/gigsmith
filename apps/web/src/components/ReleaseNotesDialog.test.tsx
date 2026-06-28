import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseNotesDialog } from "./ReleaseNotesDialog";

describe("ReleaseNotesDialog", () => {
  it("renders the latest release notes and prior history", () => {
    const markup = renderToStaticMarkup(<ReleaseNotesDialog open onClose={() => undefined} />);

    expect(markup).toContain("Release Notes");
    expect(markup).toContain("0.1.6");
    expect(markup).toContain("Faster Card Filtering");
    expect(markup).toContain("card taxonomy filters");
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

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseNotesDialog } from "./ReleaseNotesDialog";

describe("ReleaseNotesDialog", () => {
  it("renders the latest release notes and prior history", () => {
    const markup = renderToStaticMarkup(<ReleaseNotesDialog open onClose={() => undefined} />);

    expect(markup).toContain("Release Notes");
    expect(markup).toContain("0.1.3");
    expect(markup).toContain("Cleaner Card Previews");
    expect(markup).toContain("deck membership status");
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

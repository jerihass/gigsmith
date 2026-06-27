import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReleaseNotesDialog } from "./ReleaseNotesDialog";

describe("ReleaseNotesDialog", () => {
  it("renders the latest release notes and prior history", () => {
    const markup = renderToStaticMarkup(<ReleaseNotesDialog open onClose={() => undefined} />);

    expect(markup).toContain("Release Notes");
    expect(markup).toContain("0.1.1");
    expect(markup).toContain("Refresh and Artwork Polish");
    expect(markup).toContain("newly added cards appear immediately");
    expect(markup).toContain("0.1.0");
    expect(markup).toContain("Portable Local Companion");
    expect(markup).toContain("0.0.1");
    expect(markup).toContain("Rules Baseline");
  });
});

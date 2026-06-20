import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppErrorBoundary, AppErrorFallback } from "./AppErrorBoundary";

describe("AppErrorBoundary", () => {
  it("switches to its fallback state after an error", () => {
    expect(AppErrorBoundary.getDerivedStateFromError()).toEqual({ failed: true });
  });

  it("renders a recovery message without exposing an error payload", () => {
    const markup = renderToStaticMarkup(<AppErrorFallback onRetry={() => undefined} />);

    expect(markup).toContain("Gigsmith could not render");
    expect(markup).toContain("locally saved decks were not changed");
    expect(markup).not.toContain("stack");
  });
});

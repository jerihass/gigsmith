import { afterEach, describe, expect, it, vi } from "vitest";
import {
  measurePerformance,
  performanceConsolePrefix,
  performanceInstrumentationEnabled
} from "./performanceInstrumentation";

describe("performance instrumentation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("can be enabled for diagnostics", () => {
    vi.stubGlobal("window", { __GIGSMITH_PERF__: true });
    expect(performanceInstrumentationEnabled()).toBe(true);
  });

  it("returns task results and emits structured timing when enabled", () => {
    vi.stubGlobal("window", { __GIGSMITH_PERF__: true });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = measurePerformance("example.task", () => 42, { cards: 61 });

    expect(result).toBe(42);
    expect(info).toHaveBeenCalledTimes(1);
    const line = String(info.mock.calls[0][0]);
    expect(line.startsWith(`${performanceConsolePrefix} `)).toBe(true);
    expect(JSON.parse(line.slice(performanceConsolePrefix.length + 1))).toMatchObject({
      label: "example.task",
      detail: { cards: 61 }
    });
  });
});

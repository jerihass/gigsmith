import { describe, expect, it } from "vitest";
import { appViewStorageKey, loadAppView, saveAppView } from "./appViews";

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(appViewStorageKey, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("app view persistence", () => {
  it("defaults invalid and missing values to the Deck view", () => {
    expect(loadAppView(storage())).toBe("deck");
    expect(loadAppView(storage("unknown"))).toBe("deck");
  });

  it("round-trips a valid selected view", () => {
    const local = storage();
    saveAppView(local, "analysis");
    expect(loadAppView(local)).toBe("analysis");
  });

  it("returns retired Tactics selections to the Deck view", () => {
    expect(loadAppView(storage("tactics"))).toBe("deck");
  });

  it("falls back safely when storage throws", () => {
    expect(loadAppView({
      getItem: () => { throw new Error("unavailable"); },
      setItem: () => undefined
    })).toBe("deck");
  });
});

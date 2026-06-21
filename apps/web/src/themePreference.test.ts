import { describe, expect, it } from "vitest";
import {
  loadThemePreference,
  saveThemePreference,
  themePreferenceStorageKey
} from "./themePreference";

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(themePreferenceStorageKey, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("theme preference", () => {
  it("defaults missing and invalid values to dark", () => {
    expect(loadThemePreference(storage())).toBe("dark");
    expect(loadThemePreference(storage("system"))).toBe("dark");
    expect(loadThemePreference(storage("light"))).toBe("light");
    expect(loadThemePreference(storage("neon"))).toBe("neon");
  });

  it("persists explicit theme choices", () => {
    const local = storage();
    saveThemePreference(local, "light");
    expect(local.values.get(themePreferenceStorageKey)).toBe("light");
    saveThemePreference(local, "dark");
    expect(local.values.get(themePreferenceStorageKey)).toBe("dark");
    saveThemePreference(local, "neon");
    expect(local.values.get(themePreferenceStorageKey)).toBe("neon");
  });

  it("falls back safely when storage is unavailable", () => {
    const unavailable = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); }
    };
    expect(loadThemePreference(unavailable)).toBe("dark");
    expect(() => saveThemePreference(unavailable, "light")).not.toThrow();
  });
});

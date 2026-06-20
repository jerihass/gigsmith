import { describe, expect, it } from "vitest";
import {
  cardArtPreferenceStorageKey,
  loadCardArtPreference,
  saveCardArtPreference
} from "./cardArtPreference";

function storage(initial?: string) {
  const values = new Map<string, string>();
  if (initial !== undefined) values.set(cardArtPreferenceStorageKey, initial);
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value)
  };
}

describe("card art preference", () => {
  it("defaults missing and invalid preferences to disabled", () => {
    expect(loadCardArtPreference(storage())).toBe(false);
    expect(loadCardArtPreference(storage("true"))).toBe(false);
    expect(loadCardArtPreference(storage("enabled"))).toBe(true);
  });

  it("persists explicit enabled and disabled states", () => {
    const local = storage();
    saveCardArtPreference(local, true);
    expect(local.values.get(cardArtPreferenceStorageKey)).toBe("enabled");
    saveCardArtPreference(local, false);
    expect(local.values.get(cardArtPreferenceStorageKey)).toBe("disabled");
  });

  it("falls back safely when storage is unavailable", () => {
    const unavailable = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); }
    };
    expect(loadCardArtPreference(unavailable)).toBe(false);
    expect(() => saveCardArtPreference(unavailable, true)).not.toThrow();
  });
});

import { describe, expect, it } from "vitest";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import { createGigMatch } from "@gigsmith/rules-core";
import { isGigMatchState, loadGigMatch, saveGigMatch } from "./gigMatchStorage";

function storage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

describe("Gig Sandbox storage", () => {
  it("persists and reloads a valid match", () => {
    const local = storage();
    const match = createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable);
    match.gigs[0].value = 4;
    saveGigMatch(local, match);

    expect(loadGigMatch(local)).toEqual(match);
  });

  it("rejects malformed saved matches and starts a fresh match", () => {
    const local = storage({ "gigsmith.gig-match.v1": JSON.stringify({ playerIds: ["player", "rival"], gigs: [] }) });

    expect(isGigMatchState(JSON.parse(local.getItem("gigsmith.gig-match.v1") ?? "{}"))).toBe(false);
    expect(loadGigMatch(local).gigs).toHaveLength(12);
    expect(local.getItem("gigsmith.gig-match.v1")).toBeNull();
  });
});

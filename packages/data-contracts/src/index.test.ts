import { describe, expect, it } from "vitest";
import { isSellableCard } from "./index";

describe("card derived properties", () => {
  it("normalizes raw eddiable source data to sellable language", () => {
    expect(isSellableCard({ card_type: "Gear", is_eddiable: true })).toBe(true);
    expect(isSellableCard({ card_type: "Program", is_eddiable: true })).toBe(true);
    expect(isSellableCard({ card_type: "Unit", is_eddiable: false })).toBe(false);
    expect(isSellableCard({ card_type: "Legend", is_eddiable: true })).toBe(false);
  });
});

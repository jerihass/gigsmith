import { describe, expect, it } from "vitest";
import { assignGigController, changeGigDieType, createSandboxGig, gigController } from "./gigSandbox";

describe("Gig sandbox helpers", () => {
  it("cycles through the physical die types for new Gigs", () => {
    expect(createSandboxGig("first", 0)).toEqual({ id: "first", dieType: "d4", value: 1 });
    expect(createSandboxGig("seventh", 6)).toEqual({ id: "seventh", dieType: "d4", value: 1 });
  });

  it("clamps a value when changing to a smaller die", () => {
    const gig = { id: "gig", dieType: "d20" as const, value: 17, controllerId: "player" };

    expect(changeGigDieType(gig, "d6")).toEqual({
      id: "gig",
      dieType: "d6",
      value: 6,
      controllerId: "player"
    });
  });

  it("maps the Fixer area to an uncontrolled Gig", () => {
    const controlled = { id: "gig", dieType: "d8" as const, value: 5, controllerId: "rival" };
    const fixerGig = assignGigController(controlled, "fixer");

    expect(fixerGig.controllerId).toBeUndefined();
    expect(gigController(fixerGig)).toBe("fixer");
  });
});

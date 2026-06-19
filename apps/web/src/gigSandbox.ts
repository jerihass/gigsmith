import type { DieType, Gig } from "@gigsmith/data-contracts";

export type GigController = "player" | "rival" | "fixer";

export const dieTypes: DieType[] = ["d4", "d6", "d8", "d10", "d12", "d20"];

export const dieMaximums: Record<DieType, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20
};

export function createSandboxGig(id: string, index: number): Gig {
  const dieType = dieTypes[index % dieTypes.length];
  return { id, dieType, value: 1 };
}

export function gigController(gig: Gig): GigController {
  if (gig.controllerId === "player" || gig.controllerId === "rival") return gig.controllerId;
  return "fixer";
}

export function assignGigController(gig: Gig, controller: GigController): Gig {
  return {
    ...gig,
    controllerId: controller === "fixer" ? undefined : controller
  };
}

export function changeGigDieType(gig: Gig, dieType: DieType): Gig {
  return {
    ...gig,
    dieType,
    value: Math.max(1, Math.min(gig.value, dieMaximums[dieType]))
  };
}

import type { DieType, GigMatchState } from "@gigsmith/data-contracts";
import { createGigMatch, gigDieMaximum } from "@gigsmith/rules-core";
import { cyberpunkRulesetV1Printable } from "@gigsmith/card-data";

export const gigMatchStorageKey = "gigsmith.gig-match.v1";

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const dieTypes: DieType[] = ["d4", "d6", "d8", "d10", "d12", "d20"];

export function createDefaultGigMatch(): GigMatchState {
  return createGigMatch(["player", "rival"], "player", cyberpunkRulesetV1Printable);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isGigMatchState(value: unknown): value is GigMatchState {
  if (!isRecord(value) || !Array.isArray(value.playerIds) || value.playerIds.length !== 2) return false;
  if (!value.playerIds.every((playerId) => typeof playerId === "string" && playerId.length > 0)) return false;
  const playerIds = value.playerIds as string[];
  if (new Set(playerIds).size !== 2 || typeof value.firstPlayerId !== "string" || !playerIds.includes(value.firstPlayerId)) return false;
  if (typeof value.activePlayerId !== "string" || !playerIds.includes(value.activePlayerId)) return false;
  if (!isRecord(value.completedTurns)) return false;
  const completedTurns = value.completedTurns;
  if (!playerIds.every((playerId) => Number.isInteger(completedTurns[playerId]) && (completedTurns[playerId] as number) >= 0)) return false;
  if (typeof value.gainedGigThisTurn !== "boolean" || typeof value.overtime !== "boolean" || !Array.isArray(value.gigs)) return false;
  if (value.winnerId !== undefined && (typeof value.winnerId !== "string" || !playerIds.includes(value.winnerId))) return false;
  if (value.winReason !== undefined && value.winReason !== "start-turn-majority" && value.winReason !== "overtime-majority") return false;

  const gigIds = new Set<string>();
  return value.gigs.every((gig) => {
    if (!isRecord(gig) || typeof gig.id !== "string" || gigIds.has(gig.id)) return false;
    gigIds.add(gig.id);
    if (!dieTypes.includes(gig.dieType as DieType) || !Number.isInteger(gig.value) || (gig.value as number) < 1 || (gig.value as number) > gigDieMaximum(gig.dieType as DieType)) return false;
    return (gig.ownerId === undefined || playerIds.includes(gig.ownerId as string)) &&
      (gig.controllerId === undefined || playerIds.includes(gig.controllerId as string));
  });
}

export function loadGigMatch(storage: StorageAdapter): GigMatchState {
  const fallback = createDefaultGigMatch();
  try {
    const value = storage.getItem(gigMatchStorageKey);
    if (!value) return fallback;
    const parsed = JSON.parse(value) as unknown;
    if (isGigMatchState(parsed)) return parsed;
    storage.removeItem(gigMatchStorageKey);
  } catch {
    // The sandbox remains usable with a fresh match when storage is unavailable or corrupt.
  }
  return fallback;
}

export function saveGigMatch(storage: StorageAdapter, match: GigMatchState): void {
  storage.setItem(gigMatchStorageKey, JSON.stringify(match));
}

export function resetGigMatch(storage: StorageAdapter): GigMatchState {
  storage.removeItem(gigMatchStorageKey);
  return loadGigMatch(storage);
}

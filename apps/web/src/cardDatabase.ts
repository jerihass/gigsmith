import {
  cyberpunkCardDb,
  cyberpunkCardSnapshot,
  cyberpunkRulesetV1Printable,
  enrichCardKeywords,
  sanitizeCardSnapshot,
  validateCardSnapshot
} from "@gigsmith/card-data";
import type { Card, CardDatabase, CardSnapshot } from "@gigsmith/data-contracts";

export const cardDatabaseOverrideStorageKey = "gigsmith.card-database.override.v1";
const defaultFetchLimit = 1000;
const knownCyberpunkKeywords = cyberpunkRulesetV1Printable.keywords.map((keyword) => keyword.name);

export interface CardDatabaseLoadResult {
  cardDb: CardDatabase;
  usingOverride: boolean;
  error?: string;
}

export interface CardDatabaseRefreshResult {
  cardDb?: CardDatabase;
  changed: boolean;
  cardCount: number;
  previousCardCount: number;
  newCards: Card[];
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function snapshotToDatabase(snapshot: CardSnapshot): CardDatabase {
  return {
    metadata: snapshot.metadata,
    cards: snapshot.cards.map((card) => enrichCardKeywords(card, knownCyberpunkKeywords))
  };
}

function enrichSnapshotKeywords(snapshot: unknown): unknown {
  if (!isRecord(snapshot) || !Array.isArray(snapshot.cards)) return snapshot;
  return {
    ...snapshot,
    cards: snapshot.cards.map((card) => (
      isRecord(card) ? enrichCardKeywords(card as unknown as Card, knownCyberpunkKeywords) : card
    ))
  };
}

function stableCardKeys(card: Pick<Card, "id" | "external_id" | "slug">): string[] {
  return [card.id, card.external_id, card.slug].filter((value): value is string => value.length > 0);
}

function storageSnapshot(value: string | null): CardSnapshot | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    const validation = validateCardSnapshot(parsed);
    return validation.valid ? parsed as CardSnapshot : undefined;
  } catch {
    return undefined;
  }
}

export function loadStoredCardDatabase(storage: Storage): CardDatabaseLoadResult {
  const stored = storageSnapshot(storage.getItem(cardDatabaseOverrideStorageKey));
  if (!stored) {
    if (storage.getItem(cardDatabaseOverrideStorageKey)) {
      storage.removeItem(cardDatabaseOverrideStorageKey);
      return {
        cardDb: cyberpunkCardDb,
        usingOverride: false,
        error: "Saved card database was invalid and has been reset."
      };
    }
    return { cardDb: cyberpunkCardDb, usingOverride: false };
  }

  return { cardDb: snapshotToDatabase(stored), usingOverride: true };
}

export function resetStoredCardDatabase(storage: Storage): CardDatabaseLoadResult {
  storage.removeItem(cardDatabaseOverrideStorageKey);
  return { cardDb: cyberpunkCardDb, usingOverride: false };
}

export function saveStoredCardDatabase(storage: Storage, snapshot: CardSnapshot): CardDatabaseLoadResult {
  const validation = validateCardSnapshot(snapshot);
  if (!validation.valid) throw new Error("Card database snapshot is invalid.");
  storage.setItem(cardDatabaseOverrideStorageKey, JSON.stringify(snapshot));
  return { cardDb: snapshotToDatabase(snapshot), usingOverride: true };
}

function normalizeFetchedSnapshot(payload: unknown, sourceUrl: string, etag: string | null): unknown {
  if (isRecord(payload) && isRecord(payload.metadata) && Array.isArray(payload.cards)) {
    return enrichSnapshotKeywords(sanitizeCardSnapshot(payload));
  }

  if (!isRecord(payload) || !Array.isArray(payload.items)) return payload;

  const retrievedAt = new Date().toISOString();
  const cards = payload.items.map((item) => {
    if (!isRecord(item)) return item;
    return {
      ...item,
      source_image_url: item.source_image_url ?? item.image_url
    };
  });
  const sourceCount = Number.isInteger(payload.total) ? Number(payload.total) : cards.length;
  const versionDate = retrievedAt.slice(0, 10);

  return enrichSnapshotKeywords(sanitizeCardSnapshot({
    metadata: {
      game: "cyberpunk",
      sourceName: "Netdeck",
      sourceUrl,
      sourceRetrievedAt: retrievedAt,
      cardDataVersion: `netdeck-cyberpunk-${versionDate}`,
      sourceCardCount: sourceCount,
      notes: [
        `${cards.length}-card user-refreshed text metadata snapshot for local browser storage.`,
        etag ? `ETag: ${etag}` : "ETag unavailable."
      ].join(" ")
    },
    cards
  }));
}

export async function fetchCardDatabaseSnapshot(
  sourceUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<CardSnapshot> {
  const endpoint = new URL(sourceUrl);
  endpoint.searchParams.set("limit", String(defaultFetchLimit));
  const response = await fetcher(endpoint, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal
  });
  if (!response.ok) throw new Error(`Card database source returned ${response.status}.`);

  const payload = await response.json() as unknown;
  const snapshot = normalizeFetchedSnapshot(payload, sourceUrl, response.headers.get("etag"));
  const validation = validateCardSnapshot(snapshot);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    throw new Error(firstError ? `Downloaded card database is invalid: ${firstError.path}: ${firstError.message}` : "Downloaded card database is invalid.");
  }
  return snapshot as CardSnapshot;
}

export async function refreshStoredCardDatabase(
  storage: Storage,
  currentDb: CardDatabase,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<CardDatabaseRefreshResult> {
  const snapshot = await fetchCardDatabaseSnapshot(cyberpunkCardSnapshot.metadata.sourceUrl, signal, fetcher);
  storage.setItem(cardDatabaseOverrideStorageKey, JSON.stringify(snapshot));
  const cardDb = snapshotToDatabase(snapshot);
  const previousKeys = new Set(currentDb.cards.flatMap(stableCardKeys));
  const newCards = cardDb.cards.filter((card) => stableCardKeys(card).every((key) => !previousKeys.has(key)));
  const changed = currentDb.metadata.sourceCardCount !== cardDb.metadata.sourceCardCount ||
    JSON.stringify(currentDb.cards) !== JSON.stringify(cardDb.cards);

  return {
    cardDb,
    changed,
    cardCount: cardDb.cards.length,
    previousCardCount: currentDb.cards.length,
    newCards,
    message: changed
      ? `Card database updated: ${cardDb.cards.length} cards${newCards.length ? `, ${newCards.length} new` : ""}.`
      : `Card database already current: ${cardDb.cards.length} cards.`
  };
}

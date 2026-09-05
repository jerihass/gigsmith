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
const defaultFetchLimit = 100;
const sourceProbeFetchLimit = 1;
const maximumSourceCardCount = 5000;
const knownCyberpunkKeywords = cyberpunkRulesetV1Printable.keywords.map((keyword) => keyword.name);

export interface CardDatabaseLoadResult {
  cardDb: CardDatabase;
  usingOverride: boolean;
  error?: string;
}

export interface CardDatabaseRefreshResult {
  cardDb?: CardDatabase;
  mode: "full" | "incremental" | "cache";
  changed: boolean;
  cardCount: number;
  previousCardCount: number;
  newCards: Card[];
  message: string;
}

interface CardSetBucket {
  code: string;
  cards: Card[];
}

interface CardSetProbe {
  code: string;
  total: number;
  first?: Card;
  last?: Card;
}

class IncrementalRefreshUnavailableError extends Error {}

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

function normalizedSetCode(code: string): string {
  return code.trim().toLowerCase();
}

function stableCardIdentity(card: Pick<Card, "id" | "external_id" | "printing_id" | "slug">): string {
  return [card.id, card.external_id, card.printing_id, card.slug].join("\u0000");
}

function cardsEquivalent(left: Card | undefined, right: Card | undefined): boolean {
  if (!left || !right) return false;
  return stableCardIdentity(left) === stableCardIdentity(right) &&
    JSON.stringify(left) === JSON.stringify(right);
}

function groupCardsBySet(cards: Card[]): Map<string, CardSetBucket> {
  const buckets = new Map<string, CardSetBucket>();
  for (const card of cards) {
    const key = normalizedSetCode(card.set.code);
    const existing = buckets.get(key);
    if (existing) {
      existing.cards.push(card);
    } else {
      buckets.set(key, { code: card.set.code, cards: [card] });
    }
  }
  return buckets;
}

function mergeUpdatedSetCards(
  cards: Card[],
  updates: ReadonlyMap<string, Card[]>
): Card[] {
  const merged: Card[] = [];
  const emitted = new Set<string>();

  for (const card of cards) {
    const key = normalizedSetCode(card.set.code);
    const replacement = updates.get(key);
    if (!replacement) {
      merged.push(card);
      continue;
    }
    if (!emitted.has(key)) {
      merged.push(...replacement);
      emitted.add(key);
    }
  }

  for (const [key, replacement] of updates) {
    if (!emitted.has(key)) merged.push(...replacement);
  }
  return merged;
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

async function fetchSourcePage(
  endpoint: URL,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<{ payload: unknown; etag: string | null }> {
  const response = await fetcher(endpoint, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal
  });
  if (!response.ok) throw new Error(`Card database source returned ${response.status}.`);
  return {
    payload: await response.json() as unknown,
    etag: response.headers.get("etag")
  };
}

async function fetchSetSourcePage(
  endpoint: URL,
  setCode: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<{ payload: unknown; etag: string | null }> {
  try {
    return await fetchSourcePage(endpoint, signal, fetcher);
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new IncrementalRefreshUnavailableError(`Card database source does not support set probes for ${setCode}.`);
  }
}

function sourceEndpoint(sourceUrl: string, setCode?: string): URL {
  const endpoint = new URL(sourceUrl);
  if (setCode !== undefined) endpoint.searchParams.set("set", setCode);
  return endpoint;
}

async function fetchCompleteSourcePayload(
  sourceUrl: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch,
  setCode?: string
): Promise<{ payload: unknown; etag: string | null }> {
  const endpoint = sourceEndpoint(sourceUrl, setCode);
  endpoint.searchParams.set("limit", String(defaultFetchLimit));
  endpoint.searchParams.set("offset", "0");

  const firstPage = await fetchSourcePage(endpoint, signal, fetcher);
  if (!isRecord(firstPage.payload) || !Array.isArray(firstPage.payload.items)) return firstPage;

  const reportedTotal = firstPage.payload.total;
  if (!Number.isInteger(reportedTotal) || Number(reportedTotal) < 0) return firstPage;
  const total = Number(reportedTotal);
  if (total > maximumSourceCardCount) {
    throw new Error(`Card database source reported an unexpected ${total} cards.`);
  }

  const items = [...firstPage.payload.items];
  while (items.length < total) {
    const previousCount = items.length;
    endpoint.searchParams.set("offset", String(previousCount));
    const nextPage = await fetchSourcePage(endpoint, signal, fetcher);
    if (!isRecord(nextPage.payload) || !Array.isArray(nextPage.payload.items)) {
      throw new Error(`Card database source returned an invalid page at offset ${previousCount}.`);
    }
    items.push(...nextPage.payload.items);
    if (items.length === previousCount) {
      throw new Error(`Card database source stopped after ${items.length} of ${total} cards.`);
    }
  }

  if (items.length !== total) {
    throw new Error(`Card database source returned ${items.length} records for a reported total of ${total}.`);
  }

  return {
    payload: { ...firstPage.payload, items },
    etag: firstPage.etag
  };
}

function normalizeFetchedCard(item: unknown, sourceUrl: string, etag: string | null): Card | undefined {
  const snapshot = normalizeFetchedSnapshot({ total: 1, items: [item] }, sourceUrl, etag);
  if (!isRecord(snapshot) || !Array.isArray(snapshot.cards) || snapshot.cards.length !== 1) return undefined;
  return snapshot.cards[0] as Card;
}

async function fetchSourceProbe(
  sourceUrl: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<{ total: number; first?: Card; last?: Card }> {
  const endpoint = sourceEndpoint(sourceUrl);
  endpoint.searchParams.set("limit", String(sourceProbeFetchLimit));
  endpoint.searchParams.set("offset", "0");
  const page = await fetchSourcePage(endpoint, signal, fetcher);
  if (!isRecord(page.payload) || !Array.isArray(page.payload.items) ||
    (page.payload.items.length !== 0 && page.payload.items.length !== sourceProbeFetchLimit) ||
    !Number.isInteger(page.payload.total) || Number(page.payload.total) < 0) {
    throw new IncrementalRefreshUnavailableError("Card database source does not expose a usable count probe.");
  }

  const total = Number(page.payload.total);
  if (total > maximumSourceCardCount) {
    throw new Error(`Card database source reported an unexpected ${total} cards.`);
  }
  if (total === 0) return { total };

  const first = normalizeFetchedCard(page.payload.items[0], sourceUrl, page.etag);
  if (!first) throw new IncrementalRefreshUnavailableError("Card database source returned an unusable count probe.");

  let last = first;
  if (total > 1) {
    endpoint.searchParams.set("offset", String(total - 1));
    const lastPage = await fetchSourcePage(endpoint, signal, fetcher);
    if (!isRecord(lastPage.payload) || !Array.isArray(lastPage.payload.items) ||
      lastPage.payload.items.length !== sourceProbeFetchLimit) {
      throw new IncrementalRefreshUnavailableError("Card database source returned an unusable final-card probe.");
    }
    const normalizedLast = normalizeFetchedCard(lastPage.payload.items[0], sourceUrl, lastPage.etag);
    if (!normalizedLast) throw new IncrementalRefreshUnavailableError("Card database source returned an unusable final-card probe.");
    last = normalizedLast;
  }
  return { total, first, last };
}

async function fetchCardSetProbe(
  sourceUrl: string,
  setCode: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<CardSetProbe> {
  const endpoint = sourceEndpoint(sourceUrl, setCode);
  endpoint.searchParams.set("limit", String(sourceProbeFetchLimit));
  endpoint.searchParams.set("offset", "0");
  const firstPage = await fetchSetSourcePage(endpoint, setCode, signal, fetcher);
  if (!isRecord(firstPage.payload) || !Array.isArray(firstPage.payload.items) ||
    (firstPage.payload.items.length !== 0 && firstPage.payload.items.length !== sourceProbeFetchLimit) ||
    !Number.isInteger(firstPage.payload.total) || Number(firstPage.payload.total) < 0) {
    throw new IncrementalRefreshUnavailableError(`Card database source does not support set probes for ${setCode}.`);
  }

  const total = Number(firstPage.payload.total);
  if (total > maximumSourceCardCount) {
    throw new Error(`Card database source reported an unexpected ${total} cards for set ${setCode}.`);
  }
  if (total === 0) return { code: setCode, total };

  const first = normalizeFetchedCard(firstPage.payload.items[0], sourceUrl, firstPage.etag);
  if (!first || normalizedSetCode(first.set.code) !== normalizedSetCode(setCode)) {
    throw new IncrementalRefreshUnavailableError(`Card database source did not honor the set filter for ${setCode}.`);
  }

  let last = first;
  if (total > 1) {
    endpoint.searchParams.set("offset", String(total - 1));
    const lastPage = await fetchSetSourcePage(endpoint, setCode, signal, fetcher);
    if (!isRecord(lastPage.payload) || !Array.isArray(lastPage.payload.items) ||
      lastPage.payload.items.length !== sourceProbeFetchLimit) {
      throw new IncrementalRefreshUnavailableError(`Card database source returned an incomplete set probe for ${setCode}.`);
    }
    const normalizedLast = normalizeFetchedCard(lastPage.payload.items[0], sourceUrl, lastPage.etag);
    if (!normalizedLast || normalizedSetCode(normalizedLast.set.code) !== normalizedSetCode(setCode)) {
      throw new IncrementalRefreshUnavailableError(`Card database source returned an invalid set probe for ${setCode}.`);
    }
    last = normalizedLast;
  }

  return { code: setCode, total, first, last };
}

async function fetchCardSetSnapshot(
  sourceUrl: string,
  setCode: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<CardSnapshot> {
  let payload: unknown;
  let etag: string | null;
  try {
    const response = await fetchCompleteSourcePayload(sourceUrl, signal, fetcher, setCode);
    payload = response.payload;
    etag = response.etag;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof IncrementalRefreshUnavailableError) throw error;
    throw new IncrementalRefreshUnavailableError(`Card database source does not support set refreshes for ${setCode}.`);
  }
  const snapshot = normalizeFetchedSnapshot(payload, sourceUrl, etag);
  const validation = validateCardSnapshot(snapshot);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    throw new Error(firstError ? `Downloaded card set is invalid: ${firstError.path}: ${firstError.message}` : "Downloaded card set is invalid.");
  }
  const cards = (snapshot as CardSnapshot).cards;
  if (cards.some((card) => normalizedSetCode(card.set.code) !== normalizedSetCode(setCode))) {
    throw new IncrementalRefreshUnavailableError(`Card database source did not honor the set filter for ${setCode}.`);
  }
  return snapshot as CardSnapshot;
}

function refreshedSnapshot(
  baseSnapshot: CardSnapshot,
  cards: Card[],
  sourceCardCount: number,
  mode: "incremental" | "cache",
  dataChanged: boolean,
  sourceUrl: string
): CardSnapshot {
  const retrievedAt = new Date().toISOString();
  return {
    metadata: {
      ...baseSnapshot.metadata,
      sourceUrl,
      sourceRetrievedAt: retrievedAt,
      cardDataVersion: dataChanged
        ? `netdeck-cyberpunk-${retrievedAt.slice(0, 10)}`
        : baseSnapshot.metadata.cardDataVersion,
      sourceCardCount: sourceCardCount,
      notes: [
        `${cards.length}-card ${mode === "incremental" ? "incrementally refreshed" : "cached"} text metadata snapshot for local browser storage.`,
        "External image URLs are stored as stable references only; images are not bundled."
      ].join(" ")
    },
    cards
  };
}

async function refreshFromCachedSets(
  baseSnapshot: CardSnapshot,
  sourceUrl: string,
  signal: AbortSignal | undefined,
  fetcher: typeof fetch
): Promise<{ snapshot: CardSnapshot; mode: "incremental" | "cache" } | undefined> {
  if (baseSnapshot.cards.length === 0) return undefined;

  const sourceProbe = await fetchSourceProbe(sourceUrl, signal, fetcher);
  const buckets = groupCardsBySet(baseSnapshot.cards);
  // The source exposes set filtering but no set manifest or content hash. Boundary
  // probes cover the normal ordered-feed case; an ambiguous change falls back to
  // a complete refresh so a middle-of-feed update cannot silently stay stale.
  const unknownSetCodes = new Map<string, string>();
  for (const boundaryCard of [sourceProbe.first, sourceProbe.last]) {
    if (!boundaryCard) continue;
    const key = normalizedSetCode(boundaryCard.set.code);
    if (!buckets.has(key)) unknownSetCodes.set(key, boundaryCard.set.code);
  }

  const probes = await Promise.all(
    [...buckets.values()].map((bucket) => fetchCardSetProbe(sourceUrl, bucket.code, signal, fetcher))
  );
  const newSetCards = new Map<string, Card[]>();
  await Promise.all([...unknownSetCodes.entries()].map(async ([key, setCode]) => {
    const snapshot = await fetchCardSetSnapshot(sourceUrl, setCode, signal, fetcher);
    newSetCards.set(key, snapshot.cards);
  }));
  const probedCardCount = probes.reduce((sum, probe) => sum + probe.total, 0) +
    [...newSetCards.values()].reduce((sum, cards) => sum + cards.length, 0);
  if (probedCardCount !== sourceProbe.total) return undefined;

  const changedSets = probes.filter((probe) => {
    const bucket = buckets.get(normalizedSetCode(probe.code));
    if (!bucket || bucket.cards.length !== probe.total) return true;
    return !cardsEquivalent(bucket.cards[0], probe.first) ||
      !cardsEquivalent(bucket.cards.at(-1), probe.last);
  });

  if (changedSets.length === 0 && newSetCards.size === 0) {
    const snapshot = refreshedSnapshot(
      baseSnapshot,
      baseSnapshot.cards,
      sourceProbe.total,
      "cache",
      false,
      sourceUrl
    );
    return { snapshot, mode: "cache" };
  }

  const updates = new Map<string, Card[]>();
  await Promise.all(changedSets.map(async (probe) => {
    const snapshot = await fetchCardSetSnapshot(sourceUrl, probe.code, signal, fetcher);
    if (snapshot.cards.length !== probe.total) {
      throw new Error(`Card database source returned ${snapshot.cards.length} records for set ${probe.code}, expected ${probe.total}.`);
    }
    updates.set(normalizedSetCode(probe.code), snapshot.cards);
  }));

  const existingCards = mergeUpdatedSetCards(baseSnapshot.cards, updates);
  const firstSetKey = sourceProbe.first ? normalizedSetCode(sourceProbe.first.set.code) : undefined;
  const lastSetKey = sourceProbe.last ? normalizedSetCode(sourceProbe.last.set.code) : undefined;
  const leadingCards = firstSetKey ? newSetCards.get(firstSetKey) ?? [] : [];
  const trailingCards = lastSetKey && lastSetKey !== firstSetKey ? newSetCards.get(lastSetKey) ?? [] : [];
  const cards = [...leadingCards, ...existingCards, ...trailingCards];
  if (cards.length !== sourceProbe.total) return undefined;
  const snapshot = refreshedSnapshot(
    baseSnapshot,
    cards,
    sourceProbe.total,
    "incremental",
    JSON.stringify(baseSnapshot.cards) !== JSON.stringify(cards),
    sourceUrl
  );
  const validation = validateCardSnapshot(snapshot);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    throw new Error(firstError ? `Incrementally refreshed card database is invalid: ${firstError.path}: ${firstError.message}` : "Incrementally refreshed card database is invalid.");
  }
  return { snapshot, mode: "incremental" };
}

export async function fetchCardDatabaseSnapshot(
  sourceUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<CardSnapshot> {
  const { payload, etag } = await fetchCompleteSourcePayload(sourceUrl, signal, fetcher);
  const snapshot = normalizeFetchedSnapshot(payload, sourceUrl, etag);
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
  const sourceUrl = cyberpunkCardSnapshot.metadata.sourceUrl;
  const currentSnapshot: CardSnapshot = { metadata: currentDb.metadata, cards: currentDb.cards };

  let snapshot: CardSnapshot;
  let mode: "full" | "incremental" | "cache" = "full";
  try {
    const incremental = await refreshFromCachedSets(currentSnapshot, sourceUrl, signal, fetcher);
    if (incremental) {
      snapshot = incremental.snapshot;
      mode = incremental.mode;
    } else {
      snapshot = await fetchCardDatabaseSnapshot(sourceUrl, signal, fetcher);
    }
  } catch (error) {
    if (!(error instanceof IncrementalRefreshUnavailableError)) throw error;
    snapshot = await fetchCardDatabaseSnapshot(sourceUrl, signal, fetcher);
  }

  storage.setItem(cardDatabaseOverrideStorageKey, JSON.stringify(snapshot));
  const cardDb = snapshotToDatabase(snapshot);
  const previousKeys = new Set(currentDb.cards.flatMap(stableCardKeys));
  const newCards = cardDb.cards.filter((card) => stableCardKeys(card).every((key) => !previousKeys.has(key)));
  const changed = currentDb.metadata.sourceCardCount !== cardDb.metadata.sourceCardCount ||
    JSON.stringify(currentDb.cards) !== JSON.stringify(cardDb.cards);

  return {
    cardDb,
    mode,
    changed,
    cardCount: cardDb.cards.length,
    previousCardCount: currentDb.cards.length,
    newCards,
    message: changed
      ? `Card database updated${mode === "incremental" ? " incrementally" : ""}: ${cardDb.cards.length} cards${newCards.length ? `, ${newCards.length} new` : ""}.`
      : `Card database already current: ${cardDb.cards.length} cards${mode === "cache" ? " (cached set data)" : ""}.`
  };
}

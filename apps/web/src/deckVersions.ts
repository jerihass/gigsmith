import type { CardDatabase, CardId, Deck, DeckCardEntry, DeckVersionSnapshot } from "@gigsmith/data-contracts";

export interface DeckVersionCardChange {
  cardId: CardId;
  before: number;
  after: number;
  section: "legend" | "main";
}

export interface DeckVersionComparison {
  versionId: string;
  versionName: string;
  added: DeckVersionCardChange[];
  removed: DeckVersionCardChange[];
  changed: DeckVersionCardChange[];
  missingCardIds: CardId[];
  baselineChanges: string[];
}

function cloneEntries(entries: DeckCardEntry[]): DeckCardEntry[] {
  return entries.map((entry) => ({ ...entry }));
}

function createSnapshotId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `version-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function trimmedVersionName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : "Untitled version";
}

export function createDeckVersionSnapshot(
  deck: Deck,
  name: string,
  options: { id?: string; createdAt?: string } = {}
): DeckVersionSnapshot {
  return {
    id: options.id ?? createSnapshotId(),
    name: trimmedVersionName(name),
    createdAt: options.createdAt ?? new Date().toISOString(),
    deckName: deck.name,
    legends: cloneEntries(deck.legends),
    main: cloneEntries(deck.main),
    formatId: deck.formatId,
    rulesetVersion: deck.rulesetVersion,
    cardDataVersion: deck.cardDataVersion,
    ...(deck.metadata?.notes ? { notes: deck.metadata.notes } : {})
  };
}

export function addDeckVersion(
  deck: Deck,
  name: string,
  options: { id?: string; createdAt?: string } = {}
): Deck {
  const snapshot = createDeckVersionSnapshot(deck, name, options);
  return {
    ...deck,
    versions: [...(deck.versions ?? []), snapshot]
  };
}

export function restoreDeckVersion(deck: Deck, versionId: string, restoredAt = new Date().toISOString()): Deck {
  const snapshot = deck.versions?.find((candidate) => candidate.id === versionId);
  if (!snapshot) return deck;
  return {
    ...deck,
    name: snapshot.deckName,
    legends: cloneEntries(snapshot.legends),
    main: cloneEntries(snapshot.main),
    formatId: snapshot.formatId,
    rulesetVersion: snapshot.rulesetVersion,
    cardDataVersion: snapshot.cardDataVersion,
    metadata: {
      ...deck.metadata,
      updatedAt: restoredAt,
      ...(snapshot.notes === undefined ? {} : { notes: snapshot.notes })
    },
    versions: deck.versions
  };
}

function countByCard(entries: DeckCardEntry[]): Map<CardId, number> {
  const counts = new Map<CardId, number>();
  for (const entry of entries) counts.set(entry.cardId, (counts.get(entry.cardId) ?? 0) + entry.count);
  return counts;
}

function compareSection(
  beforeEntries: DeckCardEntry[],
  afterEntries: DeckCardEntry[],
  section: DeckVersionCardChange["section"]
): Pick<DeckVersionComparison, "added" | "removed" | "changed"> {
  const before = countByCard(beforeEntries);
  const after = countByCard(afterEntries);
  const cardIds = new Set([...before.keys(), ...after.keys()]);
  const added: DeckVersionCardChange[] = [];
  const removed: DeckVersionCardChange[] = [];
  const changed: DeckVersionCardChange[] = [];

  for (const cardId of cardIds) {
    const beforeCount = before.get(cardId) ?? 0;
    const afterCount = after.get(cardId) ?? 0;
    if (beforeCount === afterCount) continue;
    const change = { cardId, before: beforeCount, after: afterCount, section };
    if (beforeCount === 0) added.push(change);
    else if (afterCount === 0) removed.push(change);
    else changed.push(change);
  }

  return { added, removed, changed };
}

export function compareDeckVersionToDeck(
  snapshot: DeckVersionSnapshot,
  deck: Deck,
  cardDb: CardDatabase
): DeckVersionComparison {
  const legendChanges = compareSection(snapshot.legends, deck.legends, "legend");
  const mainChanges = compareSection(snapshot.main, deck.main, "main");
  const knownCardIds = new Set(cardDb.cards.map((card) => card.id));
  const changedCardIds = new Set([
    ...legendChanges.added,
    ...legendChanges.removed,
    ...legendChanges.changed,
    ...mainChanges.added,
    ...mainChanges.removed,
    ...mainChanges.changed
  ].map((change) => change.cardId));
  const missingCardIds = [...changedCardIds].filter((cardId) => !knownCardIds.has(cardId));
  const baselineChanges = [
    snapshot.rulesetVersion !== deck.rulesetVersion
      ? `Ruleset ${snapshot.rulesetVersion} -> ${deck.rulesetVersion}`
      : undefined,
    snapshot.cardDataVersion !== deck.cardDataVersion
      ? `Cards ${snapshot.cardDataVersion} -> ${deck.cardDataVersion}`
      : undefined,
    snapshot.formatId !== deck.formatId ? `Format ${snapshot.formatId} -> ${deck.formatId}` : undefined
  ].filter((change): change is string => Boolean(change));

  return {
    versionId: snapshot.id,
    versionName: snapshot.name,
    added: [...legendChanges.added, ...mainChanges.added],
    removed: [...legendChanges.removed, ...mainChanges.removed],
    changed: [...legendChanges.changed, ...mainChanges.changed],
    missingCardIds,
    baselineChanges
  };
}

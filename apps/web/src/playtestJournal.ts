import type { CardColor, Deck, DeckVersionSnapshot, PlaytestRecord, PlaytestResult } from "@gigsmith/data-contracts";

export const playtestJournalStorageKey = "gigsmith.playtest-journal.v1";

export interface PlaytestJournal {
  version: 1;
  records: PlaytestRecord[];
}

export interface PlaytestSummary {
  sampleSize: number;
  wins: number;
  losses: number;
  draws: number;
  firstPlayer: number;
  secondPlayer: number;
  unknownPlayerOrder: number;
  averageTurns: number | null;
  opponentColors: Array<{ color: CardColor; count: number }>;
  tags: Array<{ tag: string; count: number }>;
}

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlaytestRecord(value: unknown): value is PlaytestRecord {
  if (!isRecord(value) || !isRecord(value.deck) || !isRecord(value.opponent)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.playedAt === "string" &&
    (value.result === "win" || value.result === "loss" || value.result === "draw") &&
    (value.playerOrder === "first" || value.playerOrder === "second" || value.playerOrder === "unknown") &&
    typeof value.deck.deckId === "string" &&
    typeof value.deck.deckName === "string" &&
    Array.isArray(value.deck.legends) &&
    Array.isArray(value.deck.main) &&
    typeof value.deck.formatId === "string" &&
    typeof value.deck.rulesetVersion === "string" &&
    typeof value.deck.cardDataVersion === "string" &&
    Array.isArray(value.opponent.colors) &&
    Array.isArray(value.tags) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function createEmptyPlaytestJournal(): PlaytestJournal {
  return { version: 1, records: [] };
}

export function loadPlaytestJournal(storage: StorageAdapter): PlaytestJournal {
  try {
    const raw = storage.getItem(playtestJournalStorageKey);
    if (!raw) return createEmptyPlaytestJournal();
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.records)) return createEmptyPlaytestJournal();
    const records = parsed.records.filter(isPlaytestRecord);
    return { version: 1, records };
  } catch {
    return createEmptyPlaytestJournal();
  }
}

export function savePlaytestJournal(storage: StorageAdapter, journal: PlaytestJournal): void {
  storage.setItem(playtestJournalStorageKey, JSON.stringify(journal));
}

function cloneVersionEntries(version: Pick<DeckVersionSnapshot, "legends" | "main">) {
  return {
    legends: version.legends.map((entry) => ({ ...entry })),
    main: version.main.map((entry) => ({ ...entry }))
  };
}

export function createPlaytestRecord(input: {
  id: string;
  deck: Deck;
  deckVersion?: DeckVersionSnapshot;
  playedAt: string;
  result: PlaytestResult;
  playerOrder: PlaytestRecord["playerOrder"];
  opponentName?: string;
  opponentColors?: CardColor[];
  turns?: number;
  finalStreetCred?: number;
  event?: string;
  notes?: string;
  tags?: string[];
  now?: string;
}): PlaytestRecord {
  const now = input.now ?? new Date().toISOString();
  const source = input.deckVersion ?? input.deck;
  const entries = cloneVersionEntries(source);
  return {
    id: input.id,
    playedAt: input.playedAt,
    result: input.result,
    playerOrder: input.playerOrder,
    deck: {
      deckId: input.deck.id,
      deckName: input.deckVersion?.deckName ?? input.deck.name,
      deckVersionId: input.deckVersion?.id,
      deckVersionName: input.deckVersion?.name,
      legends: entries.legends,
      main: entries.main,
      formatId: source.formatId,
      rulesetVersion: source.rulesetVersion,
      cardDataVersion: source.cardDataVersion
    },
    opponent: {
      ...(input.opponentName?.trim() ? { name: input.opponentName.trim() } : {}),
      colors: input.opponentColors ?? []
    },
    ...(input.turns == null ? {} : { turns: input.turns }),
    ...(input.finalStreetCred == null ? {} : { finalStreetCred: input.finalStreetCred }),
    ...(input.event?.trim() ? { event: input.event.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now
  };
}

export function upsertPlaytestRecord(journal: PlaytestJournal, record: PlaytestRecord): PlaytestJournal {
  const exists = journal.records.some((candidate) => candidate.id === record.id);
  return {
    ...journal,
    records: exists
      ? journal.records.map((candidate) => candidate.id === record.id ? record : candidate)
      : [record, ...journal.records]
  };
}

export function deletePlaytestRecord(journal: PlaytestJournal, recordId: string): PlaytestJournal {
  return { ...journal, records: journal.records.filter((record) => record.id !== recordId) };
}

export function summarizePlaytests(records: PlaytestRecord[]): PlaytestSummary {
  const resultCounts = records.reduce<Record<PlaytestResult, number>>(
    (counts, record) => ({ ...counts, [record.result]: counts[record.result] + 1 }),
    { win: 0, loss: 0, draw: 0 }
  );
  const turns = records.map((record) => record.turns).filter((value): value is number => typeof value === "number");
  const colorCounts = new Map<CardColor, number>();
  const tagCounts = new Map<string, number>();
  for (const record of records) {
    for (const color of record.opponent.colors) colorCounts.set(color, (colorCounts.get(color) ?? 0) + 1);
    for (const tag of record.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  return {
    sampleSize: records.length,
    wins: resultCounts.win,
    losses: resultCounts.loss,
    draws: resultCounts.draw,
    firstPlayer: records.filter((record) => record.playerOrder === "first").length,
    secondPlayer: records.filter((record) => record.playerOrder === "second").length,
    unknownPlayerOrder: records.filter((record) => record.playerOrder === "unknown").length,
    averageTurns: turns.length === 0 ? null : turns.reduce((sum, value) => sum + value, 0) / turns.length,
    opponentColors: [...colorCounts].map(([color, count]) => ({ color, count })).sort((a, b) => b.count - a.count || a.color.localeCompare(b.color)),
    tags: [...tagCounts].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
  };
}


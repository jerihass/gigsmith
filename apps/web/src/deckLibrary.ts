import type { Deck } from "@gigsmith/data-contracts";

export const deckLibraryStorageKey = "gigsmith.deck-library.v1";
export const legacyDeckStorageKey = "gigsmith.deck.v1";
export const deckLibraryRecoveryStorageKey = "gigsmith.deck-library.recovery.v1";

export interface DeckLibrary {
  version: 1;
  activeDeckId: string;
  decks: Deck[];
}

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DeckLibraryRecovery {
  sourceKey: typeof deckLibraryStorageKey | typeof legacyDeckStorageKey;
  rawValue: string;
  reason: "invalid-json" | "invalid-schema";
}

export type DeckLibraryLoadResult =
  | { library: DeckLibrary; recovery?: undefined }
  | { library?: undefined; recovery: DeckLibraryRecovery };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDeckEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.cardId === "string" &&
    value.cardId.length > 0 &&
    typeof value.count === "number" &&
    Number.isInteger(value.count) &&
    value.count > 0
  );
}

function isIsoDate(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function isDeckVersionSnapshot(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    value.id.length > 0 &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    isIsoDate(value.createdAt) &&
    typeof value.deckName === "string" &&
    typeof value.formatId === "string" &&
    typeof value.rulesetVersion === "string" &&
    typeof value.cardDataVersion === "string" &&
    Array.isArray(value.legends) &&
    value.legends.every(isDeckEntry) &&
    Array.isArray(value.main) &&
    value.main.every(isDeckEntry) &&
    (value.notes === undefined || typeof value.notes === "string")
  );
}

function isDeck(value: unknown): value is Deck {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.formatId === "string" &&
    typeof value.rulesetVersion === "string" &&
    typeof value.cardDataVersion === "string" &&
    Array.isArray(value.legends) &&
    value.legends.every(isDeckEntry) &&
    Array.isArray(value.main) &&
    value.main.every(isDeckEntry) &&
    (value.versions === undefined || (Array.isArray(value.versions) && value.versions.every(isDeckVersionSnapshot)))
  );
}

function parseStoredValue(value: string): { value?: unknown; validJson: boolean } {
  try {
    return { value: JSON.parse(value) as unknown, validJson: true };
  } catch {
    return { validJson: false };
  }
}

export function isDeckLibrary(value: unknown): value is DeckLibrary {
  if (!isRecord(value) || value.version !== 1 || typeof value.activeDeckId !== "string") return false;
  if (!Array.isArray(value.decks) || value.decks.length === 0 || !value.decks.every(isDeck)) return false;
  return value.decks.some((deck) => deck.id === value.activeDeckId);
}

export function createDeckLibrary(deck: Deck): DeckLibrary {
  return { version: 1, activeDeckId: deck.id, decks: [deck] };
}

export function saveDeckLibrary(storage: StorageAdapter, library: DeckLibrary): void {
  storage.setItem(deckLibraryStorageKey, JSON.stringify(library));
}

function preserveRecovery(
  storage: StorageAdapter,
  sourceKey: DeckLibraryRecovery["sourceKey"],
  rawValue: string,
  reason: DeckLibraryRecovery["reason"]
): DeckLibraryLoadResult {
  const recovery = { sourceKey, rawValue, reason } satisfies DeckLibraryRecovery;
  storage.setItem(deckLibraryRecoveryStorageKey, JSON.stringify(recovery));
  return { recovery };
}

export function loadDeckLibraryResult(storage: StorageAdapter, fallbackDeck: Deck): DeckLibraryLoadResult {
  const storedLibraryRaw = storage.getItem(deckLibraryStorageKey);
  if (storedLibraryRaw !== null) {
    const parsed = parseStoredValue(storedLibraryRaw);
    if (parsed.validJson && isDeckLibrary(parsed.value)) {
      storage.removeItem(deckLibraryRecoveryStorageKey);
      return { library: parsed.value };
    }
    return preserveRecovery(
      storage,
      deckLibraryStorageKey,
      storedLibraryRaw,
      parsed.validJson ? "invalid-schema" : "invalid-json"
    );
  }

  const legacyDeckRaw = storage.getItem(legacyDeckStorageKey);
  if (legacyDeckRaw !== null) {
    const parsed = parseStoredValue(legacyDeckRaw);
    if (!parsed.validJson || !isDeck(parsed.value)) {
      return preserveRecovery(
        storage,
        legacyDeckStorageKey,
        legacyDeckRaw,
        parsed.validJson ? "invalid-schema" : "invalid-json"
      );
    }
    const library = createDeckLibrary(parsed.value);
    saveDeckLibrary(storage, library);
    storage.removeItem(legacyDeckStorageKey);
    storage.removeItem(deckLibraryRecoveryStorageKey);
    return { library };
  }

  const library = createDeckLibrary(fallbackDeck);
  saveDeckLibrary(storage, library);
  storage.removeItem(deckLibraryRecoveryStorageKey);
  return { library };
}

export function loadDeckLibrary(storage: StorageAdapter, fallbackDeck: Deck): DeckLibrary {
  const result = loadDeckLibraryResult(storage, fallbackDeck);
  return result.library ?? createDeckLibrary(fallbackDeck);
}

export function resetDeckLibrary(storage: StorageAdapter, fallbackDeck: Deck): DeckLibrary {
  storage.removeItem(deckLibraryStorageKey);
  storage.removeItem(legacyDeckStorageKey);
  storage.removeItem(deckLibraryRecoveryStorageKey);
  const library = createDeckLibrary(fallbackDeck);
  saveDeckLibrary(storage, library);
  return library;
}

export function getActiveDeck(library: DeckLibrary): Deck {
  return library.decks.find((deck) => deck.id === library.activeDeckId) ?? library.decks[0];
}

export function replaceActiveDeck(library: DeckLibrary, deck: Deck): DeckLibrary {
  return {
    ...library,
    activeDeckId: deck.id,
    decks: library.decks.map((candidate) =>
      candidate.id === library.activeDeckId ? deck : candidate
    )
  };
}

export function addDeck(library: DeckLibrary, deck: Deck): DeckLibrary {
  return {
    ...library,
    activeDeckId: deck.id,
    decks: [...library.decks, deck]
  };
}

export function selectDeck(library: DeckLibrary, deckId: string): DeckLibrary {
  if (!library.decks.some((deck) => deck.id === deckId)) return library;
  return { ...library, activeDeckId: deckId };
}

export function removeDeck(library: DeckLibrary, deckId: string): DeckLibrary {
  if (library.decks.length === 1 || !library.decks.some((deck) => deck.id === deckId)) return library;

  const decks = library.decks.filter((deck) => deck.id !== deckId);
  return {
    ...library,
    activeDeckId: library.activeDeckId === deckId ? decks[0].id : library.activeDeckId,
    decks
  };
}

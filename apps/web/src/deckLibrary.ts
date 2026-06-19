import type { Deck } from "@gigsmith/data-contracts";

export const deckLibraryStorageKey = "gigsmith.deck-library.v1";
export const legacyDeckStorageKey = "gigsmith.deck.v1";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
    Array.isArray(value.main)
  );
}

function parseStoredValue(value: string | null): unknown {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

function isDeckLibrary(value: unknown): value is DeckLibrary {
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

export function loadDeckLibrary(storage: StorageAdapter, fallbackDeck: Deck): DeckLibrary {
  const storedLibrary = parseStoredValue(storage.getItem(deckLibraryStorageKey));
  if (isDeckLibrary(storedLibrary)) return storedLibrary;

  const legacyDeck = parseStoredValue(storage.getItem(legacyDeckStorageKey));
  const library = createDeckLibrary(isDeck(legacyDeck) ? legacyDeck : fallbackDeck);
  saveDeckLibrary(storage, library);
  storage.removeItem(legacyDeckStorageKey);
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

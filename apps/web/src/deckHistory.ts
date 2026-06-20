import type { Deck } from "@gigsmith/data-contracts";

export const deckHistoryLimit = 50;

export interface DeckHistory {
  past: Deck[];
  future: Deck[];
}

export type DeckHistories = Record<string, DeckHistory>;

export interface DeckHistoryTransition {
  histories: DeckHistories;
  deck?: Deck;
}

export function getDeckHistory(histories: DeckHistories, deckId: string): DeckHistory {
  return histories[deckId] ?? { past: [], future: [] };
}

export function recordDeckEdit(
  histories: DeckHistories,
  previousDeck: Deck,
  limit = deckHistoryLimit
): DeckHistories {
  const history = getDeckHistory(histories, previousDeck.id);
  return {
    ...histories,
    [previousDeck.id]: {
      past: [...history.past, previousDeck].slice(-Math.max(1, limit)),
      future: []
    }
  };
}

export function undoDeckEdit(histories: DeckHistories, currentDeck: Deck): DeckHistoryTransition {
  const history = getDeckHistory(histories, currentDeck.id);
  const previousDeck = history.past.at(-1);
  if (!previousDeck) return { histories };

  return {
    deck: previousDeck,
    histories: {
      ...histories,
      [currentDeck.id]: {
        past: history.past.slice(0, -1),
        future: [currentDeck, ...history.future]
      }
    }
  };
}

export function redoDeckEdit(histories: DeckHistories, currentDeck: Deck): DeckHistoryTransition {
  const history = getDeckHistory(histories, currentDeck.id);
  const [nextDeck, ...remainingFuture] = history.future;
  if (!nextDeck) return { histories };

  return {
    deck: nextDeck,
    histories: {
      ...histories,
      [currentDeck.id]: {
        past: [...history.past, currentDeck].slice(-deckHistoryLimit),
        future: remainingFuture
      }
    }
  };
}

export function dropDeckHistory(histories: DeckHistories, deckId: string): DeckHistories {
  if (!(deckId in histories)) return histories;
  const next = { ...histories };
  delete next[deckId];
  return next;
}

export const deckInputLimits = {
  textCharacters: 262_144,
  sharePayloadCharacters: 131_072,
  entriesPerSection: 250,
  deckNameCharacters: 120,
  identifierCharacters: 200,
  notesCharacters: 10_000,
  cardCount: 100,
  decklistLines: 500,
  decklistLineCharacters: 500
} as const;

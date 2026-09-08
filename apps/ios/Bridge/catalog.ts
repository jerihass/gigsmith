import { assertValidCardSnapshot, enrichCardKeywords, cyberpunkRulesetV1Printable as rules } from '@gigsmith/card-data';
import type { CardSnapshot } from '@gigsmith/data-contracts';

// Artwork is resolved separately by Swift. Never persist transient image URLs.
function textOnly(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(textOnly);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => key !== 'image_url' && key !== 'source_image_url').map(([key, child]) => [key, textOnly(child)]));
  return value;
}
export function prepareCatalog(text: string): CardSnapshot {
  const snapshot = textOnly(JSON.parse(text));
  assertValidCardSnapshot(snapshot);
  if (snapshot.metadata.sourceUrl !== 'https://api.netdeck.gg/api/cards/cyberpunk' || snapshot.cards.length < 1 || snapshot.cards.length > 5000) {
    throw new Error('The card snapshot has an unsupported source or card count.');
  }
  return { ...snapshot, cards: snapshot.cards.map(c => enrichCardKeywords(c, rules.keywords.map(k => k.name))) };
}

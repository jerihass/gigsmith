import { cyberpunkCardDb, cyberpunkRulesetV1Printable } from "@gigsmith/card-data";
import type { Card, CardId, Deck, DeckCardEntry, Ruleset } from "@gigsmith/data-contracts";

export interface FormatRulesetOptions {
  banned?: CardId[];
  restricted?: CardId[];
}

export function cardBySlug(slug: string): Card {
  const card = cyberpunkCardDb.cards.find((candidate) => candidate.slug === slug);
  if (!card) throw new Error(`Missing fixture card: ${slug}`);
  return card;
}

function entry(slug: string, count: number): DeckCardEntry {
  return { cardId: cardBySlug(slug).id, count };
}

export function createValidDeck(overrides: Partial<Deck> = {}): Deck {
  const deck: Deck = {
    id: "fixture-valid-deck",
    name: "Fixture Legal Deck",
    formatId: cyberpunkRulesetV1Printable.defaultFormatId,
    rulesetVersion: cyberpunkRulesetV1Printable.version,
    cardDataVersion: cyberpunkCardDb.metadata.cardDataVersion,
    legends: [
      entry("v-streetkid", 1),
      entry("dum-dum-maelstrom-triggerman", 1),
      entry("goro-takemura-vengeful-bodyguard", 1)
    ],
    main: [
      entry("swordwise-huscle", 3),
      entry("kerry-eurodyne-the-last-rockerboy", 3),
      entry("meredith-stout-stone-cold-corpo", 3),
      entry("royce-don-t-call-me-simon", 3),
      entry("mantis-blades", 3),
      entry("satori-sword-of-saburo", 3),
      entry("all-is-lost", 3),
      entry("secondhand-bombus", 3),
      entry("gilded-mato-n", 3),
      entry("hanako-arasaka-in-a-gilded-cage", 3),
      entry("offduty-malfini", 3),
      entry("t-bug-amateur-philosopher", 3),
      entry("corpo-security", 3),
      entry("emergency-atlus", 1)
    ]
  };

  return { ...deck, ...overrides };
}

export function createFormatRuleset(options: FormatRulesetOptions = {}): Ruleset {
  const formatId = "fixture-format";
  return {
    ...cyberpunkRulesetV1Printable,
    version: `${cyberpunkRulesetV1Printable.version}.fixture-format`,
    defaultFormatId: formatId,
    formats: [
      {
        id: formatId,
        name: "Fixture Format",
        banned: [...(options.banned ?? [])],
        restricted: [...(options.restricted ?? [])]
      }
    ]
  };
}

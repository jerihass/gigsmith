import type { Ruleset } from "@gigsmith/data-contracts";

export const cyberpunkRulesetV0Guide: Ruleset = {
  version: "ruleset.v0-guide",
  sourceUrl: "https://cyberpunktcg.com/gameplay-guide",
  sourceRetrievedAt: "2026-06-14",
  defaultFormatId: "open-guide",
  minMainDeckCards: 40,
  maxMainDeckCards: 50,
  requiredUniqueLegends: 3,
  maxCopiesByType: {
    Unit: 3,
    Program: 3,
    Gear: 3
  },
  formats: [
    {
      id: "open-guide",
      name: "Open Guide",
      banned: [],
      restricted: []
    }
  ],
  keywords: [
    {
      id: "adrenaline",
      name: "Adrenaline",
      reminderText: "This Unit can attack the turn it is played.",
      rulesetVersion: "ruleset.v0-guide"
    },
    {
      id: "go-solo",
      name: "Go Solo",
      reminderText: "Pay this Legend's cost to play it as a ready Unit. It can attack this turn. If it leaves the field, remove it from the game.",
      rulesetVersion: "ruleset.v0-guide"
    },
    {
      id: "quick",
      name: "Quick",
      reminderText: "May be activated or played as a reaction when a rival Unit attacks.",
      rulesetVersion: "ruleset.v0-guide"
    },
    {
      id: "blocker",
      name: "Blocker",
      reminderText: "When a rival Unit attacks, spend this Unit to redirect the attack to it instead.",
      rulesetVersion: "ruleset.v0-guide"
    },
    {
      id: "bottom-deck",
      name: "Bottom-deck",
      reminderText: "Put cards at the bottom of your deck in any order.",
      rulesetVersion: "ruleset.v0-guide"
    },
    {
      id: "trash",
      name: "Trash",
      reminderText: "Put the top card of your deck into your trash area. If a number is specified, trash that many cards.",
      rulesetVersion: "ruleset.v0-guide"
    }
  ],
  errata: []
};

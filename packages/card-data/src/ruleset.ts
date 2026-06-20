import type { Ruleset } from "@gigsmith/data-contracts";

const rulesetVersion = "ruleset.v1-printable-2026-06-19";

export const cyberpunkRulesetV1Printable: Ruleset = {
  version: rulesetVersion,
  sourceUrl: "https://cyberpunktcg.com/docs/printable-gameplay-guide.pdf",
  sourceRetrievedAt: "2026-06-19",
  defaultFormatId: "open-guide",
  minMainDeckCards: 40,
  maxMainDeckCards: 50,
  requiredUniqueLegends: 3,
  maxCopiesByType: {
    Unit: 3,
    Program: 3,
    Gear: 3
  },
  eddyRules: {
    startingEddies: 0,
    openingHandSize: 6,
    cardsDrawnPerTurn: 1,
    maxSellsPerTurn: 1,
    eddiesPerSoldCard: 1,
    soldCardDestination: "eddies-area",
    eddiesReadyAtStartOfTurn: true,
    legendPaymentValue: 1,
    firstPlayerSpentLegendsAtSetup: 2,
    firstPlayerLegendsReadyOnFirstTurn: false,
    callLegendCost: 1
  },
  mulliganRules: {
    maxMulligans: 1,
    returnScope: "full-hand",
    shuffleReturnedCards: true,
    drawCount: 6
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
      rulesetVersion
    },
    {
      id: "go-solo",
      name: "Go Solo",
      reminderText: "Pay this Legend's cost to play it as a ready Unit. It can attack this turn. If it leaves the field, remove it from the game.",
      rulesetVersion
    },
    {
      id: "quick",
      name: "Quick",
      reminderText: "May be activated or played as a reaction when a rival Unit attacks.",
      rulesetVersion
    },
    {
      id: "blocker",
      name: "Blocker",
      reminderText: "When a rival Unit attacks, spend this Unit to redirect the attack to it instead.",
      rulesetVersion
    },
    {
      id: "bottom-deck",
      name: "Bottom-deck",
      reminderText: "Put cards at the bottom of your deck in any order.",
      rulesetVersion
    },
    {
      id: "trash",
      name: "Trash",
      reminderText: "Put the top card of your deck into your trash area. If a number is specified, trash that many cards.",
      rulesetVersion
    }
  ],
  errata: []
};

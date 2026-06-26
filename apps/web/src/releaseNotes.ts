export type ReleaseNoteEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const releaseNotes: ReleaseNoteEntry[] = [
  {
    version: "0.1.0",
    date: "2026-06-26",
    title: "Portable Local Companion",
    changes: [
      "Added full-device backup and restore for decks, preferences, refreshed card data, and Gig Sandbox state.",
      "Added manual card database refresh with local snapshot persistence.",
      "Added deck-builder guardrails for copy limits, main-deck size, and Legend RAM alignment.",
      "Added Gig odds analysis for high, low, even, odd, different values, and same-value pairs.",
      "Improved Cyberpunk themes, card color hints, card details, and mobile deck-editing ergonomics."
    ]
  },
  {
    version: "0.0.1",
    date: "2026-06-20",
    title: "Rules Baseline",
    changes: [
      "Created the local-first PWA shell for Cyberpunk TCG deck building.",
      "Added card browsing from the snapshotted Netdeck Cyberpunk card database.",
      "Added rules-core validation for Legends, main-deck size, copy limits, unknown cards, and color RAM limits.",
      "Added deck import, export, share links, Eddy curve analysis, sample hands, and mulligan analysis.",
      "Added a playable Gig Sandbox model using the printable gameplay guide as the current rules source."
    ]
  }
];

export const latestReleaseNote = releaseNotes[0];

export type ReleaseNoteEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const releaseNotes: ReleaseNoteEntry[] = [
  {
    version: "0.1.10",
    date: "2026-06-28",
    title: "Deck Warning Cleanup",
    changes: [
      "Cleared stale deck RAM warnings after deck state changes so validation feedback matches the current deck."
    ]
  },
  {
    version: "0.1.9",
    date: "2026-06-28",
    title: "Gig Odds Scope Fixes",
    changes: [
      "Scoped Gig odds calculations to the active player.",
      "Kept Gig odds tied to the local deck so opponent state does not affect local deck analysis."
    ]
  },
  {
    version: "0.1.8",
    date: "2026-06-28",
    title: "Gig Sandbox Stability",
    changes: [
      "Prevented Gig dice pools from visually overlapping.",
      "Locked the first-player setting after a Gig match starts so active match state stays consistent."
    ]
  },
  {
    version: "0.1.7",
    date: "2026-06-28",
    title: "Deck Version Snapshots",
    changes: [
      "Added named deck versions that preserve card lists, notes, and rules/card-data baselines.",
      "Added version comparison with card-count deltas, legality, RAM, and Eddy curve summaries.",
      "Added restore-as-current-edit for saved versions without deleting version history.",
      "Added explicit JSON import/export support for deck version history."
    ]
  },
  {
    version: "0.1.6",
    date: "2026-06-27",
    title: "Faster Card Filtering",
    changes: [
      "Added card taxonomy filters with active filter chips.",
      "Collapsed advanced card filters on mobile to keep the card database easier to scan."
    ]
  },
  {
    version: "0.1.5",
    date: "2026-06-27",
    title: "Sellable Tag Polish",
    changes: [
      "Changed sellable badges to use a tag shape.",
      "Refined sellable tag spacing, height, rounded trailing edge, and right-side hole orientation.",
      "Centered and fine-tuned the tag hole alignment so the badge reads cleanly at small sizes.",
      "Scaled the sellable tag to match the surrounding card stat badges."
    ]
  },
  {
    version: "0.1.4",
    date: "2026-06-27",
    title: "Better Card Database Controls",
    changes: [
      "Added sellable card filtering to the card database.",
      "Added sellable trait badges with the eddies symbol for quicker scanning.",
      "Added remove controls directly to card database rows.",
      "Lightened card database row actions so controls are easier to read."
    ]
  },
  {
    version: "0.1.3",
    date: "2026-06-27",
    title: "Cleaner Card Previews",
    changes: [
      "Moved deck membership status to the front of card previews for faster deck-building feedback.",
      "Compacted card deck membership badges and aligned preview metadata.",
      "Refined color and type preview text while quieting secondary identity details.",
      "Switched RAM presentation to a memory icon for consistency with the other card stats."
    ]
  },
  {
    version: "0.1.2",
    date: "2026-06-27",
    title: "Sharper Card Readability",
    changes: [
      "Compacted the analysis status panels so deck feedback takes less vertical space.",
      "Added eddies and power values directly to card previews.",
      "Switched card power presentation to a sword icon for faster visual scanning."
    ]
  },
  {
    version: "0.1.1",
    date: "2026-06-27",
    title: "Refresh and Artwork Polish",
    changes: [
      "Added in-app release notes so recent changes are visible from the application header.",
      "Improved manual card database refresh so newly added cards appear immediately after an update.",
      "Cached external card art URLs locally to reduce repeated lookup work.",
      "Refined install icon artwork for a cleaner home-screen presentation."
    ]
  },
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

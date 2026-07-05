export type ReleaseNoteEntry = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

export const releaseNotes: ReleaseNoteEntry[] = [
  {
    version: "0.1.17",
    date: "2026-07-05",
    title: "Card Database Refresh",
    changes: [
      "Updated the bundled Netdeck Cyberpunk card snapshot from 61 to 82 cards.",
      "Kept the refreshed snapshot text-first with stable external artwork references only.",
      "Confirmed the official printable rules PDF hash is unchanged."
    ]
  },
  {
    version: "0.1.16",
    date: "2026-07-05",
    title: "Gig Odds Performance",
    changes: [
      "Aligned next Gig die ordering with the recommendation list.",
      "Cached exact Gig odds profiles to reduce repeated analysis work.",
      "Cached card search text for faster card filtering."
    ]
  },
  {
    version: "0.1.15",
    date: "2026-07-05",
    title: "Gig Tracker and Proxy Polish",
    changes: [
      "Reorganized the Gig tracker into player zones with a compact mobile layout.",
      "Prioritized controlled Gigs and made next-die recommendations explain their reasoning.",
      "Made Gig recommendation tie-breakers goal-aware and prefer higher dice when recommendations are otherwise tied.",
      "Refined printable proxy pagination, stat layout, and keyword handling."
    ]
  },
  {
    version: "0.1.14",
    date: "2026-07-05",
    title: "Offline Proxy PDF Export",
    changes: [
      "Added offline 9-up PDF export for printable proxy decks.",
      "Kept browser print as a fallback while PDF export avoids Safari page-break quirks.",
      "Generated proxy PDFs without artwork using local deck and card metadata."
    ]
  },
  {
    version: "0.1.13",
    date: "2026-07-05",
    title: "Printable Proxy Decks",
    changes: [
      "Added a Print tab that generates sleeve-sized proxy cards from local deck metadata.",
      "Included playable card fields on proxies: color, type, RAM, cost, power, sellable marker, rules text, keywords, classifications, and printing reference.",
      "Defaulted proxy printing to black-and-white with an optional color-accent mode."
    ]
  },
  {
    version: "0.1.12",
    date: "2026-06-29",
    title: "Journal and Update Polish",
    changes: [
      "Cleared stale transfer state after import/export flows.",
      "Aligned playtest journal color checkbox behavior.",
      "Clarified the PWA update banner copy.",
      "Aligned the app package version with the in-app release history."
    ]
  },
  {
    version: "0.1.11",
    date: "2026-06-29",
    title: "Playtest Journal",
    changes: [
      "Added a local playtest journal tied to deck versions and current-edit snapshots.",
      "Added per-version observed summaries for record, sample size, first-player split, turns, opponent colors, and tags.",
      "Included playtest journal data in full-device backups."
    ]
  },
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

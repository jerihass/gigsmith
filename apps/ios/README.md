# Gigsmith for iOS

Native SwiftUI app for iPhone and iPad, minimum iOS 26.0, Swift 6 language mode
with complete concurrency checking. No server, login, WebView, or network request
is needed. Game logic is the existing TypeScript engine bundled into Apple's
JavaScriptCore; the application UI, file access, state, and storage are Swift.

## Build and run

Requirements: macOS, Xcode with an iOS 26 SDK, Node.js 22, and `npm ci` at the
repository root. The checked-in engine bundle permits Xcode builds without Node.

```sh
npm ci
npm run build:ios-engine
npm run typecheck:ios
npm run check:ios-engine
npm run test:ios
open apps/ios/Gigsmith.xcodeproj
```

Select the **Gigsmith** scheme and an iOS 26 iPhone/iPad simulator, then Run.
For a physical device, set your signing team in Signing & Capabilities.

```sh
xcodebuild -project apps/ios/Gigsmith.xcodeproj -scheme Gigsmith \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath apps/ios/.derivedData CODE_SIGNING_ALLOWED=NO build

# Substitute an installed simulator's UDID from `xcrun simctl list devices available`.
xcodebuild -project apps/ios/Gigsmith.xcodeproj -scheme Gigsmith \
  -destination 'platform=iOS Simulator,id=SIMULATOR_UDID' \
  -derivedDataPath apps/ios/.derivedData CODE_SIGNING_ALLOWED=NO test
```

## Included

- Offline, searchable 104-card database, color/type filters and card rules/details.
- Multiple saved decks, duplicate/delete, rename, copy editing and bounded undo/redo.
- Existing versioned deck validation, explanatory fixes and Legend RAM totals.
- Files import/export for portable Gigsmith JSON and plain-text decklists.
- Notes and version history survive JSON exchange, although there is no history UI yet.
- Seeded opening hands, sellable counts, composition, Eddy curve and mulligan guidance
  with assumptions, data limitations, sample size and confidence information.
- Persistent match tracker: gain Gigs, enter/change die values, record resolved steals,
  advance turns, and see Street Cred, overtime, and winner status. Match undo includes
  starting a new match; corrupt or incompatible saves are preserved.
- Adaptive cyan theme, readable light/dark surfaces, and card-color markers; Settings
  offers System, Dark and Light appearances.
- Optional card artwork with offline disk caching, coalesced requests, a 100 MiB limit,
  and a clear-cache control. Artwork remains off until explicitly enabled in Settings.
- Standard iOS controls, Dynamic Type and VoiceOver labels.

## Public package API and data

`RulesEngine` owns an actor-isolated JavaScriptCore context. Its typed methods load
cards, create/validate decks, import/export, sample hands, and produce analysis reports.
`DeckLibrary` owns edits and 100 in-session undo snapshots. A mutation becomes visible
only after its atomic write succeeds. `DeckStorage` stores a Codable deck array in
Application Support/Gigsmith/decks.json. A failed decode stops startup and offers a
copy of the original file instead of replacing it with an empty library. Undo history
is intentionally not persisted.

`Bridge/index.ts` calls shared packages, and `scripts/build-ios-engine.mjs` produces
the committed resource. Regenerate it after changing cards, rules, or import/export.
The native rules bundle omits optional remote art URLs; the Swift artwork client resolves signed URLs when enabled. No downloaded code is evaluated;
all user data crosses the bridge as JSON function arguments. Engine exceptions become
visible Swift errors. Snapshot and ruleset versions remain attached to every deck.

Swift contract tests cover storage, failed writes, undo/redo, malformed input,
portable limits, repeatable hands, and JSON/text exchange. Vitest tests remain the
rule oracle. The Xcode UI test creates a deck, adds a card, opens validation, and
verifies the saved count after terminating and relaunching the app. A second test
checks match gain/undo, turn advancement, and relaunch persistence. UI tests create
uniquely named smoke decks and replace the simulator's current match.

## Current limits

This is the native deck-building release, not complete web feature parity. Tactical board editing, Gig odds UI, playtest journals, version history UI,
QR sharing and proxy PDFs remain follow-up work. Mulligan guidance
currently uses balanced scoring and first-player assumptions. Imported ruleset mismatch
warnings remain visible; the bundled engine uses the repository's current baseline.

App Store distribution, release icons, signing/provisioning and physical-device QA
are not completed. See ../../docs/IOS_IMPLEMENTATION.md for the implementation plan.

## Match state

`MatchSession` stores `match.json` next to the deck library, with the ruleset version.
`RulesEngine` delegates all match transitions to the shared rules package. Stored state
is checked for native player/die identities, value bounds, and ruleset compatibility;
derived reports are regenerated on load. Writes are atomic and the last 100 match
actions can be undone during the session. A match-load error leaves decks available.

This is a tracker for resolved tabletop actions: recording a steal does **not** check
attack legality, Blockers, or card-effect sequencing. Enter actual die rolls; the app
does not roll dice or recommend tactical plays.

## Appearance and artwork

Open Settings to choose System, Dark or Light and enable External artwork. Artwork
loads lazily in card rows and details; cached images remain usable offline. Clear cached
artwork also turns the preference off. See ../../docs/CARD_ART.md for request, cache,
validation, and opt-in live-test details. The deterministic native suite skips live
network tests unless explicitly enabled.

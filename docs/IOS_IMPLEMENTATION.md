# Native iOS implementation

Target: iOS 26+, Swift 6 language mode, SwiftUI, no accounts or network dependency.

## Architecture

A native SwiftUI application uses a local Swift package for models, atomic deck storage,
and a main-actor-isolated JavaScriptCore adapter. The existing TypeScript rules engine,
card snapshot, and deck parsers are bundled at build preparation time, without a browser,
remote code, or third-party runtime. This preserves the web engine's rule tests and avoids
diverging game implementations. All game decisions stay outside SwiftUI.

## Commit-sized delivery sequence

1. Record architecture, scope, and validation plan (this document).
2. Add native contract tests; run them red before implementing the bridge and storage.
3. Implement bundled engine, Swift 6 models, import/export, and atomic storage; run green.
4. Add an iOS application target and native card browser, deck library/editor, validation,
   RAM report, curve/composition reports, seeded opening hands and mulligan analysis.
5. Build with the iOS 26 simulator SDK, run native and existing rule tests, and document
   reproducible build instructions and limitations.

## Validation

Swift tests cover offline card loading, rule validation, seed reproducibility, portable
JSON interoperability and malformed imports, persistence round trips, and corrupt-file
preservation. Existing Vitest tests remain the rule oracle. The bundle must be regenerated
from source and checked for drift. Compile the app with Swift 6 strict concurrency and
an iOS 26 deployment target; simulator smoke testing covers launch and basic navigation.

## Scope and follow-up parity

The first native release focuses on offline deck building and analysis. Web-specific PWA
installation is inapplicable. Tactical board editing, playtest journals,
version history UI, QR sharing, proxy PDFs, and optional artwork are follow-up slices;
they must not be advertised as present. Preserve imported deck version history in JSON.
App Store distribution needs the owner's signing team, icons, and release review.

## Implementation outcome (2026-09-07)

The delivery sequence above is implemented. The Xcode app target supports iPhone and
iPad with iOS 26.0 minimum, Swift 6 mode and complete strict-concurrency checking.
The native kit has nine passing Swift Testing contracts. The existing 264 Vitest
tests pass, as do web and bridge typechecking and the generated-bundle freshness check.
An XCTest UI smoke test passes on an iPhone 17 Pro Max running iOS 26.0, built with
Xcode's iOS 26.2 SDK. It verifies creation, card editing, live validation, and persisted
state after app termination/relaunch. Screens were inspected using XCTest attachments.

TDD commits recorded the absent engine/storage and library/analysis contracts before
implementation. Additional regression tests cover portable limits and text exchange.
The simulator run caught a combined-accessibility-label mismatch in the test; the
persisted card count was correct. Debug now builds the active architecture to match
SwiftPM dependencies during destination-specific test runs.

Native CI runs the shared tests, bundle check, native tests, simulator build and UI test
on a macOS runner with an installed iOS 26 SDK/runtime. The workflow is committed;
remote CI has not been run in this session. Build commands and API notes are in
`apps/ios/README.md`. Signing, distribution and the listed feature-parity follow-ups
remain outside this native deck-building release.

The unsigned Release build for generic physical iOS devices also succeeds against
the iOS 26.2 SDK. This verifies compilation/linking, not device installation or signing.


## Follow-up: native match tracking

Implemented a Match tab that reuses the shared gain/steal/value/turn functions and
reports Street Cred, overtime and winners. First-player selection, a confirmed new
match, and bounded undo are native controls. Users enter physical die rolls. Steals
are explicitly recorded only after combat has resolved; this does not claim tactical
legality or Blocker handling.

The match is saved atomically in its own file. Failed writes do not change memory or
undo history. Invalid saved data and incompatible ruleset versions cause a visible
error and preserve the original file; deck access remains independent. Derived match
reports are recomputed when loading rather than trusted from storage.

TDD started with failing native contracts, followed by the engine/storage commit and
the SwiftUI slice. Fourteen Swift tests now pass, including parameterized normal and
overtime winner timing, transition rejections, reload/undo, and failed saves. All 264
shared TypeScript tests, native bridge typechecking, and bundle freshness checks pass.

The existing deck UI regression and the new match UI test both pass on iOS 26.0,
built with the iOS 26.2 SDK. The match test checks gain, undo, turn advancement and
persisted scores after relaunch. Its screenshot was visually reviewed. Native CI
already covers this added UI test; no remote CI or signed distribution was performed.

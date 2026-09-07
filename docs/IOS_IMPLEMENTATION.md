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
installation is inapplicable. Match tracking, tactical board editing, playtest journals,
version history UI, QR sharing, proxy PDFs, and optional artwork are follow-up slices;
they must not be advertised as present. Preserve imported deck version history in JSON.
App Store distribution needs the owner's signing team, icons, and release review.

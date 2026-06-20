# Gigsmith Backlog

This backlog is organized by milestone. Each task must preserve the development constitution: useful runnable slices, pure rules core, versioned data, local-first behavior, deterministic reports, and tests for every implemented rule.

## Current Baseline

- Initial TypeScript monorepo exists.
- Web shell renders a local deck editor, card browser, RAM summary, validation report, and text import/export.
- Card data snapshot is `netdeck-cyberpunk-2026-06-18` with 60 Netdeck cards.
- Rules baseline is `ruleset.v1-printable-2026-06-19`.
- Implemented validation rules:
  - exactly 3 Legend cards
  - 40-50 main-deck cards
  - max 3 non-Legend copies
  - RAM/color limit checks from selected Legends
  - unknown card reporting

## Next Execution Sequence

Execute the next reliability, UX, and feature work in this order:

1. `GS-902` local-data recovery and application error boundary.
2. `GS-070` task-focused application navigation.
3. `GS-071` deck-building sort, filter, and count ergonomics.
4. `GS-903` browser workflow and accessibility coverage.
5. `GS-072` deck-edit undo and redo.
6. `GS-080` deterministic sample-hand analysis.
7. `GS-081` mulligan comparison and recommendations.
8. `GS-904` PWA deployment and update hardening.
9. `GS-905` measured performance budgets.
10. `GS-073` feature-oriented stylesheet split.
11. `GS-090` optional external card art.

Each step should land as a focused commit with tests, typechecking, and a production build.

## M0 - Repository, Data Contracts, And Snapshot Discipline

### GS-001: Document Card Snapshot Refresh Flow

**Status:** Done.

**Goal:** Make card data updates repeatable without relying on tribal knowledge.

**Deliverables:**
- Add docs describing how to fetch `https://api.netdeck.gg/api/cards/cyberpunk`.
- Record required metadata: source URL, retrieval date, card count, and source notes.
- Explain that external image URLs are references only and card art is not bundled.

**Acceptance Criteria:**
- A new contributor can refresh the snapshot manually from docs.
- The docs say to run validation/tests after a snapshot update.

**Tests:**
- No automated test required unless a script is added.

**Constitution Check:** Supports versioned data and text/data-first card records.

### GS-002: Add Runtime Schema Validation For Card Snapshots

**Status:** Done.

**Goal:** Fail clearly when Netdeck data shape changes.

**Deliverables:**
- Add a small dependency-free snapshot validator or a lightweight schema library if justified.
- Validate required fields used by the app: `id`, `external_id`, `display_name`, `slug`, `color`, `card_type`, `ram`, `cost`, `power`, `rules_text`, `set`.
- Return structured validation errors.

**Acceptance Criteria:**
- Invalid snapshot fixtures produce explicit field/path errors.
- Valid current snapshot passes.

**Tests:**
- Valid 60-card snapshot fixture.
- Missing `id`.
- Invalid `card_type`.
- Missing metadata count.

**Constitution Check:** Keeps data versioning honest and avoids hidden assumptions.

### GS-003: Add Source Metadata Surface In The UI

**Status:** Done.

**Goal:** Make data/rules provenance visible to users.

**Deliverables:**
- Show card data version, ruleset version, source retrieval date, and source card count.
- Link to the gameplay guide and Netdeck source endpoint or page.
- Include an unofficial/non-endorsed disclaimer in app chrome or footer.

**Acceptance Criteria:**
- User can identify which card/rules snapshot produced validation results.
- No official endorsement is implied.

**Tests:**
- Browser/UI smoke check.

**Constitution Check:** Supports legal/IP safety and explainable reports.

### GS-004: Remove Transient Image URLs From Card Snapshots

**Status:** Done.

**Goal:** Keep card snapshots stable while preserving optional external artwork support.

**Deliverables:**
- Stop persisting temporary signed `image_url` values during snapshot refreshes.
- Retain stable `source_image_url` references when supplied by the source.
- Document that external artwork may be unavailable and must never be required for card details.

**Acceptance Criteria:**
- Refreshed snapshots contain no expiring signed image URLs.
- Snapshot diffs are not dominated by image-token churn.
- The text-only card experience remains complete.

**Tests:**
- Snapshot importer or validator test proving transient image URLs are discarded.

**Constitution Check:** Preserves text/data-first records, reproducible snapshots, and legal/IP boundaries.

## M1 - Local Card Database And Deck Builder

### GS-010: Improve Card Browser Filtering

**Status:** Done.

**Goal:** Make the card database usable for real deck construction.

**Deliverables:**
- Filter by color, type, RAM, cost, and text search.
- Keep filtering local-only.
- Preserve responsive layout.

**Acceptance Criteria:**
- Users can narrow to a color/type without editing the deck.
- Search covers display name, classification, keywords, and rules text.

**Tests:**
- UI smoke check or component-level filtering tests.

**Constitution Check:** Useful UI slice over existing local card data.

### GS-011: Improve Deck Editing Controls

**Status:** Done.

**Goal:** Make card count edits deliberate and hard to misclick.

**Deliverables:**
- Separate Legend selection from main-deck card additions.
- Add `+` and `-` controls for main deck counts.
- Prevent negative counts.
- Keep validation in rules-core only.

**Acceptance Criteria:**
- Adding a Legend does not silently create duplicate singleton issues without visible feedback.
- Main deck count controls are stable on mobile.

**Tests:**
- Browser/UI smoke check.
- Existing validation tests remain unchanged.

**Constitution Check:** UI exposes rules-core output without embedding game rules in components.

### GS-012: Persist Multiple Local Decks

**Status:** Done.

**Goal:** Move from one local deck to a usable local deck library.

**Deliverables:**
- Store multiple decks in local storage with stable IDs.
- Add create, rename, duplicate, delete, and select deck actions.
- Keep all storage local.

**Acceptance Criteria:**
- Refreshing the page preserves all local decks.
- Deleting a deck requires a clear local UI action.

**Tests:**
- Storage helper unit tests.
- Browser smoke check.

**Constitution Check:** Local-first, no accounts or backend.

### GS-013: Add Card Detail View

**Status:** Done.

**Goal:** Let deck builders inspect what a card does without leaving the app.

**Deliverables:**
- Open a focused card detail panel from the card database.
- Show rules text, keywords, classifications, type, color, RAM, cost, power, rarity, and source link.
- Keep a complete text-only fallback and do not bundle copyrighted card art.
- Reserve external image URL support for a separately reviewed asset task.

**Acceptance Criteria:**
- Users can inspect and dismiss details with keyboard, pointer, or touch input.
- The detail layout remains readable on mobile.
- Cards with the same base name remain distinguishable by stable ID and subname.

**Tests:**
- Card detail formatting tests.
- Browser smoke check across desktop and mobile.

**Constitution Check:** Local snapshot remains authoritative; UI does not depend on external art or live services.

### GS-014: Add Installable Offline PWA Shell

**Status:** Done.

**Goal:** Let users install and reopen Gigsmith without keeping a development server running.

**Deliverables:**
- Add a web app manifest with install metadata and icons.
- Add a service worker that caches the application shell and versioned local card data.
- Provide an explicit update path when a new application or card-data version is available.
- Keep deck storage local and independent from network availability.

**Acceptance Criteria:**
- The production build passes installability checks.
- An installed build opens and supports browsing, editing, and validation while offline.
- Cache updates do not delete or replace locally stored decks.

**Tests:**
- Production-build service-worker test.
- Browser smoke check for first load, offline reload, and update behavior.

**Constitution Check:** Implements the local-first PWA direction without introducing a backend.

**Scheduling Note:** Documented for explicit tracking; this does not replace `GS-021` as the next planned feature.

## M2 - Deck Validation And RAM Legality

### GS-020: Group Validation Report By Category

**Status:** Done.

**Goal:** Make validation failure easier for new players to understand.

**Deliverables:**
- Group errors into Deck Size, Legends, Copies, RAM, Format, Unknown Cards, and Data Warnings.
- Show affected card display names when available.
- Preserve structured `ValidationResult`.

**Acceptance Criteria:**
- User can see why the deck is illegal without reading raw issue codes.
- Rules-core remains UI-agnostic.

**Tests:**
- Snapshot tests for grouped report helper.
- Existing rule tests remain passing.

**Constitution Check:** UX explains failure; reports stay structured.

### GS-021: Add Obvious Suggested Fixes

**Status:** Done.

**Goal:** Give clear next actions for common invalid decks.

**Deliverables:**
- Add suggested fixes for too few/many Legends, deck size, copy limit, and RAM violations.
- Keep suggestions deterministic and conservative.

**Acceptance Criteria:**
- Suggestions never mutate a deck automatically.
- Suggestions reference affected cards where possible.

**Tests:**
- Unit tests for each suggestion-bearing rule.

**Constitution Check:** Deterministic before clever; reports over booleans.

### GS-022: Add Format Legality Fixtures

**Status:** Done.

**Goal:** Prove the format model can support future banned/restricted updates.

**Deliverables:**
- Add test-only ruleset with banned and restricted cards.
- Validate banned card errors and restricted card warnings.

**Acceptance Criteria:**
- No product UI for format management is required yet.
- Tests demonstrate format-specific legality works.

**Tests:**
- Banned card fixture.
- Restricted card fixture.

**Constitution Check:** Versioned rules and format-specific legality.

## M3 - Eddy Curve Analysis

### GS-030: Define Eddy Curve Report Contract

**Status:** Done.

**Goal:** Add deterministic economy analysis without hiding assumptions.

**Deliverables:**
- Add `EddyCurveReport` type.
- Separate Eddy demand, baseline supply, Legend contribution, and card-effect adjustments.
- Include assumptions, card cost buckets, sellable counts, and warnings for missing costs.
- Account for opening hand size, one card drawn per turn, one sale per turn, and first-player Legend timing.
- Keep function pure: `analyzeEddyCurve(deck, cardDb, ruleset)`.

**Acceptance Criteria:**
- Report explains exactly which card fields drive the curve.
- Supply projections distinguish guaranteed rules ceilings from draw-dependent estimates.
- No unsupported claim about optimal deck shape is shown.

**Tests:**
- Golden deck curve fixture.
- Missing cost fixture.

**Constitution Check:** Deterministic, explainable analysis first.

### GS-031: Add Eddy Curve UI

**Status:** Done.

**Goal:** Expose the curve report in the app.

**Deliverables:**
- Add compact cost-bucket visualization.
- Show assumptions and missing-data warnings.
- Avoid adding a charting dependency unless simple CSS is insufficient.

**Acceptance Criteria:**
- User can scan cost distribution and eddiable count from the deck screen.

**Tests:**
- Browser/UI smoke check.

**Constitution Check:** Small boring dependencies; useful UI over tested rule function.

## M4 - Gig And Street Cred Simulator

### GS-040: Add Street Cred Calculation

**Status:** Done.

**Goal:** Model Street Cred from controlled Gig dice.

**Deliverables:**
- Add `calculateStreetCred(boardState)` or equivalent pure function.
- Represent Gigs with die type, value, and controller.

**Acceptance Criteria:**
- Street Cred is derived from controlled Gigs, not hand-entered totals.

**Tests:**
- No Gigs.
- Multiple controlled Gigs.
- Rival-controlled Gigs ignored.

**Constitution Check:** Model the game honestly.

### GS-041: Add Deterministic Gig State Sandbox

**Status:** Done.

**Goal:** Let users model simple Gig states before probability simulation.

**Deliverables:**
- UI to add/remove Gig dice, set values, and assign controller.
- Show derived Street Cred.
- No Monte Carlo yet.

**Acceptance Criteria:**
- All calculations work offline and update instantly.

**Tests:**
- Unit tests for Street Cred.
- Browser smoke check.

**Constitution Check:** Deterministic before clever; local simulations.

## M5 - Import, Export, And Shareable Decks

### GS-050: Stabilize Deck JSON Format

**Status:** Done.

**Goal:** Make deck JSON a durable interchange format.

**Deliverables:**
- Document the deck JSON shape.
- Add version field for deck serialization.
- Add parse/validate helper with useful errors.

**Acceptance Criteria:**
- JSON import/export round-trips without data loss.
- Unknown future fields do not crash import.

**Tests:**
- JSON round-trip.
- Missing required field.
- Unknown card ID.

**Constitution Check:** Import/export is first-class.

### GS-051: Add Shareable Encoded Deck URLs

**Status:** Done.

**Goal:** Support local-first sharing without accounts.

**Deliverables:**
- Encode deck JSON into a URL-safe payload when practical.
- Decode from URL on app load with validation.
- Show useful errors for malformed payloads.

**Acceptance Criteria:**
- Shared URL can reconstruct a deck locally.
- No server is required.

**Tests:**
- Encode/decode round-trip.
- Malformed payload.

**Constitution Check:** Local-first sharing.

## M6 - Board-State Tactical Sandbox

### GS-060: Define Attack Line Domain Model

**Status:** Done.

**Goal:** Model attack decisions without putting logic in UI.

**Deliverables:**
- Add board/action types for Units, Gigs, blockers, ready/spent state, and attack targets.
- Add `evaluateAttackLines(boardState, ruleset)` returning structured legal/illegal lines.

**Acceptance Criteria:**
- Function can explain why a Gig steal line is blocked.
- Unknown or ambiguous rules produce warnings/unsupported reasons.

**Tests:**
- Unblocked Gig steal.
- Active Blocker prevents Gig steal.
- Spent/removed/bypassed Blocker allows line where rules support it.

**Constitution Check:** Blocker sequencing modeled honestly.

### GS-061: Add Tactical Sandbox UI

**Status:** Done.

**Goal:** Expose attack-line analysis as a small usable sandbox.

**Deliverables:**
- UI to set Units, ready/spent state, Blocker state, and Gigs.
- Display legal lines and reasons.
- Keep mutation explicit and local.

**Acceptance Criteria:**
- User can reproduce a simple Blocker scenario and see why a steal is legal or illegal.

**Tests:**
- Browser/UI smoke check.
- Rules-core attack tests remain the source of truth.

**Constitution Check:** UI explains failure and does not hide mutation in views.

## M7 - Application UX And Deck-Building Workflow

### GS-070: Add Task-Focused Application Navigation

**Priority:** P0.

**Status:** Done.

**Goal:** Replace the single long page with predictable task-oriented views without hiding deck status.

**Deliverables:**
- Add accessible tabs or equivalent navigation for Deck, Analysis, Gigs, Tactics, and Transfer.
- Keep deck legality and active-deck identity visible across views.
- Preserve the active view across reloads without encoding private deck data in the URL.
- Keep source provenance and disclaimer reachable without dominating routine workflows.

**Acceptance Criteria:**
- A user can reach every existing feature in two actions or fewer.
- Browser back/forward behavior is deliberate and documented.
- Mobile layouts do not require scrolling through unrelated tools.
- No rules logic moves into navigation components.

**Tests:**
- Browser tests for switching views on desktop and mobile.
- Keyboard navigation and focus-order checks.
- Reload restores a valid selected view.

**Constitution Check:** Improves tournament usability while keeping the existing local-first slices intact.

### GS-071: Improve Deck-Building Sort, Filter, And Counts

**Priority:** P0.

**Status:** Done.

**Goal:** Make repeated deck editing faster and easier to audit.

**Deliverables:**
- Add card-browser sorting by name, cost, RAM, power, color, and type.
- Add a deck-membership filter with All, In Deck, and Not In Deck modes.
- Show main-deck and Legend counts near editing controls.
- Add a compact deck curve summary within the Deck view.
- Preserve stable control dimensions on mobile.

**Acceptance Criteria:**
- Users can isolate cards already present in the active deck.
- Sort and filter changes never mutate the deck.
- Counts update immediately after every edit.
- Duplicate base names remain distinguishable by stable card identity and subname.

**Tests:**
- Unit tests for sorting and deck-membership filtering.
- Browser test for an add, filter, sort, and remove workflow.

**Constitution Check:** Speeds up deck construction without duplicating legality rules in the UI.

### GS-072: Add Deck Edit Undo And Redo

**Priority:** P1.

**Status:** Done.

**Goal:** Let users recover from accidental deck changes without restoring an entire saved deck.

**Deliverables:**
- Track bounded, per-deck edit history for card, Legend, and deck-name changes.
- Add familiar undo and redo icon buttons with tooltips and disabled states.
- Clear redo history after a new edit.
- Define behavior for import, reset, baseline upgrade, deck switching, and deletion.

**Acceptance Criteria:**
- Undo and redo never cross deck boundaries.
- Reload preserves the saved deck but does not require preserving transient history.
- Undoing an edit immediately recalculates validation, RAM, and analysis.

**Tests:**
- History reducer tests covering undo, redo, branching, limits, and deck switches.
- Browser smoke test for add, undo, and redo.

**Constitution Check:** Mutation remains explicit and local; derived reports continue to come from pure functions.

### GS-073: Split Styles By Feature Boundary

**Priority:** P3.

**Goal:** Make UI changes safer after the navigation and deck workflow stabilize.

**Deliverables:**
- Split the monolithic stylesheet into base, layout, and feature-owned styles.
- Preserve the existing cascade intentionally; do not redesign during extraction.
- Document shared tokens and responsive breakpoints.
- Remove duplicated declarations found during the mechanical split.

**Acceptance Criteria:**
- Rendered desktop and mobile layouts remain visually equivalent before intentional follow-up changes.
- Feature components import or own their relevant styles predictably.

**Tests:**
- Production build and browser screenshot comparison at desktop and phone widths.
- No new overflow or overlap findings.

**Constitution Check:** This is deferred cleanup after useful UX work, not speculative architecture.

## M8 - Hand And Mulligan Analysis

### GS-080: Add Deterministic Sample-Hand Analysis

**Priority:** P1.

**Status:** Done.

**Goal:** Let users inspect representative opening hands from the active deck.

**Deliverables:**
- Add a pure seeded shuffle and draw function outside the UI.
- Generate six-card opening hands from main-deck copies.
- Show costs, sellable cards, classifications, and known data limitations.
- Allow seed entry or regeneration while displaying the active seed.

**Acceptance Criteria:**
- The same deck and seed always produce the same hand.
- Unknown card IDs and incomplete card data return structured issues instead of crashing.
- Sampling does not modify the saved deck.

**Tests:**
- Seed determinism, copy counts, hand size, empty/short deck, and unknown-card tests.
- Browser test for regenerating and reproducing a hand.

**Constitution Check:** Deterministic, explainable analysis precedes simulation or strategic recommendations.

### GS-081: Add Mulligan Comparison And Recommendations

**Priority:** P2.

**Status:** Done.

**Goal:** Compare keep and mulligan outcomes using visible, conservative assumptions.

**Deliverables:**
- Define a versioned mulligan-analysis report in data contracts.
- Compare opening-hand cost, sellable density, playable capacity, and selected user goals.
- Support exact enumeration when practical and seeded simulation otherwise.
- Expose assumptions, sample size, confidence limits, and unsupported card-text effects.

**Acceptance Criteria:**
- Recommendations explain the metrics that produced them.
- The app never labels a hand objectively correct when card-text sequencing is not modeled.
- Simulation accepts a seed and is reproducible.

**Tests:**
- Known small-deck exact cases.
- Seeded regression fixtures.
- Insufficient-data and unsupported-effect warnings.

**Constitution Check:** Avoids black-box advice and records simulation assumptions explicitly.

## M9 - Optional Card Media

### GS-090: Add Optional External Card Art

**Priority:** P3.

**Status:** Done.

**Goal:** Improve visual card recognition without making artwork a runtime or legal dependency.

**Deliverables:**
- Add an opt-in card-art display preference, disabled by default.
- Load only stable external `source_image_url` references; never bundle or proxy card art.
- Provide loading, unavailable, and text-only states without layout shifts.
- Allow users to disable external requests immediately.

**Acceptance Criteria:**
- Every card workflow remains complete when offline or when images fail.
- No signed URLs, downloaded art, or external image cache is committed to the repository.
- The interface remains clearly unofficial.

**Tests:**
- Unit tests for image preference and fallback selection.
- Browser tests with images enabled, unavailable, and offline.
- Verify no external image request occurs while the preference is disabled.

**Constitution Check:** Text/data remains authoritative and artwork stays optional and external.

## Cross-Cutting Work

### GS-900: Add CI

**Status:** Done.

**Goal:** Make every commit run the same verification commands.

**Deliverables:**
- Add GitHub Actions workflow for install, test, typecheck, and build.

**Acceptance Criteria:**
- CI runs `npm test`, `npm run typecheck`, and `npm run build`.

**Tests:**
- CI itself.

**Constitution Check:** Protects rule/test discipline.

### GS-901: Track Rule Uncertainty

**Status:** Done.

**Goal:** Keep emerging rules explicit instead of hidden in code.

**Deliverables:**
- Add `docs/RULE_UNCERTAINTY.md`.
- List rules that need confirmation from future official printout.
- Link pending/skipped tests to uncertainty notes.

**Acceptance Criteria:**
- No uncertain rule is silently implemented as fact.

**Tests:**
- Pending tests where applicable.

**Constitution Check:** Model the game honestly.

**Artifact:** [`RULE_UNCERTAINTY.md`](./RULE_UNCERTAINTY.md)

### GS-902: Add Local-Data Recovery And An Application Error Boundary

**Priority:** P0.

**Status:** Done.

**Goal:** Prevent malformed local data or an unexpected render failure from making the app unusable.

**Deliverables:**
- Preserve the raw invalid deck-library payload instead of silently overwriting it.
- Show a recovery surface with export, reset, and retry actions.
- Add an application-level error boundary that does not expose private deck data in logs.
- Keep destructive recovery actions explicit and scoped to Gigsmith storage keys.

**Acceptance Criteria:**
- Corrupted local storage does not produce a blank screen or silently destroy the stored payload.
- Users can download or copy the raw recovery payload before resetting.
- Resetting local data does not clear service-worker caches, unrelated site storage, or browser data.

**Tests:**
- Storage tests for invalid JSON, invalid schema, recovery preservation, and explicit reset.
- Browser test for recovery from a corrupted deck library.
- Error-boundary rendering test.

**Constitution Check:** Protects local-first ownership and makes failure understandable and reversible.

### GS-903: Add Browser Workflow And Accessibility Coverage

**Priority:** P0 after `GS-070` and `GS-071`.

**Status:** Done.

**Goal:** Protect the core mobile and offline workflows with repeatable browser tests.

**Deliverables:**
- Add browser tests for deck creation/editing, validation, card details, import/export, baseline upgrade, Gigs, and tactics.
- Test production PWA first load and offline reload.
- Add automated accessibility checks for labels, landmarks, dialog focus, keyboard navigation, and contrast regressions where tooling supports them.
- Run the stable browser suite in CI.

**Acceptance Criteria:**
- Core workflows pass at desktop and phone viewports.
- Tests fail on horizontal overflow, inaccessible dialogs, or missing control names.
- Offline tests prove local deck persistence without a server.

**Tests:**
- This item is the browser and accessibility test suite.

**Constitution Check:** Raises confidence around real event conditions without moving game logic into UI tests.

### GS-904: Harden PWA Deployment And Update Versioning

**Priority:** P2.

**Goal:** Make installation and updates reliable outside root-path localhost previews.

**Deliverables:**
- Derive service-worker scope and asset URLs from the configured Vite base path.
- Generate cache versions from build identity plus card-data and ruleset versions.
- Verify update activation across two sequential production builds.
- Document HTTPS deployment, installation, update, and storage-preservation behavior.

**Acceptance Criteria:**
- The app installs and works offline from both root and configured subpath deployments.
- A new build prompts for update, activates on request, and removes obsolete shell caches.
- Updates never replace or delete local deck storage.

**Tests:**
- Sequential-build service-worker update test.
- Root-path and subpath production smoke tests.
- Offline reload and local-deck persistence regression tests.

**Constitution Check:** Strengthens local-first delivery without introducing a backend.

### GS-905: Establish Performance Budgets Before Optimizing

**Priority:** P2 after the new navigation and analysis views exist.

**Goal:** Detect meaningful regressions and optimize only measured bottlenecks.

**Deliverables:**
- Record production JavaScript, CSS, service-worker, and card-snapshot sizes.
- Measure initial render, filter response, deck-edit response, and analysis recalculation on representative phone hardware or throttling.
- Add generous CI size budgets with actionable failures.
- Document thresholds that would justify list virtualization, memoization changes, code splitting, or a state-management dependency.

**Acceptance Criteria:**
- CI reports bundle sizes and fails only when an agreed budget is exceeded.
- No optimization dependency is added without a measured failing case.
- Card browsing and deck edits remain responsive at the expected card-set growth target.

**Tests:**
- Build-size budget check.
- Repeatable browser performance scenario with recorded methodology.

**Constitution Check:** Follows deterministic-before-clever and small-dependency principles.

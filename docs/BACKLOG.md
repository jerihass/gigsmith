# Gigsmith Backlog

This backlog is organized by milestone. Each task must preserve the development constitution: useful runnable slices, pure rules core, versioned data, local-first behavior, deterministic reports, and tests for every implemented rule.

## Current Baseline

- Initial TypeScript monorepo exists.
- Web shell renders a local deck editor, card browser, RAM summary, validation report, and text import/export.
- Card data snapshot is `netdeck-cyberpunk-2026-06-20` with 61 Netdeck cards.
- Rules baseline is `ruleset.v1-printable-2026-06-19`.
- Static GitHub Pages deployment is configured with root/subpath PWA build verification and deployment documentation.
- Weekly source freshness is documented as a manual policy; scheduled source-change reporting is still backlog work.
- Implemented validation rules:
  - exactly 3 Legend cards
  - 40-50 main-deck cards
  - max 3 non-Legend copies
  - RAM/color limit checks from selected Legends
  - unknown card reporting

## Next Execution Sequence

The original `M0`-`M10` plan is complete. Execute the next product work in this order:

1. `GS-161` weekly card/rules source-change reporting automation.
2. `GS-130` collection-aware deck building.
3. `GS-140` deeper composition analysis.
4. `GS-150` shareable and printable deck reports.

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
- Valid 61-card snapshot fixture.
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

**Status:** Retired from the UI on June 20, 2026.

**Outcome:** The free-form add/remove model did not match the official fixed
12-die setup. Its Street Cred primitive remains in rules-core; GS-042 replaces
the UI with an official match-state tracker.

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

### GS-042: Replace The Gig Sandbox With A Fixed Match Tracker

**Status:** Done.

**Goal:** Make the Gigs view represent an actual Cyberpunk TCG match rather than an arbitrary dice calculator.

**Deliverables:**
- Create one `d4`, `d6`, `d8`, `d10`, `d12`, and `d20` per player in their Fixer areas.
- Enforce one start-phase gain per turn and keep each player's `d20` last.
- Track original ownership, current control, die values, Street Cred, active player, and completed turns.
- Support explicit rolling, value adjustment, stealing, reset, and first-player selection.
- Report start-turn seven-Gig wins and immediate overtime wins.

**Acceptance Criteria:**
- Dice cannot be added, removed, or changed to another type.
- Stealing changes control without changing original ownership.
- Overtime begins only after both players complete seven turns.
- All transitions return structured issues and remain outside React components.

**Tests:**
- Fixed setup, d20-last, one gain per turn, value limits, stealing, normal wins, and overtime wins.
- Desktop and phone browser workflows with accessibility and overflow checks.

**Constitution Check:** Versioned rules data drives a useful, deterministic local match tool.

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

**Status:** Retired from the UI on June 20, 2026.

**Outcome:** The sandbox duplicated straightforward combat arithmetic without
modeling card effects, reaction timing, or sequencing. The pure attack-line
domain model and tests remain available for future card-aware analysis.

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
- Add accessible tabs or equivalent navigation for Deck, Analysis, Gigs, and Transfer.
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

**Status:** Done.

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
- On opt-in, request current signed image URLs from the snapshot's Netdeck API source and keep them in memory only.
- Validate image URLs against the expected HTTPS artwork host; never bundle or proxy card art.
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

## M10 - Gig Probability And Deck Synergy

### GS-100: Add Exact Deck-Driven Gig Odds

**Status:** Done.

**Goal:** Connect natural Gig-roll probabilities with the actual Gig-value payoffs in the active deck.

**Deliverables:**
- Curate versioned card requirements for high, minimum, parity, distinct, cost-match, and same-value-pair goals.
- Enumerate exact outcomes for every legal die subset and all 120 pre-d20 orders.
- Weight order recommendations by copies of enabling cards in the active deck.
- Compare legal next Fixer dice against the shared current match state.
- Keep Rival-relative Street Cred effects visible but unsupported without rival state.

**Acceptance Criteria:**
- Green cards are modeled as same-value-pair demand, not parity or distinct-value demand.
- The d20 remains sixth in every recommended sequence.
- Reports expose assumptions, card sources, exact probabilities, and unsupported effects.
- No card-text manipulation effect is silently included in natural-roll odds.

**Tests:**
- Exact single-die outcomes, Red high-value ordering, Green pair ordering, current-board next-die odds, registry integrity, and unsupported comparisons.
- Desktop and phone browser coverage for deck demand, six-turn odds, and live match updates.

**Constitution Check:** Exact, explainable analysis remains in rules-core and uses versioned card metadata.

## M11 - Legality-Aware Deck Building And Versions

### GS-110: Add Legality-Aware Deck-Edit Guardrails

**Priority:** P0.

**Status:** Done.

**Goal:** Prevent accidental rule violations that have no useful deck-building purpose while preserving temporary illegal states needed for exploration, imports, and Legend changes.

**Design Decision:** Enforce the ruleset's per-card copy maximum during direct UI additions. Do not hard-block RAM-incompatible cards, Legend changes, incomplete decks, or temporary deck-size violations. RAM alignment is contextual and a user must be able to change Legends without the editor trapping the deck in an uneditable state.

**Deliverables:**
- Add a pure rules-core deck-edit evaluation that returns allowed, blocked, and warning outcomes with reasons.
- Disable add/increment controls at the ruleset's copy maximum and explain why in accessible text.
- Show RAM compatibility on card-browser rows and provide a compatible-card filter.
- Warn before or immediately after adding a RAM-incompatible card without preventing the edit.
- Keep imported or previously saved illegal decks loadable, editable, exportable, and fully explained by validation.
- Keep Legend and main-deck size changes flexible so users can construct and repair decks incrementally.

**Acceptance Criteria:**
- A direct UI action cannot raise a non-Legend card above its current ruleset copy limit.
- Changing the selected Legends never silently deletes cards or prevents the user from repairing the deck.
- RAM incompatibility is visible before adding a card and remains visible in the deck editor afterward.
- Unknown, stale, and imported illegal deck data produces reports rather than destructive normalization.
- Guardrails derive limits from the active ruleset and format instead of duplicating constants in React.

**Tests:**
- Rules-core tests for copy-cap, RAM warning, unknown card, format restriction, and Legend-transition outcomes.
- UI tests for disabled copy controls, compatible filtering, adding with a RAM warning, and repairing an imported illegal deck.

**Constitution Check:** Rules remain pure and versioned; reports explain every blocked or warned edit; local deck ownership is preserved.

**Implementation Notes:**
- Direct UI additions now use a structured rules-core evaluation.
- Copy-cap, unknown-card, wrong-section, and banned-card outcomes block additions.
- RAM incompatibility and restricted-card outcomes warn without blocking.
- Card browsing exposes RAM-fit labels and Compatible/Incompatible filtering.
- Existing imported illegal decks remain editable, decrementable, exportable, and validated without normalization.
- Verified on June 28, 2026 with focused rules/filter unit tests, production build, and desktop/phone deck workflow browser tests.

### GS-111: Add Named Deck-Version Snapshots And Comparison

**Priority:** P1.

**Status:** Done.

**Goal:** Preserve meaningful deck revisions and connect later playtest results to the exact list that was played.

**Deliverables:**
- Save immutable, user-named snapshots of a deck with timestamps and rules/card-data baselines.
- Compare added, removed, and count-changed cards between two versions.
- Compare legality, RAM, Eddy curve, Gig goals, and composition summaries where available.
- Restore an older version as a new current edit without deleting later history.
- Export and import version history explicitly without inflating ordinary deck-share URLs.

**Acceptance Criteria:**
- Snapshot identity remains stable when the working deck changes.
- Restoring a version is reversible and never overwrites another saved deck silently.
- Comparisons use stable card IDs and explain missing cards from older snapshots.

**Tests:**
- Snapshot immutability, comparison, restoration, migration, and round-trip tests.
- Browser workflow for naming, modifying, comparing, and restoring a version.

**Implementation Notes:**
- Decks now carry optional immutable named version snapshots with timestamps, deck metadata, card-data version, ruleset version, and format ID.
- The deck editor can save a named version, compare the selected version to the current edit, and restore that version as the current edit while preserving history.
- Version comparison reports card-count deltas by stable card ID/name, missing card IDs, baseline changes, legality, RAM totals, and Eddy curve summaries.
- Gig odds are not shown in deck-version comparison because they depend on current board-state dice; the existing Gigs workspace remains the board-aware analysis surface.
- Portable backups include version history automatically; ordinary share links omit it, and JSON deck import/export includes it only when explicitly selected.

**Constitution Check:** Version history is local-first, explicit, and tied to versioned rules and card data.

## M12 - Local Playtest Journal

### GS-120: Record Playtests And Per-Version Results

**Priority:** P1 after `GS-111`.

**Status:** Done.

**Goal:** Connect Gigsmith's deck analysis to observed games without presenting small samples as authoritative strategy.

**Deliverables:**
- Record deck version, opponent colors or archetype, result, first player, turns, final Street Cred, event, date, and notes.
- Provide fast event-day entry with optional fields and editable records.
- Summarize record, first-player split, opponent-color split, game length, and recurring user tags per deck version.
- Display sample sizes and avoid confidence claims unsupported by the data.
- Export and import journal data separately or with an explicit full backup.

**Acceptance Criteria:**
- Editing a deck does not rewrite the version attached to an existing playtest.
- Notes and opponent information stay local unless explicitly exported.
- Summaries always show their sample count and distinguish missing data from zero.

**Tests:**
- Journal CRUD, version linkage, aggregation, migration, and import/export tests.
- Phone browser workflow for recording a result in a few actions.

**Implementation Notes:**
- Added a `Journal` tab with fast local entry for result, deck version/current snapshot, opponent archetype/colors, first-player order, turns, final Street Cred, event, tags, and notes.
- Each playtest stores an immutable deck snapshot and optional saved deck-version identity so later deck edits do not rewrite observed records.
- Added per-deck and selected-version summaries with sample size, record, average turns, first-player split, opponent-color counts, and tags.
- Records can be edited or deleted locally.
- Full-device backups include the playtest journal.

**Constitution Check:** The journal remains local-first and reports observed data without black-box strategic conclusions.

## M13 - Collection-Aware Building

### GS-130: Track Owned Copies And Collection Constraints

**Priority:** P2.

**Status:** Planned.

**Goal:** Let users distinguish a legal theoretical deck from one they can assemble with their current collection.

**Deliverables:**
- Store owned counts by stable card ID with explicit unknown/not-tracked state.
- Add collection filters and owned/missing counts to deck and card-browser views.
- Report collection shortfalls separately from game-rule legality.
- Suggest replacements only from owned cards and only when explicit metadata supports the comparison.
- Include collection data only in explicit full backups, never ordinary shared deck links.

**Acceptance Criteria:**
- Collection constraints never change the legal/illegal result of the game rules.
- Duplicate display names remain separate collection records.
- Users can build theoretical decks without entering a collection.

**Tests:**
- Owned-count arithmetic, missing-card reports, duplicate-name identity, privacy, and backup round trips.

**Constitution Check:** Collection data is local and private; legality and ownership remain separate structured reports.

## M14 - Composition Analysis

### GS-140: Add Explainable Deck-Composition Analysis

**Priority:** P2 after `GS-130`.

**Status:** Planned.

**Goal:** Expand deck analysis beyond Eddy and Gig odds using explicit, reviewable card metadata.

**Deliverables:**
- Report card-type, color, faction, cost, power, keyword, and other supported distributions.
- Add curated versioned tags for economy, interaction, protection, draw, and other strategic roles only when card text supports them.
- Show counts and source cards behind every category.
- Compare composition changes between deck versions.
- Mark unknown or ambiguous card roles instead of inferring them silently from prose.

**Acceptance Criteria:**
- Every reported category can be traced to card IDs and versioned metadata.
- Analysis never labels a deck objectively good or bad from arbitrary thresholds.
- Missing metadata produces visible coverage warnings.

**Tests:**
- Distribution arithmetic, curated-tag registry integrity, unknown-card handling, and version comparison tests.

**Constitution Check:** Analysis is deterministic, explainable, and based on versioned data rather than hidden heuristics.

## M15 - Shareable Deck Reports

### GS-150: Add Read-Only, Printable Deck Reports

**Priority:** P2 after `GS-140`.

**Status:** Planned.

**Goal:** Make a deck easy to review, print, and transfer without exposing private library, collection, or journal data.

**Deliverables:**
- Add a read-only report with deck list, legality, RAM, Eddy curve, Gig goals, composition, and optional card details.
- Add print styles that remain useful without card art.
- Generate a QR code for the existing share payload with clear payload-size handling.
- Let recipients import the deck explicitly rather than mutating their library on link open.

**Acceptance Criteria:**
- Shared reports contain only the selected deck and documented public metadata.
- Print output is readable in monochrome and when external artwork is unavailable.
- Oversized QR payloads fail with a useful alternative rather than an unreadable code.

**Tests:**
- Share-payload privacy, print-layout smoke, QR round trip, and oversized-payload tests.

**Constitution Check:** Sharing stays portable, text-first, and independent of a backend or one hosting provider.

## M16 - Release Operations

### GS-160: Deploy The Static PWA

**Priority:** P1 after `GS-110`.

**Status:** Done.

**Goal:** Make Gigsmith installable on a phone without keeping a development server running.

**Deliverables:**
- Add a reviewed production deployment for GitHub Pages, Cloudflare Pages, or another static HTTPS host.
- Use a stable build identity and correct root/subpath configuration for the selected host.
- Document custom-domain, rollback, backup-before-origin-change, and release procedures.
- Verify installation, update prompting, offline restart, and local-deck preservation on a physical phone.

**Acceptance Criteria:**
- Production requires no application server or runtime database.
- The installed app opens offline after its initial successful load.
- Deployments do not modify local deck data or silently change storage origin.

**Tests:**
- Hosted smoke test plus the existing root/subpath PWA and offline suites.

**Implementation Notes:**
- GitHub Pages deployment lives in `.github/workflows/deploy-pages.yml`.
- `docs/PWA_DEPLOYMENT.md` documents root/subpath builds, update prompting, cache identity, rollback/storage-origin cautions, and verification commands.
- CI verifies root and `/gigsmith/` subpath PWA builds; browser coverage verifies offline reload and local-deck preservation.

**Constitution Check:** Deployment preserves the static, local-first architecture.

### GS-161: Add Weekly Source-Change Reporting

**Priority:** P1 after `GS-160`.

**Status:** Planned; manual weekly freshness policy exists, but scheduled reporting is not implemented.

**Goal:** Detect new cards or rules revisions without silently changing Gigsmith's reviewed local snapshots.

**Deliverables:**
- Run a scheduled weekly check of the Netdeck card source and official printable rules URL.
- Compare card count, stable IDs, relevant field changes, ETag/Last-Modified when available, and content hashes.
- Produce a readable workflow summary and open or update one tracking issue when changes are detected.
- Provide the same comparison through a local command.
- Never commit refreshed snapshots or rules automatically.

**Existing Coverage:**
- `docs/RULE_SOURCE.md` records the weekly manual check policy for the printable guide.
- `docs/CARD_SNAPSHOT_REFRESH.md` documents manual Netdeck snapshot refresh and validation.
- The app supports explicit user-triggered card database refresh, but that is not the scheduled source-change reporter described here.

**Acceptance Criteria:**
- An unchanged source produces no repository changes or duplicate issues.
- A changed source identifies what changed and records retrieval metadata.
- Updating local card/rules snapshots remains an explicit reviewed commit.

**Tests:**
- Fixture-based unchanged, added-card, modified-card, rules-hash, and network-failure tests.

**Constitution Check:** Source monitoring is automated; versioned game data changes remain human-reviewed.

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
- Add browser tests for deck creation/editing, validation, card details, import/export, baseline upgrade, and Gigs.
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

**Status:** Done.

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

**Status:** Done.

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

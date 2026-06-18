# Gigsmith Backlog

This backlog is organized by milestone. Each task must preserve the development constitution: useful runnable slices, pure rules core, versioned data, local-first behavior, deterministic reports, and tests for every implemented rule.

## Current Baseline

- Initial TypeScript monorepo exists.
- PWA shell renders a local deck editor, card browser, RAM summary, validation report, and text import/export.
- Card data snapshot is `netdeck-cyberpunk-2026-06-14` with 58 Netdeck cards.
- Rules baseline is `ruleset.v0-guide`.
- Implemented validation rules:
  - exactly 3 Legend cards
  - 40-50 main-deck cards
  - max 3 non-Legend copies
  - RAM/color limit checks from selected Legends
  - unknown card reporting

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
- Valid 58-card snapshot fixture.
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

## M2 - Deck Validation And RAM Legality

### GS-020: Group Validation Report By Category

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

**Goal:** Add deterministic economy analysis without hiding assumptions.

**Deliverables:**
- Add `EddyCurveReport` type.
- Include assumptions, card cost buckets, eddiable counts, and warnings for missing costs.
- Keep function pure: `analyzeEddyCurve(deck, cardDb, ruleset)`.

**Acceptance Criteria:**
- Report explains exactly which card fields drive the curve.
- No probabilistic claims yet.

**Tests:**
- Golden deck curve fixture.
- Missing cost fixture.

**Constitution Check:** Deterministic, explainable analysis first.

### GS-031: Add Eddy Curve UI

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

## Cross-Cutting Work

### GS-900: Add CI

**Goal:** Make every commit run the same verification commands.

**Deliverables:**
- Add GitHub Actions workflow for install, test, typecheck, and build.

**Acceptance Criteria:**
- CI runs `npm test`, `npm run typecheck`, and `npm run build`.

**Tests:**
- CI itself.

**Constitution Check:** Protects rule/test discipline.

### GS-901: Track Rule Uncertainty

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

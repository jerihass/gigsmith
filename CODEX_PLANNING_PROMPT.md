# Codex Planning Prompt

We are planning a new unofficial companion app for the upcoming Cyberpunk TCG.

## Goal

Design a practical, shippable app architecture and phased implementation plan for a Cyberpunk TCG deckbuilding / rules utility. Do not write the full app yet. I want a planning document, technical architecture, data model, and implementation roadmap.

## App Concept

An unofficial Cyberpunk TCG companion focused on:

- deck legality checking
- Legend/RAM planning
- deck curve and Eddy economy analysis
- Gig / Street Cred probability simulation
- simple board-state / turn-line analysis
- deck sharing/export/import
- future collection tracking

## Important Gameplay Assumptions

- A deck has exactly 3 unique Legends.
- The main deck has 40–50 non-Legend cards.
- Max 3 copies of any non-Legend card.
- Legends define RAM/color limits for deck construction.
- Players sell cards for Eddies.
- Gigs are represented by dice.
- Street Cred is based on controlled Gig dice.
- Blockers matter for attack sequencing; you cannot steal Gigs through an active Blocker unless the Blocker has been exhausted/tapped/removed/bypassed according to the rules.
- Rules are still emerging, so the design must support rule updates, errata, keywords, and card-data changes.

## Product Direction

Build web-first as a PWA for compatibility and deck sharing. Keep the rules engine platform-neutral so it can later be reused from iOS/macOS/native apps.

Initial recommendation:

- TypeScript first for speed of iteration.
- Later consider Rust core compiled to WASM once rules stabilize.
- Go may be useful for backend/import tooling, but the core should not require a server.

## Constraints

- Avoid using copyrighted card images as core app content unless later permission/API exists.
- Prefer text-based card records, official-card-page links, user-entered/imported data, and versioned JSON.
- App should work offline/local-first as much as possible.
- Do not assume an official API exists.
- Design the data model so card database, ruleset version, errata, and deck format can evolve independently.

## Please Produce

### 1. Product Definition

Include:

- app name options
- target users
- core jobs-to-be-done
- MVP scope
- explicit non-goals for v1

### 2. Technical Architecture

Include:

- suggested repo structure
- recommended stack
- explanation of why web/PWA first
- where TypeScript, Rust, and Go each fit
- how to isolate rules logic from UI
- how to support future iOS/macOS native frontends

### 3. Domain Model

Define TypeScript interfaces/types for:

- Card
- Legend
- Deck
- DeckCardEntry
- Ruleset
- Format
- Errata
- Keyword
- Gig
- BoardState
- PlayerState
- ValidationResult
- SimulationResult

### 4. Core Rule-Engine Functions

Propose signatures and responsibilities for:

- `validateDeck(deck, cardDb, ruleset)`
- `calculateRamLimits(legends)`
- `checkCardLegality(card, ramLimits, ruleset)`
- `analyzeEddyCurve(deck, cardDb, ruleset)`
- `analyzeStreetCred(deckOrBoardState, ruleset)`
- `simulateGigLines(boardState, ruleset)`
- `evaluateAttackLines(boardState, ruleset)`
- `importDecklist(text)`
- `exportDecklist(deck)`

### 5. MVP Implementation Plan

Break into milestones:

- M0 repository + data contracts
- M1 manual card database + deck builder
- M2 deck validation + RAM legality
- M3 Eddy curve analysis
- M4 Gig / Street Cred simulator
- M5 import/export/shareable decks
- M6 board-state tactical sandbox

For each milestone, include:

- deliverables
- tests
- likely risks
- acceptance criteria

### 6. Testing Strategy

Include:

- unit tests for rule functions
- snapshot tests for validation reports
- property/fuzz tests where useful
- golden test decks
- versioned ruleset regression tests
- examples of edge cases

### 7. UI/UX Plan

Describe screens/components for:

- card database
- deck editor
- Legend/RAM planner
- validation report
- Eddy curve view
- Gig simulator
- board-state sandbox
- import/export/share modal

### 8. Data Update Strategy

Include:

- versioned card JSON
- versioned rules JSON
- local cache
- manual import/admin tooling
- migration strategy
- how to handle errata and banned/restricted updates

### 9. Legal/IP Safety

Include:

- avoid bundling card art
- use unofficial disclaimer
- link to official card pages where appropriate
- keep user-generated/imported data separate from official copyrighted assets
- avoid implying endorsement

### 10. Output Format

Produce a structured planning document with headings, tables where useful, and concrete code examples for interfaces/function signatures.

Be opinionated. Flag bad ideas. Prefer a plan that can ship quickly over an overengineered architecture.

## Constitution Check

Before proposing implementation, evaluate the plan against `DEVELOPMENT_CONSTITUTION.md`.

If any part violates the constitution, revise the plan and explain the tradeoff.

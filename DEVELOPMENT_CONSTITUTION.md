# Development Constitution

This project must follow these principles.

## 1. Ship Useful Slices, Not Architecture Theater

Every milestone must produce something runnable and testable. Do not build speculative infrastructure unless it directly supports the next shippable feature.

Preference order:

1. working rule function with tests
2. simple UI exposing that function
3. data model refinement
4. abstractions only after duplication appears

Avoid:

- premature plugin systems
- premature backend services
- premature authentication
- premature social features
- premature Rust rewrite before the rules stabilize

## 2. Rules Engine Must Be Isolated From UI

No game logic may live inside React/Svelte/SwiftUI components.

Bad:

- deck legality calculated inside a button handler
- RAM checks spread across UI components
- board-state mutation hidden inside views

Good:

- pure functions
- explicit inputs and outputs
- deterministic testable behavior

Core pattern:

```text
deck + cardDb + ruleset -> validation report

boardState + ruleset -> legal actions / tactical lines
```

## 3. Rules Are Versioned Data, Not Hardcoded Assumptions

The Cyberpunk TCG rules are still emerging. Card data, errata, keywords, formats, and banned/restricted lists must be versioned.

The app must support:

- multiple ruleset versions
- card errata
- banned/restricted lists
- format-specific legality
- future keywords
- future card types
- future set releases

Hardcoding is allowed only in early prototypes, but every hardcoded rule must be marked with a TODO and covered by a test.

## 4. Local-First by Default

The app should work without a server for v1.

Required:

- local deck storage
- local card database
- local validation
- local simulations
- import/export without account login

Optional later:

- sync
- accounts
- public deck hosting
- cloud collection backup

Do not require a backend unless a feature truly cannot work locally.

## 5. Text/Data First, Art Optional

Do not make copyrighted card art a dependency of the app.

Allowed:

- text card records
- user-entered card data
- versioned JSON
- links to official card pages
- optional external image URLs if legally safe later

Avoid:

- bundling card images
- scraping and redistributing art
- implying official endorsement
- using Cyberpunk branding in a way that looks official

## 6. Deterministic Before Clever

The first version of every analytical feature should be deterministic and explainable.

For example:

- deck validation should give exact reasons
- RAM legality should show exact failing cards
- Eddy curve should show assumptions
- Gig simulation should show probability model
- attack-line suggestions should show why a line is legal

Avoid black-box "AI says this is best" features in v1.

## 7. Every Rule Gets a Test

Any implemented game rule must have at least one test.

Examples:

- exactly 3 unique Legends
- 40–50 main deck cards
- max 3 copies
- RAM legality
- invalid color/RAM inclusion
- Blocker prevents Gig stealing unless removed/exhausted/bypassed
- Street Cred calculation
- deck-out loss if modeled
- Overtime / 7 Gig win condition if modeled

When a rule is uncertain, write the test as pending/skipped with a note.

## 8. Reports Over Booleans

Core functions should not return only true/false. They should return structured reports.

Bad:

```ts
isDeckLegal(deck): boolean
```

Good:

```ts
validateDeck(deck): ValidationResult
```

`ValidationResult` should include:

- `legal: boolean`
- `errors`
- `warnings`
- `info`
- `rulesetVersion`
- `affectedCards`
- `suggestedFixes` when obvious

## 9. Import/Export Is a First-Class Feature

Deck sharing is central. All decks should serialize cleanly.

Required:

- stable deck JSON format
- human-readable text export
- import parser with useful errors
- shareable encoded URL format if practical
- future QR support

The internal format should not be tied to one website, one UI, or one source of card data.

## 10. Small, Boring Dependencies

Prefer boring dependencies and plain data structures.

Use libraries when they save real work. Avoid large frameworks for tiny problems.

Dependency rule:

- UI framework is fine
- testing framework is fine
- charting library is fine
- state management library only if needed
- heavy backend/auth/database stack is not allowed in v1 without justification

## 11. Model the Game Honestly

Do not oversimplify mechanics in a way that gives wrong advice.

Especially:

- Blocker sequencing must be modeled correctly
- attack eligibility must be explicit
- Gig stealing must respect board state
- Street Cred must be derived from actual controlled Gigs
- Legend/RAM legality must be explainable
- resource/Eddy assumptions must be visible

When rules are unknown or ambiguous, the app should say so rather than pretending.

## 12. Human-Readable Domain Language

Use names that match the game language.

Good:

- Legend
- Gig
- StreetCred
- Eddies
- RAM
- Blocker
- Deck
- Ruleset
- Format

Avoid generic names where game terms are clearer:

- ResourceThing
- ScoreObject
- PlayerItem
- CardMetaThing

## 13. No Hidden Mutation in the Rules Core

Rules-core functions should be pure where practical.

Preferred:

- immutable inputs
- returned next states
- explicit action objects
- deterministic random seeds for simulations

For simulations:

- allow seed injection
- record assumptions
- expose sample size
- separate exact calculation from Monte Carlo simulation

## 14. UX Must Explain Failure

The app should be useful to a new player who does not know why their deck is illegal.

Bad:

```text
Invalid deck
```

Good:

```text
Deck has 52 main-deck cards. Maximum is 50.
You selected 2 Legends. Exactly 3 are required.
This card requires Red RAM 4, but your Legends provide Red RAM 3.
You have 4 copies of X. Maximum is 3.
```

## 15. Fast Feedback Loop

Deck editing should validate instantly.

Target behavior:

- editing a deck updates legality immediately
- swapping Legends recalculates RAM immediately
- adding a card shows whether it is legal immediately
- simulations can be slower, but should show assumptions and progress if needed

## 16. No Account Required for v1

Users should not need login to:

- build a deck
- validate a deck
- export a deck
- import a deck
- run simulations
- use the RAM planner

Accounts may be considered later for sync or public decklists only.

## 17. Accessibility and Tournament Usability

The app should work under real TCG event conditions.

Requirements:

- mobile-friendly
- readable in bright rooms
- usable one-handed where possible
- fast search/filter
- no required network during gameplay
- no tiny tap targets for core actions
- dark mode preferred but not required
- clear unofficial disclaimer

## 18. Documentation Lives Next to Code

Each package should have a short README explaining:

- purpose
- public API
- test command
- data format
- known rule assumptions

Rules assumptions should be tracked in a dedicated file:

```text
docs/rules-assumptions.md
```

## 19. Bad Idea Filter

Before adding a feature, ask:

- Does this help someone build, validate, test, share, or play a deck?
- Can it work without official API access?
- Can it be tested?
- Does it create legal/IP risk?
- Does it require a server/account?
- Is it useful before the meta stabilizes?

If the answer is weak, defer it.

## 20. Default Architecture

Start with this shape unless there is a strong reason not to:

```text
apps/
  web/

packages/
  core/
  cards/
  rules/
  simulator/
  deck-io/

docs/
  rules-assumptions.md
  data-format.md
  roadmap.md
  legal.md

tools/
  importer/
```

The core package owns game logic.

The web app owns presentation.

The cards/rules packages own versioned data.

The simulator package owns probability and board-state analysis.

The deck-io package owns import/export/share formats.

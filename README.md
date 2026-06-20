# Gigsmith

Gigsmith is an unofficial, local-first Cyberpunk TCG companion app.

This repository starts with the constitution-compliant foundation:

- TypeScript web app in `apps/web`
- platform-neutral rules logic in `packages/rules-core`
- shared domain contracts in `packages/data-contracts`
- versioned card/rules snapshots in `packages/card-data`
- import/export helpers in `packages/deck-io`
- golden fixtures in `packages/test-fixtures`

The current rules baseline is `ruleset.v1-printable-2026-06-19`, derived from the official printable Cyberpunk TCG gameplay guide. The card metadata snapshot comes from Netdeck's Cyberpunk API and is stored locally for offline use and deterministic tests. External image URLs are references only; card art is not bundled.

## Project Docs

- `docs/BACKLOG.md` tracks milestone work.
- `docs/CARD_SNAPSHOT_REFRESH.md` documents the local card snapshot refresh process.
- `docs/DECK_JSON_FORMAT.md` defines the versioned portable deck format.
- `docs/RULE_UNCERTAINTY.md` tracks confirmed tactical rules and unresolved interactions.
- `docs/RULE_SOURCE.md` records the retained official guide and weekly freshness policy.
- `docs/APP_NAVIGATION.md` defines task views, persistence, and browser-history behavior.
- `docs/DECK_EDIT_HISTORY.md` defines undo/redo scope, limits, and lifecycle behavior.
- `docs/SAMPLE_HAND_ANALYSIS.md` defines deterministic opening-hand sampling and its limits.
- `docs/MULLIGAN_ANALYSIS.md` defines full-hand redraw comparison, scoring, and confidence limits.
- `docs/CARD_ART.md` defines the opt-in external artwork preference and privacy behavior.
- `docs/PWA_DEPLOYMENT.md` defines root/subpath deployment, installation, and update behavior.
- `docs/PERFORMANCE.md` records production baselines, CI budgets, and optimization triggers.
- `docs/STYLE_ARCHITECTURE.md` defines stylesheet ownership, visual tokens, and breakpoints.

## Commands

```sh
npm install
npm test
npm run typecheck
npm run build
npm run test:performance-budgets
npm run test:pwa-builds
npm run dev
npm run test:e2e
```

`npm run build` also verifies the production manifest, install icons, generated service worker, version identity, and hashed-asset precache list. Set `GIGSMITH_BASE_PATH=/gigsmith/` for a subpath build and provide `GIGSMITH_BUILD_ID` in release builds.

Browser tests use Playwright against the production preview. Run `npx playwright install chromium` once before the first local run. The suite covers desktop and phone-sized Chromium, accessibility checks, local-data recovery, and offline reload behavior.

The production output is in `apps/web/dist`. Service workers require HTTPS in normal deployments (localhost is the development exception). Once installed and loaded successfully, Gigsmith can reopen offline without a running server; deck data remains in local browser storage.

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

## Commands

```sh
npm install
npm test
npm run typecheck
npm run build
npm run dev
```

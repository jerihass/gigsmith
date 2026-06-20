# PWA Deployment And Updates

Gigsmith is a static PWA. Deploy the complete contents of `apps/web/dist` to one HTTPS origin; no backend is required. Localhost may use HTTP for development, but installation and service workers require HTTPS elsewhere.

## Root Deployment

```sh
GIGSMITH_BUILD_ID=<release-or-commit-id> npm run build
```

Publish `apps/web/dist` at `/`. The build verifier checks the manifest, icons, service-worker URLs, cache identity, and offline shell.

## Subpath Deployment

```sh
GIGSMITH_BASE_PATH=/gigsmith/ GIGSMITH_BUILD_ID=<release-or-commit-id> npm run build
```

Publish `apps/web/dist` at the exact configured path, including its trailing-slash semantics. The generated HTML, service-worker registration, offline fallback, manifest link, icons, and precache URLs all use this base path. The manifest keeps deployment-relative `start_url` and `scope` values.

`GIGSMITH_BASE_PATH` must be an absolute URL path without a host, query, fragment, backslash, or relative path segment. Use a stable `GIGSMITH_BUILD_ID`, normally a release identifier or commit SHA. When omitted, Gigsmith derives a deterministic identity from emitted asset filenames.

## Update Lifecycle

Every shell cache name includes:

- application version
- build identity
- card-data version
- ruleset version

Cache families also include a fingerprint of the deployment scope. Root and subpath installations on one origin therefore cannot delete each other's shell caches.

When a new worker finishes installing, Gigsmith shows **Gigsmith update ready**. Selecting **Update now** sends `SKIP_WAITING`; after the new worker controls the page, Gigsmith reloads once. Activation removes obsolete Gigsmith shell caches only within that deployment scope.

The worker never reads, writes, or deletes `localStorage` or IndexedDB. Decks and preferences remain browser-owned during install, update, rollback, and cache cleanup. Moving to another origin changes the browser storage boundary; export decks before changing origins.

External card artwork is cross-origin and is never added to the Gigsmith shell cache.

## Verification

```sh
npm run test:pwa-builds
npm run test:e2e
```

`test:pwa-builds` creates and removes temporary root and subpath artifacts, verifies two sequential subpath cache identities, and checks update cleanup behavior. Browser coverage installs the production worker at both `/` and `/gigsmith/`, reloads offline, and verifies that a locally edited deck survives.

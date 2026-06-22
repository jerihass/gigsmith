# Security Review - 2026-06-21

## Scope

Reviewed the local-first web application, PWA service worker, deck import/share formats, local persistence, external artwork loading, outbound links, and npm dependency tree. Gigsmith has no backend, authentication, payment flow, or server-side secret storage.

## Corrected Findings

### Critical: vulnerable development test server

- `npm audit` reported a critical Vitest UI arbitrary file read/execution advisory, plus nested Vite/esbuild development-server advisories.
- Upgraded Vitest from 2.1.9 to 4.1.9 and moved it to `devDependencies`.
- Post-upgrade audit result: zero known vulnerabilities.
- These packages are development-only and were not included in the production PWA, but could affect a developer running an exposed test UI/server.

### Medium: unbounded imported and shared deck data

- JSON imports, text decklists, and URL share payloads previously had no explicit resource limits.
- Added pre-decode size limits plus bounds for strings, notes, section entries, decklist lines, and card counts.
- Share hashes are rejected before `URLSearchParams`, base64 decoding, or JSON parsing when over the supported limit.
- React already escapes imported text; the concern was local denial of service and storage exhaustion, not HTML execution.

### Medium: unrestricted browser content policy

- Production builds previously had no Content Security Policy.
- Added a production-only CSP restricting scripts, styles, workers, manifests, objects, forms, network connections, and images.
- The early theme script is now a same-origin external file cached by the PWA, allowing `script-src 'self'` without `unsafe-inline` or `unsafe-eval`.
- External connections are limited to the Netdeck API; images are limited to the approved CloudFront artwork host.

## Existing Controls Confirmed

- No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, dynamic function construction, or HTML parsing is used.
- External artwork is opt-in, HTTPS-only, restricted to one hostname, loaded without credentials, and uses `no-referrer`.
- External links opened in a new tab use `rel="noreferrer"`.
- The service worker ignores non-GET and cross-origin requests and does not cache local-storage data.
- Deck JSON is parsed as data and validated structurally; unknown card IDs remain data for versioned legality reporting.
- No card art or signed artwork URLs are persisted in the bundled snapshot.

## Residual Risks

- Decks are stored unencrypted in browser local storage. They should not contain secrets or sensitive personal data.
- The meta-delivered CSP protects static hosts such as GitHub Pages, but an HTTP response header is stronger. A future DigitalOcean deployment should also set CSP, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, an appropriate `Permissions-Policy`, HSTS, and `frame-ancestors 'none'`.
- Enabling external artwork discloses normal network metadata such as IP address to Netdeck and its artwork CDN.
- Dependency advisories can change after this review. Run `npm audit` in CI and before releases.
- This is an engineering review, not a third-party penetration test.

## Verification

- `npm audit`: zero known vulnerabilities after remediation.
- Unit tests cover oversized JSON, text, and share imports.
- Production build verification requires CSP presence, rejects unsafe CSP script directives, and checks the external theme bootstrap.

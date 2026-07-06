# Performance Baselines And Budgets

Gigsmith uses measured regression budgets before optimization. The authoritative thresholds live in `apps/web/performance-budgets.json`; CI reports measured sizes and runs a dedicated throttled browser workflow.

## Baseline

Recorded June 20, 2026 from the production root build with 61 cards and exact Gig-odds analysis:

| Asset | Raw | Gzip | CI budget (raw / gzip) |
| --- | ---: | ---: | ---: |
| JavaScript | 297,580 B | 86,174 B | 450,000 B / 130,000 B |
| CSS | 27,182 B | 5,651 B | 60,000 B / 12,000 B |
| Service worker | 1,899 B | 820 B | 12,000 B / 5,000 B |
| Card snapshot | 71,372 B | 11,296 B | 400,000 B / 80,000 B |
| Production code total | 326,661 B | 92,645 B | 650,000 B raw |

The snapshot budget supports the working growth target of 250 cards at substantially more than the current bytes-per-card density.

A production run at a Pixel 7 viewport with 4x CPU throttling recorded:

| Workflow | Observed |
| --- | ---: |
| Initial render | 674 ms |
| Card filter response | 75 ms |
| Deck edit and derived-report response | 467 ms |
| Analysis control recalculation | 92 ms |

These timings include automation round trips. Deck edits recalculate validation, Eddy, mulligan, and exact Gig-odds reports.

The pure card-filter pipeline averaged approximately 0.1 ms over 50 name-sorted runs against 250 synthetic card identities. This measures computation, not DOM rendering.

On June 21, 2026, exact Gig-roll profiling moved from exhaustive outcome enumeration to equivalent combinatorial formulas and bounded dynamic programs. The focused Gig-odds suite dropped from approximately 687 ms to 31-40 ms locally, while preserving exact single- and multi-die regression results. Gig match state also moved below the top-level app so roll/value updates no longer reconcile the deck database and unrelated views.

The same pass removed repeated deck expansion and card indexing from each mulligan sample, batch-evaluated all card-add states from one RAM/index context, memoized unchanged Analysis/Gig subtrees, and enabled paint containment for offscreen card rows. The 250-card batch-add computation has a dedicated 100 ms pure-computation budget alongside card filtering.

On July 5, 2026, read-only deck reports added print/report CSS and optional QR generation. The QR package is dynamically imported from the Print tab and emitted as a lazy chunk; initial JavaScript remains under the existing 130,000 B gzip budget. Lazy JavaScript gzip budget moved from 200,000 B to 215,000 B and CSS gzip from 12,000 B to 13,000 B after inspecting the production bundle.

On July 6, 2026, proxy printing added an optional saved-version delta mode in the lazy Print tab chunk. Lazy JavaScript raw budget moved from 500,000 B to 510,000 B after inspecting the production bundle; initial JavaScript and lazy gzip budgets remained unchanged.

## Browser Method

The `performance-chromium` Playwright project uses a Pixel 7 viewport and Chromium's 4x CPU throttling. It performs one deterministic path on the production preview:

1. Load Gigsmith and wait for the application heading.
2. Filter to `Chrome Reverie`.
3. Add that card and wait for the deck count to update.
4. Open Analysis, change mulligan player order, and wait for capacity to update.
5. Open Gigs, roll a d4 from the live odds panel, and wait for the current-value odds to update.

The test logs a JSON result prefixed with `[performance]`. Current generous limits are:

- initial render: 5,000 ms
- filter response: 1,000 ms
- deck edit response: 1,000 ms
- analysis recalculation: 2,500 ms
- Gig roll and live-odds response: 1,000 ms
- pure 250-card filter computation: 100 ms
- pure 250-card addition evaluation: 100 ms

The browser scenario intentionally does not emulate network latency because Gigsmith's installed shell is local-first. Size budgets cover transfer regressions separately.

## Optimization Triggers

Do not raise a failing threshold or add an optimization dependency without recording a new trace and representative baseline.

- **List virtualization:** consider only when a real snapshot near 250 cards causes filter/render response to exceed 1,000 ms at 4x CPU, or scrolling produces sustained dropped frames. Preserve search accessibility and keyboard behavior in any virtualized list.
- **Memoization changes or worker computation:** consider when Eddy, mulligan, or Gig-odds recalculation exceeds 2,500 ms at 4x CPU and a trace identifies calculation rather than rendering as the bottleneck.
- **Code splitting:** consider when JavaScript exceeds 130,000 B gzip or initial render exceeds 5,000 ms. Split task views only if offline precaching and update behavior remain deterministic.
- **State-management dependency:** do not add one for bundle or timing concerns alone. Require a demonstrated correctness or ownership problem across multiple views plus a trace showing current state propagation is material.
- **Snapshot/data indexing:** consider precomputed indexes only when the 250-card pure filter computation approaches 100 ms or browser filtering exceeds its threshold while rendering remains inexpensive.

Budget changes require a short rationale in this document and updated observed measurements.

## Commands

```sh
npm run build
npm run test:performance-budgets
npx playwright test --project=performance-chromium
```

# Performance Baselines And Budgets

Gigsmith uses measured regression budgets before optimization. The authoritative thresholds live in `apps/web/performance-budgets.json`; CI reports measured sizes and runs a dedicated throttled browser workflow.

## Baseline

Recorded June 20, 2026 from the production root build with 60 cards:

| Asset | Raw | Gzip | CI budget (raw / gzip) |
| --- | ---: | ---: | ---: |
| JavaScript | 284,847 B | 82,463 B | 450,000 B / 130,000 B |
| CSS | 25,080 B | 5,352 B | 60,000 B / 12,000 B |
| Service worker | 1,899 B | 820 B | 12,000 B / 5,000 B |
| Card snapshot | 70,286 B | 11,161 B | 400,000 B / 80,000 B |
| Production code total | 311,826 B | 88,635 B | 650,000 B raw |

The snapshot budget supports the working growth target of 250 cards at substantially more than the current bytes-per-card density.

An unthrottled local development run at a 412x915 phone viewport recorded:

| Workflow | Observed |
| --- | ---: |
| Warm render/reload | 47 ms |
| Card filter response | 46 ms |
| Deck edit response | 283 ms |
| Mulligan recalculation | 292 ms |

These local timings include automation round trips and are diagnostic only. They are not compared directly with CI because CI uses production assets and CPU throttling.

The pure card-filter pipeline averaged approximately 0.1 ms over 50 name-sorted runs against 250 synthetic card identities. This measures computation, not DOM rendering.

## Browser Method

The `performance-chromium` Playwright project uses a Pixel 7 viewport and Chromium's 4x CPU throttling. It performs one deterministic path on the production preview:

1. Load Gigsmith and wait for the application heading.
2. Filter to `Chrome Reverie`.
3. Add that card and wait for the deck count to update.
4. Open Analysis, change mulligan player order, and wait for capacity to update.

The test logs a JSON result prefixed with `[performance]`. Current generous limits are:

- initial render: 5,000 ms
- filter response: 1,000 ms
- deck edit response: 1,000 ms
- analysis recalculation: 2,500 ms
- pure 250-card filter computation: 100 ms

The browser scenario intentionally does not emulate network latency because Gigsmith's installed shell is local-first. Size budgets cover transfer regressions separately.

## Optimization Triggers

Do not raise a failing threshold or add an optimization dependency without recording a new trace and representative baseline.

- **List virtualization:** consider only when a real snapshot near 250 cards causes filter/render response to exceed 1,000 ms at 4x CPU, or scrolling produces sustained dropped frames. Preserve search accessibility and keyboard behavior in any virtualized list.
- **Memoization changes or worker computation:** consider when Eddy or mulligan recalculation exceeds 2,500 ms at 4x CPU and a trace identifies calculation rather than rendering as the bottleneck.
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

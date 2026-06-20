# Style Architecture

Gigsmith's CSS entry point is `apps/web/src/styles.css`. It imports files in cascade order; changing that order is a behavioral change and requires desktop and phone verification.

## Ownership

1. `styles/base.css` - document defaults, form typography, and shared button variants.
2. `styles/shell.css` - app frame, recovery screens, header, task navigation, headings, status, and top-level grids.
3. `styles/sharing.css` - shared-deck preview and actions shared with transfer workflows.
4. `styles/workspace.css` - metrics, panels, workspace columns, panel headings, and common action groups.
5. `styles/deck-and-cards.css` - deck editor, form fields, filtering, card rows, optional art, and card details.
6. `styles/validation.css` - validation issue groups and RAM emphasis.
7. `styles/analysis.css` - Eddy curve, sample hands, and mulligan comparison.
8. `styles/game-tools.css` - Gig match tracker, Street Cred, and shared binary controls.
9. `styles/transfer-and-sources.css` - import/export, share links, source metadata, and footer links.
10. `styles/responsive.css` - all breakpoint overrides, loaded last to preserve override precedence.

Place a new base declaration in its owning feature file. Place its breakpoint override in `responsive.css` under the appropriate breakpoint. Cross-feature primitives belong in `base.css`, `shell.css`, or `workspace.css`; do not duplicate declarations across feature files.

The extraction deliberately retains a centralized responsive file. Moving breakpoint rules beside feature rules would reorder the cascade and requires a separate, intentional migration.

## Shared Visual Tokens

The current interface uses literal values; this task does not convert them to custom properties because that would mix refactoring with a visual change. Treat these values as the established tokens:

| Role | Value |
| --- | --- |
| Page/background | `#111111` |
| Panel surface | `#191715` |
| Primary border | `#34302a` |
| Strong border | `#4b453d` |
| Primary text | `#f3f0e8` |
| Muted text | `#aaa295`, `#bbb4a7` |
| Amber command/accent | `#f0b35a` |
| Cyan analysis accent | `#63d2df`, `#71d4e8` |
| Success | `#163b2b`, `#9ef2c4` |
| Danger | `#4b1b1b`, `#ffb1a6` |
| Standard control/item radius | `6px` |
| Panel/dialog radius | `8px` |
| Primary layout gap | `16px` |
| App maximum width | `1380px` |

Spacing is based primarily on `6`, `8`, `10`, `12`, `14`, `16`, `18`, `20`, `24`, and `28px`. New fixed-format controls should follow existing stable dimensions rather than introduce viewport-scaled type.

## Breakpoints

- Default: desktop and wide tablet layout.
- `max-width: 980px`: single-column workspaces and analysis, two-column summaries/tools where space permits, stacked card rows, and left-aligned header context.
- `max-width: 560px`: single-column summaries and controls, compact recovery padding, stacked analysis/tool headings, and narrow Gig match rows.

Do not add a breakpoint for one isolated label. First use wrapping, stable grid tracks, `minmax()`, or intrinsic sizing. Add a breakpoint only when an entire workflow changes layout.

## Verification

The initial extraction preserved the exact concatenated source SHA-256 and the exact production CSS SHA-256. Ongoing changes use:

```sh
npm run build
npx playwright test e2e/accessibility-and-offline.spec.ts
```

Browser coverage checks desktop and Pixel 7 widths for horizontal overflow and accessibility. Feature-specific workflows cover dialogs, tools, analysis, card media, and transfer states.

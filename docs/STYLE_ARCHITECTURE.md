# Style Architecture

Gigsmith's CSS entry point is `apps/web/src/styles.css`. It imports files in cascade order; changing that order is a behavioral change and requires desktop and phone verification.

## Ownership

1. `styles/base.css` - document defaults, form typography, and shared button variants.
2. `styles/shell.css` - app frame, recovery screens, header, task navigation, headings, status, and top-level grids.
3. `styles/sharing.css` - shared-deck preview and actions shared with transfer workflows.
4. `styles/workspace.css` - metrics, panels, workspace columns, panel headings, and common action groups.
5. `styles/deck-and-cards.css` - deck editor, form fields, filtering, card rows, optional art, and card details.
6. `styles/validation.css` - validation issue groups and RAM emphasis.
7. `styles/analysis.css` - Eddy curve, sample hands, mulligan comparison, and Gig odds.
8. `styles/game-tools.css` - Gig match tracker, Street Cred, and shared binary controls.
9. `styles/transfer-and-sources.css` - import/export, share links, source metadata, and footer links.
10. `styles/responsive.css` - all breakpoint and structural overrides.
11. `styles/theme-light.css` - light-theme card and detail color identities; loaded last and limited to color properties.
12. `styles/theme-neon.css` - Neon-theme glow treatments plus card and detail color identities; loaded after light overrides.

Place a new base declaration in its owning feature file. Place its breakpoint override in `responsive.css` under the appropriate breakpoint. Cross-feature primitives belong in `base.css`, `shell.css`, or `workspace.css`; do not duplicate declarations across feature files.

The extraction deliberately retains a centralized responsive file. Moving breakpoint rules beside feature rules would reorder the cascade and requires a separate, intentional migration. Theme files follow it only to override color identity variables and theme-specific effects; do not place dimensions or layout rules in theme files.

## Shared Visual Tokens

The Night City workbench themes are defined as custom properties in `styles/base.css`. Dark is the default; Light and Neon are activated by the corresponding `data-theme` value on the document root. Feature styles should use these properties for shared surfaces, borders, text, and interactive accents; card-color identities are overridden in the theme files.

| Role | Value |
| --- | --- |
| Page/background | `--page` |
| Panel surface | `--surface` |
| Raised/control surfaces | `--surface-raised`, `--surface-control` |
| Primary/strong border | `--border`, `--border-strong` |
| Primary/muted text | `--text`, `--muted`, `--muted-strong` |
| Command accent | `--accent` |
| Navigation/focus accent | `--cyan` |
| Success | `--success` |
| Danger | `--danger` |
| Standard control/item radius | `3px` |
| Panel/dialog radius | `4px` |
| Primary layout gap | `16px` |
| App maximum width | `1380px` |

Card database and deck editor rows use a `data-color` attribute with local color properties. Database rows use the stronger `--card-surface` tint, while editor rows use the quieter `--deck-surface` tint. Keep the database's text color label so color is supplementary rather than the only way to identify a card's color.

The selected theme is stored under `gigsmith.theme.v1`. The inline bootstrap in `index.html` applies it before the application bundle renders, while `themePreference.ts` owns validated loading, persistence, runtime changes, and browser theme-color updates.

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

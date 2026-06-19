# Card Snapshot Refresh

Gigsmith is local-first. The app should not require live Netdeck access at runtime, so card data is stored as a versioned text metadata snapshot.

## Source

- Preferred source: `https://api.netdeck.gg/api/cards/cyberpunk`
- Human reference page: `https://netdeck.gg/cards/cyberpunk`
- Current snapshot: `packages/card-data/src/cyberpunk-snapshot.json`
- Current version: `netdeck-cyberpunk-2026-06-18`

Do not bundle card art. The snapshot may preserve external image URLs as references, but images are not app assets and should not be redistributed by this repository.

## Manual Refresh Steps

1. Fetch the current Netdeck payload:

   ```sh
   curl -L https://api.netdeck.gg/api/cards/cyberpunk -o /tmp/netdeck-cyberpunk.json
   ```

2. Convert the payload into `packages/card-data/src/cyberpunk-snapshot.json`.

   Keep only text/card metadata used by the app:

   - `id`
   - `external_id`
   - `name`
   - `display_name`
   - `slug`
   - `rules_text`
   - `printing_id`
   - `set`
   - `rarity`
   - `color`
   - `card_type`
   - `is_eddiable`
   - `classifications`
   - `keywords`
   - `cost`
   - `power`
   - `ram`
   - `artist`
   - `print_number`
   - optional external image URL references

3. Update snapshot metadata:

   - `sourceUrl`
   - `sourceRetrievedAt`
   - `cardDataVersion`
   - `sourceCardCount`
   - `notes`

4. Run verification:

   ```sh
   npm test
   npm run typecheck
   npm run build
   ```

## Expected Failure Mode

`packages/card-data` validates the snapshot at import time. If Netdeck changes the payload shape, the app should fail with path-based validation errors such as:

```text
cards[0].card_type: Expected one of: Legend, Unit, Program, Gear.
```

Fix the snapshot or update the domain contracts deliberately. Do not work around schema failures in the UI.

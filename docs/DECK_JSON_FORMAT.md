# Gigsmith Deck JSON Format

Gigsmith deck JSON is a portable interchange document. It is separate from the local deck-library record so sharing a deck does not expose or overwrite device-local IDs and timestamps.

## Version 1

```json
{
  "schema": "gigsmith.deck",
  "version": 1,
  "exportedAt": "2026-06-19T12:00:00.000Z",
  "deck": {
    "name": "Example Deck",
    "legends": [
      { "cardId": "stable-card-id", "count": 1 }
    ],
    "main": [
      { "cardId": "stable-card-id", "count": 3 }
    ],
    "formatId": "open-guide",
    "rulesetVersion": "ruleset.v1-printable-2026-06-19",
    "cardDataVersion": "netdeck-cyberpunk-2026-06-20",
    "notes": "Optional user-authored notes."
  }
}
```

## Import Behavior

- `schema`, `version`, `exportedAt`, and every required deck field are validated before the active deck changes.
- Unknown document fields are ignored for forward-compatible additions.
- Unsupported document versions are rejected rather than silently migrated.
- Unknown card IDs are preserved so validation can explain decks created with a different card snapshot.
- Card counts must be positive integers.
- Local deck IDs plus `createdAt` and `updatedAt` timestamps are never imported or exported.

## Share Links

Share links encode the compact version 1 document as UTF-8 base64url data in the URL fragment:

```text
https://example.app/#deck=BASE64URL_PAYLOAD
```

URL fragments are decoded locally and are not sent to the hosting server. Gigsmith validates and previews the document before adding it to the local deck library.

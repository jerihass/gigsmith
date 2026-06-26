# Optional Card Art

Gigsmith is text-complete without card images. External artwork is disabled by default and the disabled state renders no image elements, so opening the app does not request card art.

## Preference

The **External art** checkbox in Card Database is an explicit, device-local opt-in. Its state is stored under `gigsmith.card-art.v1`. Turning it off immediately removes external image elements from the interface.

## Sources And Requests

- Enabling artwork makes one request to the snapshot's Netdeck API source to obtain current signed image URLs.
- Signed URLs are cached in local storage under `gigsmith.card-art.urls.v1` for up to 12 hours so returning sessions can populate art without repeating the URL lookup.
- Cached signed URLs are scoped to the source URL and are validated before use; invalid, expired, wrong-source, untrusted-host, and unsigned entries are ignored.
- Signed URLs are never written to the card snapshot or portable backup.
- Image URLs must use HTTPS and Netdeck's expected CloudFront artwork host. Other hosts and unsigned paths are rejected.
- Requests use `no-referrer` and images load lazily.
- Gigsmith does not proxy, bundle, or intentionally persist artwork image bytes; browser HTTP caching may still apply according to the remote image response.
- The service worker ignores cross-origin requests, so artwork is not added to Gigsmith's offline shell cache.

The interface reserves each image's dimensions before loading and shows source-loading, image-loading, or unavailable states without shifting surrounding controls. Failed or offline artwork never removes card names, metadata, rules text, or deck actions.

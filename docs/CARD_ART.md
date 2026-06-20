# Optional Card Art

Gigsmith is text-complete without card images. External artwork is disabled by default and the disabled state renders no image elements, so opening the app does not request card art.

## Preference

The **External art** checkbox in Card Database is an explicit, device-local opt-in. Its state is stored under `gigsmith.card-art.v1`. Turning it off immediately removes external image elements from the interface.

## Sources And Requests

- Enabling artwork makes one request to the snapshot's Netdeck API source to obtain current signed image URLs.
- Signed URLs remain in memory only and are refreshed after a reload; they are never written to local storage or the card snapshot.
- Image URLs must use HTTPS and Netdeck's expected CloudFront artwork host. Other hosts and unsigned paths are rejected.
- Requests use `no-referrer` and images load lazily.
- Gigsmith does not download, proxy, bundle, or persist artwork.
- The service worker ignores cross-origin requests, so artwork is not added to Gigsmith's offline shell cache.

The interface reserves each image's dimensions before loading and shows source-loading, image-loading, or unavailable states without shifting surrounding controls. Failed or offline artwork never removes card names, metadata, rules text, or deck actions.

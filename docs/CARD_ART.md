# Optional Card Art

Gigsmith is text-complete without card images. External artwork is disabled by default and the disabled state renders no image elements, so opening the app does not request card art.

## Preference

The **External art** checkbox in Card Database is an explicit, device-local opt-in. Its state is stored under `gigsmith.card-art.v1`. Turning it off immediately removes external image elements from the interface.

## Sources And Requests

- Images use only stable HTTPS `source_image_url` values from the versioned card snapshot.
- URLs containing query parameters, fragments, or non-HTTPS schemes are rejected.
- Requests use `no-referrer` and images load lazily.
- Gigsmith does not download, proxy, bundle, or persist artwork.
- The service worker ignores cross-origin requests, so artwork is not added to Gigsmith's offline shell cache.

The interface reserves each image's dimensions before loading and shows loading, unavailable, or no-art states without shifting surrounding controls. Failed or offline artwork never removes card names, metadata, rules text, or deck actions.

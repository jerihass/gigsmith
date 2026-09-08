# Optional Card Art

Gigsmith is text-complete without card images. External artwork is disabled by default and the disabled state renders no image elements, so opening the app does not request card art.

## Web preference

The **External art** checkbox in Card Database is an explicit, device-local opt-in. Its state is stored under `gigsmith.card-art.v1`. Turning it off immediately removes external image elements from the interface.

## Sources And Requests

- Enabling artwork requests current signed image URLs from the snapshot's Netdeck API source. A warm cache requests only sets containing cards that are missing from the cached URL directory, so newly added sets do not force a full artwork lookup.
- Signed URLs are cached in local storage under `gigsmith.card-art.urls.v1` for up to 12 hours so returning sessions can populate art without repeating the URL lookup.
- The signed-URL directory is retained across card-data revisions; entries are refreshed when their signatures expire or when a newly loaded set has missing art.
- Cached signed URLs are scoped to the source URL and are validated before use; invalid, expired, wrong-source, untrusted-host, and unsigned entries are ignored.
- Signed URLs are never written to the card snapshot or portable backup.
- Image URLs must use HTTPS and Netdeck's expected CloudFront artwork host. Other hosts and unsigned paths are rejected.
- Requests use `no-referrer` and images load lazily.
- Gigsmith does not proxy, bundle, or intentionally persist artwork image bytes; browser HTTP caching may still apply according to the remote image response.
- The service worker ignores cross-origin requests, so artwork is not added to Gigsmith's offline shell cache.

The interface reserves each image's dimensions before loading and shows source-loading, image-loading, or unavailable states without shifting surrounding controls. Failed or offline artwork never removes card names, metadata, rules text, or deck actions.

## Native iOS artwork and cache

Settings → Card artwork provides a separate device-local opt-in, off by default.
Cards retain all text and controls when art is disabled, loading, offline, or unavailable.
The native app displays small thumbnails and a larger image in card details, downsampled
to their display sizes. Thumbnails are decorative; the detail image has a VoiceOver label
and loading status. Disabling artwork hides it immediately and cancels active requests.

At the user's request, iOS explicitly persists downloaded image bytes for offline reuse.
This extends the web policy above. The cache lives in the purgeable Caches directory,
keyed by a SHA-256 hash of printing identity rather than filenames supplied by the server.
It is bounded to 100 MiB, evicts least recently used images, and refreshes images unused
for 30 days. iOS may purge this directory itself. Turning artwork off retains the cache;
Clear cached artwork cancels pending requests, removes cached bytes, and turns artwork
off so the cache does not immediately refill. Cache failures never affect deck/match data.

The native client resolves signed URLs from the Netdeck card API, paging by set.
Concurrent image requests and directory requests are coalesced. Only HTTPS on the
expected CloudFront host is accepted, with unexpired Expires, Signature and Key-Pair-Id
parameters. Signed URLs are kept only in memory. Requests use an ephemeral URLSession
without cookies or an HTTP cache, and redirects are rejected. Responses are bounded to
8 MiB; ImageIO checks format, dimensions, and decodability before caching.

Swift tests exercise opt-out, coalescing, disk reuse without networking, size bounds,
invalid images, URL validation, and clearing during an in-flight download. An opt-in
live test verifies the actual source and subsequent offline read:

```sh
GIGSMITH_LIVE_ART_TEST=1 swift test --package-path apps/ios --filter liveArtworkDownloadAndOfflineReuse
```

The optional `testLiveArtworkRendering` UI test runs only with the explicit
`GigsmithArtworkReview` Xcode scheme; it enables art, opens a card, waits for its rendered image,
captures a screenshot and disables art again. Ordinary CI does not contact the artwork
service. No card images are committed, bundled, or placed in deck exports.

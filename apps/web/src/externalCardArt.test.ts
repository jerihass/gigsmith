import { describe, expect, it, vi } from "vitest";
import { fetchExternalCardArtUrls, selectExternalCardArtUrl } from "./externalCardArt";

const sourceUrl = "https://api.netdeck.gg/api/cards/cyberpunk";
const signedUrl = "https://dstcynss47vun.cloudfront.net/card.webp?Expires=123&Signature=test";

describe("external card art", () => {
  it("loads signed URLs from the opt-in source without persisting them", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({
      items: [{ id: "card-1", external_id: "CP-001", image_url: signedUrl }]
    }), { status: 200, headers: { "content-type": "application/json" } }));

    const urls = await fetchExternalCardArtUrls(sourceUrl, undefined, fetchMock as unknown as typeof fetch);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(`${sourceUrl}?limit=100`);
    expect(selectExternalCardArtUrl({ id: "card-1", external_id: "CP-001" }, urls)).toBe(signedUrl);
  });

  it("rejects untrusted, unsigned, and malformed artwork URLs", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ items: [
      { id: "unsigned", image_url: "https://dstcynss47vun.cloudfront.net/card.webp" },
      { id: "untrusted", image_url: "https://images.example/card.webp?Signature=test" },
      { id: "malformed", image_url: "not-a-url" }
    ] }), { status: 200 })) as typeof fetch;

    await expect(fetchExternalCardArtUrls(sourceUrl, undefined, fetcher)).rejects.toThrow("no usable URLs");
  });

  it("reports source and payload failures", async () => {
    const unavailable = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    const malformed = vi.fn(async () => new Response(JSON.stringify({ cards: [] }), { status: 200 })) as typeof fetch;

    await expect(fetchExternalCardArtUrls(sourceUrl, undefined, unavailable)).rejects.toThrow("503");
    await expect(fetchExternalCardArtUrls(sourceUrl, undefined, malformed)).rejects.toThrow("invalid payload");
  });
});

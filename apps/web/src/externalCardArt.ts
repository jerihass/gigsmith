import type { Card } from "@gigsmith/data-contracts";

const allowedArtworkHost = "dstcynss47vun.cloudfront.net";

interface ExternalCardRecord {
  id?: unknown;
  external_id?: unknown;
  image_url?: unknown;
}

function signedArtworkUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === allowedArtworkHost && url.search
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchExternalCardArtUrls(
  sourceUrl: string,
  signal?: AbortSignal,
  fetcher: typeof fetch = fetch
): Promise<ReadonlyMap<string, string>> {
  const endpoint = new URL(sourceUrl);
  endpoint.searchParams.set("limit", "100");
  const response = await fetcher(endpoint, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
    signal
  });
  if (!response.ok) throw new Error(`Card artwork source returned ${response.status}.`);

  const payload = await response.json() as { items?: unknown };
  if (!Array.isArray(payload.items)) throw new Error("Card artwork source returned an invalid payload.");

  const urls = new Map<string, string>();
  for (const item of payload.items as ExternalCardRecord[]) {
    const artworkUrl = signedArtworkUrl(item.image_url);
    if (!artworkUrl) continue;
    if (typeof item.id === "string") urls.set(item.id, artworkUrl);
    if (typeof item.external_id === "string") urls.set(item.external_id, artworkUrl);
  }
  if (urls.size === 0) throw new Error("Card artwork source returned no usable URLs.");
  return urls;
}

export function selectExternalCardArtUrl(
  card: Pick<Card, "id" | "external_id">,
  urls: ReadonlyMap<string, string>
): string | undefined {
  return urls.get(card.id) ?? urls.get(card.external_id);
}

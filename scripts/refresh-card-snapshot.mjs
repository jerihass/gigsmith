import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { extractNetdeckCards, fetchCardSource } from "./check-source-changes.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const snapshotPath = resolve(repoRoot, "packages/card-data/src/cyberpunk-snapshot.json");

function stableImageUrl(value) {
  if (typeof value !== "string" || value.length === 0) return undefined;
  const url = new URL(value);
  url.search = "";
  url.hash = "";
  return url.toString();
}

export function sanitizeNetdeckCard(card) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    throw new Error("Netdeck returned a non-object card record.");
  }
  const { image_url: transientImageUrl, ...stableCard } = card;
  const sourceImageUrl = stableImageUrl(stableCard.source_image_url ?? transientImageUrl);
  if (sourceImageUrl) stableCard.source_image_url = sourceImageUrl;
  else delete stableCard.source_image_url;
  return stableCard;
}

export function createCardSnapshot(payload, {
  sourceUrl,
  retrievedAt = new Date().toISOString(),
  etag
}) {
  const cards = extractNetdeckCards(payload).map(sanitizeNetdeckCard);
  const reportedTotal = Number.isInteger(payload?.total) ? payload.total : cards.length;
  if (cards.length !== reportedTotal) {
    throw new Error(`Refusing to write an incomplete snapshot: received ${cards.length} of ${reportedTotal} cards.`);
  }

  const ids = new Set(cards.map((card) => card.id));
  if (ids.size !== cards.length || ids.has(undefined)) {
    throw new Error("Refusing to write a snapshot with missing or duplicate card IDs.");
  }

  const versionDate = retrievedAt.slice(0, 10);
  return {
    metadata: {
      game: "cyberpunk",
      sourceName: "Netdeck",
      sourceUrl,
      sourceRetrievedAt: retrievedAt,
      cardDataVersion: `netdeck-cyberpunk-${versionDate}`,
      sourceCardCount: cards.length,
      notes: [
        `${cards.length}-card text metadata snapshot for offline use.`,
        "External image URLs are stored as stable references only; images are not bundled.",
        etag ? `Source ETag: ${etag}` : "Source ETag unavailable."
      ].join(" ")
    },
    cards
  };
}

export async function refreshCardSnapshot({ now = new Date().toISOString() } = {}) {
  const current = JSON.parse(await readFile(snapshotPath, "utf8"));
  const sourceUrl = current.metadata.sourceUrl;
  const remote = await fetchCardSource(sourceUrl);
  const snapshot = createCardSnapshot(remote.payload, {
    sourceUrl,
    retrievedAt: now,
    etag: remote.etag
  });
  await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  return snapshot;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  refreshCardSnapshot()
    .then((snapshot) => {
      console.log(`Wrote ${snapshot.metadata.cardDataVersion} with ${snapshot.cards.length} cards.`);
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

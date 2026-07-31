import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const snapshotPath = resolve(repoRoot, "packages/card-data/src/cyberpunk-snapshot.json");
const rulesetPath = resolve(repoRoot, "packages/card-data/src/ruleset.ts");

const trackedCardFields = [
  "external_id",
  "display_name",
  "slug",
  "color",
  "card_type",
  "ram",
  "cost",
  "power",
  "rules_text",
  "is_eddiable",
  "legality"
];

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeCard(card) {
  const normalized = {};
  for (const field of trackedCardFields) {
    normalized[field] = card[field] ?? null;
  }
  normalized.external_id = normalized.external_id ?? card.id ?? null;
  return normalized;
}

function cardIdentity(card) {
  return String(card.external_id ?? card.id ?? card.slug ?? card.display_name ?? "");
}

export function extractNetdeckCards(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.cards)) return payload.cards;
  throw new Error("Netdeck response did not contain a recognized card array.");
}

export function compareCardSources(localSnapshot, remotePayload, retrievedAt = new Date().toISOString()) {
  const remoteCards = extractNetdeckCards(remotePayload);
  const localById = new Map(localSnapshot.cards.map((card) => [cardIdentity(card), normalizeCard(card)]));
  const remoteById = new Map(remoteCards.map((card) => [cardIdentity(card), normalizeCard(card)]));
  const added = [];
  const removed = [];
  const modified = [];

  for (const [id, remote] of remoteById) {
    const local = localById.get(id);
    if (!local) {
      added.push({ id, displayName: remote.display_name ?? id });
      continue;
    }

    const changedFields = trackedCardFields.filter((field) => local[field] !== remote[field]);
    if (changedFields.length > 0) {
      modified.push({
        id,
        displayName: remote.display_name ?? local.display_name ?? id,
        fields: changedFields
      });
    }
  }

  for (const [id, local] of localById) {
    if (!remoteById.has(id)) removed.push({ id, displayName: local.display_name ?? id });
  }

  const remoteTotal = typeof remotePayload?.total === "number" ? remotePayload.total : remoteCards.length;
  return {
    source: "cards",
    localCount: localSnapshot.cards.length,
    remoteCount: remoteCards.length,
    remoteTotal,
    retrievedAt,
    changed: added.length > 0 || removed.length > 0 || modified.length > 0 || remoteTotal !== localSnapshot.metadata.sourceCardCount,
    added: added.sort((left, right) => left.displayName.localeCompare(right.displayName)),
    removed: removed.sort((left, right) => left.displayName.localeCompare(right.displayName)),
    modified: modified.sort((left, right) => left.displayName.localeCompare(right.displayName))
  };
}

export function compareRulesSource({ localHash, remoteHash, retrievedAt = new Date().toISOString(), etag, lastModified }) {
  return {
    source: "rules",
    localHash,
    remoteHash,
    etag: etag ?? null,
    lastModified: lastModified ?? null,
    retrievedAt,
    changed: localHash !== remoteHash
  };
}

export function renderSourceChangeMarkdown(report) {
  const lines = [
    "# Gigsmith Source Check",
    "",
    `Checked: ${report.checkedAt}`,
    "",
    "## Card Source",
    "",
    `- Local snapshot count: ${report.cards.localCount}`,
    `- Remote card count: ${report.cards.remoteCount}`,
    `- Remote reported total: ${report.cards.remoteTotal}`,
    `- Added cards: ${report.cards.added.length}`,
    `- Removed cards: ${report.cards.removed.length}`,
    `- Modified cards: ${report.cards.modified.length}`,
    ""
  ];

  if (report.cards.added.length > 0) {
    lines.push("### Added Cards", "", ...report.cards.added.map((card) => `- ${card.displayName} (${card.id})`), "");
  }
  if (report.cards.removed.length > 0) {
    lines.push("### Removed Cards", "", ...report.cards.removed.map((card) => `- ${card.displayName} (${card.id})`), "");
  }
  if (report.cards.modified.length > 0) {
    lines.push(
      "### Modified Cards",
      "",
      ...report.cards.modified.map((card) => `- ${card.displayName} (${card.id}): ${card.fields.join(", ")}`),
      ""
    );
  }

  lines.push(
    "## Rules Source",
    "",
    `- Local stored hash: ${report.rules.localHash}`,
    `- Remote hash: ${report.rules.remoteHash}`,
    `- ETag: ${report.rules.etag ?? "none"}`,
    `- Last-Modified: ${report.rules.lastModified ?? "none"}`,
    "",
    report.changed
      ? "Changes were detected. Refreshing snapshots or rules remains a manual reviewed commit."
      : "No source changes were detected.",
    ""
  );
  return `${lines.join("\n")}\n`;
}

function readRulesSourceUrl(source) {
  const match = source.match(/sourceUrl:\s*"([^"]+)"/);
  if (!match) throw new Error("Could not find rules sourceUrl in ruleset.ts.");
  return match[1];
}

export async function fetchCardSource(url, fetcher = fetch) {
  const endpoint = new URL(url);
  endpoint.searchParams.set("limit", "100");
  endpoint.searchParams.set("offset", "0");

  const fetchPage = async () => {
    const response = await fetcher(endpoint);
    if (!response.ok) throw new Error(`GET ${endpoint} failed with ${response.status}`);
    return {
      payload: await response.json(),
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified")
    };
  };

  const firstPage = await fetchPage();
  if (!Array.isArray(firstPage.payload?.items) || !Number.isInteger(firstPage.payload?.total)) return firstPage;
  if (firstPage.payload.total > 5000) throw new Error(`Card source reported an unexpected ${firstPage.payload.total} cards.`);

  const items = [...firstPage.payload.items];
  while (items.length < firstPage.payload.total) {
    const previousCount = items.length;
    endpoint.searchParams.set("offset", String(previousCount));
    const nextPage = await fetchPage();
    if (!Array.isArray(nextPage.payload?.items)) throw new Error(`Card source returned an invalid page at offset ${previousCount}.`);
    items.push(...nextPage.payload.items);
    if (items.length === previousCount) throw new Error(`Card source stopped after ${items.length} of ${firstPage.payload.total} cards.`);
  }

  return {
    ...firstPage,
    payload: { ...firstPage.payload, items }
  };
}

async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`GET ${url} failed with ${response.status}`);
  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified")
  };
}

export async function runSourceCheck({
  now = new Date().toISOString(),
  cardSourceUrl,
  rulesSourceUrl,
  outputJson,
  outputMarkdown,
  failOnChange = false
} = {}) {
  const localSnapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const rulesSource = await readFile(rulesetPath, "utf8");
  const cardUrl = cardSourceUrl ?? localSnapshot.metadata.sourceUrl;
  const rulesUrl = rulesSourceUrl ?? readRulesSourceUrl(rulesSource);
  const localRulesHash = sha256(await readFile(resolve(repoRoot, "docs/sources/printable-gameplay-guide-2026-06-20.pdf")));

  const remoteCards = await fetchCardSource(cardUrl);
  const remoteRules = await fetchBytes(rulesUrl);
  const cards = compareCardSources(localSnapshot, remoteCards.payload, now);
  const rules = compareRulesSource({
    localHash: localRulesHash,
    remoteHash: sha256(remoteRules.bytes),
    retrievedAt: now,
    etag: remoteRules.etag,
    lastModified: remoteRules.lastModified
  });
  const report = {
    checkedAt: now,
    cardSourceUrl: cardUrl,
    rulesSourceUrl: rulesUrl,
    changed: cards.changed || rules.changed,
    cards,
    rules
  };

  if (outputJson) await writeFile(outputJson, `${JSON.stringify(report, null, 2)}\n`);
  if (outputMarkdown) await writeFile(outputMarkdown, renderSourceChangeMarkdown(report));
  if (failOnChange && report.changed) {
    const error = new Error("Source changes detected.");
    error.report = report;
    throw error;
  }
  return report;
}

function parseArgs(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") options.outputJson = args[++index];
    else if (arg === "--markdown") options.outputMarkdown = args[++index];
    else if (arg === "--card-url") options.cardSourceUrl = args[++index];
    else if (arg === "--rules-url") options.rulesSourceUrl = args[++index];
    else if (arg === "--fail-on-change") options.failOnChange = true;
    else if (arg === "--help") {
      console.log("Usage: node scripts/check-source-changes.mjs [--json path] [--markdown path]");
      process.exit(0);
    }
  }
  return options;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSourceCheck(parseArgs(process.argv.slice(2)))
    .then((report) => {
      console.log(renderSourceChangeMarkdown(report));
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

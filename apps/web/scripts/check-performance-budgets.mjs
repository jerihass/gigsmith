import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(".");
const dist = resolve(root, process.env.PERFORMANCE_DIST_DIR ?? "apps/web/dist");
const budgets = JSON.parse(await readFile(resolve(root, "apps/web/performance-budgets.json"), "utf8"));

async function filesWithExtension(directory, extension) {
  return (await readdir(directory)).filter((file) => file.endsWith(extension)).map((file) => resolve(directory, file));
}

async function aggregate(files) {
  if (files.length === 0) throw new Error("Performance measurement received an empty asset group. Build production assets before running budgets.");
  const contents = await Promise.all(files.map((file) => readFile(file)));
  return {
    raw: contents.reduce((total, content) => total + content.byteLength, 0),
    gzip: contents.reduce((total, content) => total + gzipSync(content).byteLength, 0)
  };
}

const assets = resolve(dist, "assets");
const [javascript, css, serviceWorker, snapshot] = await Promise.all([
  filesWithExtension(assets, ".js").then(aggregate),
  filesWithExtension(assets, ".css").then(aggregate),
  aggregate([resolve(dist, "sw.js")]),
  aggregate([resolve(root, "packages/card-data/src/cyberpunk-snapshot.json")])
]);
const snapshotDocument = JSON.parse(await readFile(resolve(root, "packages/card-data/src/cyberpunk-snapshot.json"), "utf8"));
const actual = {
  javascriptRawBytes: javascript.raw,
  javascriptGzipBytes: javascript.gzip,
  cssRawBytes: css.raw,
  cssGzipBytes: css.gzip,
  serviceWorkerRawBytes: serviceWorker.raw,
  serviceWorkerGzipBytes: serviceWorker.gzip,
  cardSnapshotRawBytes: snapshot.raw,
  cardSnapshotGzipBytes: snapshot.gzip,
  productionCodeRawBytes: javascript.raw + css.raw + serviceWorker.raw
};

console.table([
  { asset: "JavaScript", rawBytes: javascript.raw, gzipBytes: javascript.gzip },
  { asset: "CSS", rawBytes: css.raw, gzipBytes: css.gzip },
  { asset: "Service worker", rawBytes: serviceWorker.raw, gzipBytes: serviceWorker.gzip },
  { asset: `Card snapshot (${snapshotDocument.cards.length} cards)`, rawBytes: snapshot.raw, gzipBytes: snapshot.gzip },
  { asset: "Production code total", rawBytes: actual.productionCodeRawBytes, gzipBytes: javascript.gzip + css.gzip + serviceWorker.gzip }
]);

const failures = Object.entries(budgets.sizes).flatMap(([metric, budget]) => {
  const measured = actual[metric];
  if (typeof measured !== "number") return [`Unknown performance metric "${metric}" in budget configuration.`];
  return measured > budget
    ? [`${metric} is ${measured} bytes, above its ${budget}-byte budget. Inspect the production bundle before increasing this threshold.`]
    : [];
});

if (failures.length > 0) {
  throw new Error(`Performance budget failed:\n- ${failures.join("\n- ")}`);
}

console.log(`Performance size budgets passed. Snapshot growth target: ${budgets.expectedCardCountTarget} cards.`);

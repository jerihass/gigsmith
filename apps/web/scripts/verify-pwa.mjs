import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve("apps/web/dist");
const requiredFiles = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "icons/gigsmith-192.png",
  "icons/gigsmith-512.png"
];

await Promise.all(requiredFiles.map((file) => access(resolve(dist, file))));

const [html, manifestText, serviceWorker, assetFiles] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "manifest.webmanifest"), "utf8"),
  readFile(resolve(dist, "sw.js"), "utf8"),
  readdir(resolve(dist, "assets"))
]);
const manifest = JSON.parse(manifestText);

async function assertPngSize(file, expectedSize) {
  const bytes = await readFile(resolve(dist, file));
  const signature = bytes.subarray(1, 4).toString("ascii");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (signature !== "PNG" || width !== expectedSize || height !== expectedSize) {
    throw new Error(`${file} must be a ${expectedSize}x${expectedSize} PNG.`);
  }
}

if (!html.includes('rel="manifest"')) throw new Error("Built index is missing its web app manifest link.");
if (manifest.display !== "standalone") throw new Error("Manifest must use standalone display mode.");
if (!manifest.icons.some((icon) => icon.sizes === "192x192")) throw new Error("Manifest is missing a 192x192 icon.");
if (!manifest.icons.some((icon) => icon.sizes === "512x512")) throw new Error("Manifest is missing a 512x512 icon.");
await Promise.all([
  assertPngSize("icons/gigsmith-192.png", 192),
  assertPngSize("icons/gigsmith-512.png", 512)
]);
for (const file of requiredFiles.filter((file) => file !== "sw.js")) {
  if (!serviceWorker.includes(`./${file}`)) throw new Error(`Service worker does not precache ${file}.`);
}
for (const asset of assetFiles) {
  if (!serviceWorker.includes(`./assets/${asset}`)) throw new Error(`Service worker does not precache assets/${asset}.`);
}
if (!serviceWorker.includes("SKIP_WAITING")) throw new Error("Service worker has no explicit update activation path.");
if (serviceWorker.includes("localStorage") || serviceWorker.includes("indexedDB")) {
  throw new Error("Service worker must not mutate local deck storage.");
}

console.log(`PWA verified: ${assetFiles.length} hashed assets precached.`);

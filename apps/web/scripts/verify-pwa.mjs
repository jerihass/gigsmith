import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const dist = resolve(process.env.PWA_DIST_DIR ?? "apps/web/dist");
const requiredFiles = [
  "index.html",
  "manifest.webmanifest",
  "theme-bootstrap.js",
  "pwa-meta.json",
  "sw.js",
  "icons/gigsmith-192.png",
  "icons/gigsmith-512.png"
];

await Promise.all(requiredFiles.map((file) => access(resolve(dist, file))));

const [html, manifestText, metadataText, serviceWorker, assetFiles] = await Promise.all([
  readFile(resolve(dist, "index.html"), "utf8"),
  readFile(resolve(dist, "manifest.webmanifest"), "utf8"),
  readFile(resolve(dist, "pwa-meta.json"), "utf8"),
  readFile(resolve(dist, "sw.js"), "utf8"),
  readdir(resolve(dist, "assets"))
]);

if (!html.includes('http-equiv="Content-Security-Policy"')) throw new Error("Production HTML has no Content Security Policy.");
if (html.includes("'unsafe-inline'") || html.includes("'unsafe-eval'")) throw new Error("Content Security Policy permits unsafe script execution.");
if (!html.includes("theme-bootstrap.js")) throw new Error("Production HTML is missing the external theme bootstrap.");
const manifest = JSON.parse(manifestText);
const metadata = JSON.parse(metadataText);
const expectedBasePath = process.env.PWA_BASE_PATH ?? metadata.basePath;

if (metadata.basePath !== expectedBasePath) {
  throw new Error(`Expected PWA base ${expectedBasePath}, received ${metadata.basePath}.`);
}
if (process.env.PWA_BUILD_ID && metadata.buildIdentity !== process.env.PWA_BUILD_ID) {
  throw new Error(`Expected build identity ${process.env.PWA_BUILD_ID}, received ${metadata.buildIdentity}.`);
}

async function assertPngSize(file, expectedSize) {
  const bytes = await readFile(resolve(dist, file));
  const signature = bytes.subarray(1, 4).toString("ascii");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (signature !== "PNG" || width !== expectedSize || height !== expectedSize) {
    throw new Error(`${file} must be a ${expectedSize}x${expectedSize} PNG.`);
  }
}

if (!html.includes(`href="${expectedBasePath}manifest.webmanifest"`)) throw new Error("Built index has the wrong web app manifest URL.");
if (!html.includes(`href="${expectedBasePath}icons/gigsmith-192.png"`)) throw new Error("Built index has the wrong install icon URL.");
if (manifest.display !== "standalone") throw new Error("Manifest must use standalone display mode.");
if (manifest.start_url !== "./" || manifest.scope !== "./") throw new Error("Manifest start URL and scope must remain deployment-relative.");
if (!manifest.icons.some((icon) => icon.sizes === "192x192")) throw new Error("Manifest is missing a 192x192 icon.");
if (!manifest.icons.some((icon) => icon.sizes === "512x512")) throw new Error("Manifest is missing a 512x512 icon.");
await Promise.all([
  assertPngSize("icons/gigsmith-192.png", 192),
  assertPngSize("icons/gigsmith-512.png", 512)
]);
for (const file of requiredFiles.filter((file) => file !== "sw.js")) {
  if (!serviceWorker.includes(`${expectedBasePath}${file}`)) throw new Error(`Service worker does not precache ${expectedBasePath}${file}.`);
}
for (const asset of assetFiles) {
  if (!serviceWorker.includes(`${expectedBasePath}assets/${asset}`)) throw new Error(`Service worker does not precache ${expectedBasePath}assets/${asset}.`);
}
if (!serviceWorker.includes(`const CACHE_PREFIX = ${JSON.stringify(metadata.cachePrefix)}`)) throw new Error("Service worker cache prefix does not match build metadata.");
if (!serviceWorker.includes(`const CACHE_NAME = ${JSON.stringify(metadata.cacheName)}`)) throw new Error("Service worker cache name does not match build metadata.");
for (const identity of [metadata.appVersion, metadata.buildIdentity, metadata.cardDataVersion, metadata.rulesetVersion]) {
  if (!metadata.cacheName.includes(identity)) throw new Error(`Cache name is missing identity ${identity}.`);
}
if (!serviceWorker.includes("SKIP_WAITING")) throw new Error("Service worker has no explicit update activation path.");
if (serviceWorker.includes("localStorage") || serviceWorker.includes("indexedDB")) {
  throw new Error("Service worker must not mutate local deck storage.");
}

console.log(`PWA verified at ${expectedBasePath}: ${assetFiles.length} hashed assets precached in ${metadata.cacheName}.`);

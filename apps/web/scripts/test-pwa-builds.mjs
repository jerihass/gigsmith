import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const viteBin = resolve("node_modules/vite/bin/vite.js");
const verifier = resolve("apps/web/scripts/verify-pwa.mjs");
const builds = [
  { name: "root", basePath: "/", buildId: "root-a", dist: resolve("apps/web/dist-pwa-root") },
  { name: "subpath-a", basePath: "/gigsmith/", buildId: "subpath-a", dist: resolve("apps/web/dist-pwa-subpath-a") },
  { name: "subpath-b", basePath: "/gigsmith/", buildId: "subpath-b", dist: resolve("apps/web/dist-pwa-subpath-b") }
];

function run(command, args, env) {
  const result = spawnSync(command, args, {
    cwd: resolve("."),
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe"
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status}.`);
  }
}

await Promise.all(builds.map((build) => rm(build.dist, { recursive: true, force: true })));

try {
  for (const build of builds) {
    run(process.execPath, [viteBin, "build", "apps/web", "--outDir", build.dist, "--emptyOutDir"], {
      GIGSMITH_BASE_PATH: build.basePath,
      GIGSMITH_BUILD_ID: build.buildId
    });
    run(process.execPath, [verifier], {
      PWA_DIST_DIR: build.dist,
      PWA_BASE_PATH: build.basePath,
      PWA_BUILD_ID: build.buildId
    });
  }

  const [rootMetadata, firstMetadata, secondMetadata, secondWorker] = await Promise.all([
    readFile(resolve(builds[0].dist, "pwa-meta.json"), "utf8").then(JSON.parse),
    readFile(resolve(builds[1].dist, "pwa-meta.json"), "utf8").then(JSON.parse),
    readFile(resolve(builds[2].dist, "pwa-meta.json"), "utf8").then(JSON.parse),
    readFile(resolve(builds[2].dist, "sw.js"), "utf8")
  ]);

  if (rootMetadata.cachePrefix === firstMetadata.cachePrefix) {
    throw new Error("Root and subpath builds must not share a cache family.");
  }
  if (firstMetadata.cachePrefix !== secondMetadata.cachePrefix) {
    throw new Error("Sequential builds at one scope must share a cache family.");
  }
  if (firstMetadata.cacheName === secondMetadata.cacheName) {
    throw new Error("Sequential builds must produce different cache names.");
  }
  if (!secondWorker.includes("key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME")) {
    throw new Error("Updated worker does not remove obsolete caches in its scope.");
  }
  if (!secondWorker.includes("SKIP_WAITING")) {
    throw new Error("Updated worker cannot be explicitly activated.");
  }

  console.log(`Sequential PWA builds verified: ${firstMetadata.cacheName} -> ${secondMetadata.cacheName}.`);
} finally {
  await Promise.all(builds.map((build) => rm(build.dist, { recursive: true, force: true })));
}

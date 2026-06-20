export interface CacheIdentityInput {
  appVersion: string;
  basePath: string;
  buildIdentity: string;
  cardDataVersion: string;
  rulesetVersion: string;
}

function safeToken(value: string): string {
  const token = value.trim().replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return token || "unknown";
}

export function normalizeBasePath(value: string | undefined): string {
  const candidate = value?.trim() || "/";
  if (!candidate.startsWith("/") || candidate.includes("?") || candidate.includes("#") || candidate.includes("://") || candidate.includes("\\")) {
    throw new Error(`GIGSMITH_BASE_PATH must be an absolute URL path, received "${candidate}".`);
  }
  const collapsed = candidate.replace(/\/+/g, "/");
  if (collapsed.split("/").some((segment) => segment === "." || segment === "..")) {
    throw new Error(`GIGSMITH_BASE_PATH cannot contain relative path segments, received "${candidate}".`);
  }
  return collapsed === "/" ? "/" : `/${collapsed.replace(/^\/+|\/+$/g, "")}/`;
}

export function buildIdentityFromFiles(fileNames: string[]): string {
  let hash = 2166136261;
  for (const character of [...fileNames].sort().join("|")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createCacheIdentity(input: CacheIdentityInput): { cacheName: string; cachePrefix: string } {
  const scope = input.basePath === "/"
    ? "root"
    : `${safeToken(input.basePath)}-${buildIdentityFromFiles([input.basePath])}`;
  const cachePrefix = `gigsmith-shell-${scope}-`;
  const cacheName = cachePrefix + [
    safeToken(input.appVersion),
    safeToken(input.buildIdentity),
    safeToken(input.cardDataVersion),
    safeToken(input.rulesetVersion)
  ].join("-");
  return { cacheName, cachePrefix };
}

export function scopedAssetPath(basePath: string, fileName: string): string {
  if (fileName === "") return basePath;
  return `${basePath}${fileName.replace(/^\/+/, "")}`;
}

export function renderServiceWorker({
  basePath,
  cacheName,
  cachePrefix,
  files
}: {
  basePath: string;
  cacheName: string;
  cachePrefix: string;
  files: string[];
}): string {
  const shellFiles = [...new Set(files.map((file) => scopedAssetPath(basePath, file)))].sort();
  return `const CACHE_PREFIX = ${JSON.stringify(cachePrefix)};
const CACHE_NAME = ${JSON.stringify(cacheName)};
const CLEAN_LEGACY_ROOT_CACHES = ${basePath === "/"};
const FALLBACK_URL = ${JSON.stringify(scopedAssetPath(basePath, "index.html"))};
const SERVICE_WORKER_PATH = ${JSON.stringify(scopedAssetPath(basePath, "sw.js"))};
const SHELL_FILES = ${JSON.stringify(shellFiles, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => {
        const obsoleteScopedCache = key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME;
        const legacyRootCache = CLEAN_LEGACY_ROOT_CACHES && /^gigsmith-shell-\\d/.test(key);
        return obsoleteScopedCache || legacyRootCache;
      }).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match(FALLBACK_URL)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      if (response.ok && url.pathname !== SERVICE_WORKER_PATH) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
`;
}

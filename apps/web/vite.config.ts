import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import snapshot from "../../packages/card-data/src/cyberpunk-snapshot.json";

function renderServiceWorker(files: string[], cacheName: string): string {
  return `const CACHE_NAME = ${JSON.stringify(cacheName)};
const SHELL_FILES = ${JSON.stringify(files, null, 2)};

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("gigsmith-shell-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
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
    event.respondWith(
      fetch(event.request).catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
      if (response.ok && url.pathname !== new URL("./sw.js", self.registration.scope).pathname) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
`;
}

function serviceWorkerPlugin(): Plugin {
  return {
    name: "gigsmith-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [
        "./",
        "./index.html",
        "./manifest.webmanifest",
        "./icons/gigsmith-192.png",
        "./icons/gigsmith-512.png",
        ...Object.keys(bundle).filter((fileName) => fileName !== "sw.js").map((fileName) => `./${fileName}`)
      ];
      const uniqueFiles = [...new Set(files)].sort();
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: renderServiceWorker(
          uniqueFiles,
          `gigsmith-shell-0.1.0-${snapshot.metadata.cardDataVersion}`
        )
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), serviceWorkerPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});

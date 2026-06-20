import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import packageMetadata from "../../package.json";
import snapshot from "../../packages/card-data/src/cyberpunk-snapshot.json";
import { cyberpunkRulesetV1Printable } from "../../packages/card-data/src/ruleset";
import {
  buildIdentityFromFiles,
  createCacheIdentity,
  normalizeBasePath,
  renderServiceWorker
} from "./pwaBuild";

declare const process: { env: Record<string, string | undefined> };

const basePath = normalizeBasePath(process.env.GIGSMITH_BASE_PATH);

function serviceWorkerPlugin(): Plugin {
  return {
    name: "gigsmith-service-worker",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = [
        "",
        "index.html",
        "manifest.webmanifest",
        "pwa-meta.json",
        "icons/gigsmith-192.png",
        "icons/gigsmith-512.png",
        ...Object.keys(bundle).filter((fileName) => fileName !== "sw.js")
      ];
      const buildIdentity = process.env.GIGSMITH_BUILD_ID?.trim() || buildIdentityFromFiles(Object.keys(bundle));
      const identity = createCacheIdentity({
        appVersion: packageMetadata.version,
        basePath,
        buildIdentity,
        cardDataVersion: snapshot.metadata.cardDataVersion,
        rulesetVersion: cyberpunkRulesetV1Printable.version
      });
      this.emitFile({
        type: "asset",
        fileName: "sw.js",
        source: renderServiceWorker({ basePath, files, ...identity })
      });
      this.emitFile({
        type: "asset",
        fileName: "pwa-meta.json",
        source: JSON.stringify({
          appVersion: packageMetadata.version,
          basePath,
          buildIdentity,
          cardDataVersion: snapshot.metadata.cardDataVersion,
          rulesetVersion: cyberpunkRulesetV1Printable.version,
          ...identity
        }, null, 2)
      });
    }
  };
}

export default defineConfig({
  base: basePath,
  plugins: [react(), serviceWorkerPlugin()],
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});

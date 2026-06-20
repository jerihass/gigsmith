import { rm } from "node:fs/promises";
import { resolve } from "node:path";

process.env.GIGSMITH_BASE_PATH = "/gigsmith/";
process.env.GIGSMITH_BUILD_ID = "subpath-browser-test";

const { build, preview } = await import("vite");
const root = resolve("apps/web");
const outDir = resolve("apps/web/dist-pwa-e2e");
await rm(outDir, { recursive: true, force: true });
let server;
try {
  await build({ root, build: { outDir, emptyOutDir: true } });
  server = await preview({
    root,
    build: { outDir },
    preview: { host: "127.0.0.1", port: 4174, strictPort: true }
  });
} catch (error) {
  await rm(outDir, { recursive: true, force: true });
  throw error;
}

async function shutdown() {
  await server?.close();
  await rm(outDir, { recursive: true, force: true });
  process.exit(0);
}

process.on("SIGINT", () => { void shutdown(); });
process.on("SIGTERM", () => { void shutdown(); });

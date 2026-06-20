import { describe, expect, it } from "vitest";
import {
  buildIdentityFromFiles,
  createCacheIdentity,
  normalizeBasePath,
  renderServiceWorker,
  scopedAssetPath
} from "../pwaBuild";

describe("PWA build helpers", () => {
  it("normalizes root and nested deployment paths", () => {
    expect(normalizeBasePath(undefined)).toBe("/");
    expect(normalizeBasePath("/gigsmith")).toBe("/gigsmith/");
    expect(normalizeBasePath("//tools///gigsmith//")).toBe("/tools/gigsmith/");
    expect(() => normalizeBasePath("https://example.com/gigsmith/")).toThrow("absolute URL path");
    expect(() => normalizeBasePath("gigsmith")).toThrow("absolute URL path");
    expect(() => normalizeBasePath("/tools/../gigsmith/")).toThrow("relative path segments");
  });

  it("derives a stable build identity from emitted filenames", () => {
    expect(buildIdentityFromFiles(["assets/app-123.js", "index.html"]))
      .toBe(buildIdentityFromFiles(["index.html", "assets/app-123.js"]));
    expect(buildIdentityFromFiles(["assets/app-123.js"]))
      .not.toBe(buildIdentityFromFiles(["assets/app-456.js"]));
  });

  it("separates root and subpath cache families while recording every version", () => {
    const input = {
      appVersion: "0.1.0",
      buildIdentity: "build-42",
      cardDataVersion: "cards-v2",
      rulesetVersion: "rules-v3"
    };
    const root = createCacheIdentity({ ...input, basePath: "/" });
    const nested = createCacheIdentity({ ...input, basePath: "/gigsmith/" });

    expect(root.cachePrefix).toBe("gigsmith-shell-root-");
    expect(nested.cachePrefix).toMatch(/^gigsmith-shell-gigsmith-[a-f0-9]{8}-$/);
    expect(root.cacheName).not.toBe(nested.cacheName);
    for (const version of Object.values(input)) expect(nested.cacheName).toContain(version);
  });

  it("generates scope-correct shell URLs and storage-neutral update cleanup", () => {
    const identity = createCacheIdentity({
      appVersion: "0.1.0",
      basePath: "/gigsmith/",
      buildIdentity: "build-a",
      cardDataVersion: "cards-v1",
      rulesetVersion: "rules-v1"
    });
    const worker = renderServiceWorker({
      basePath: "/gigsmith/",
      files: ["", "index.html", "assets/app.js"],
      ...identity
    });

    expect(scopedAssetPath("/gigsmith/", "assets/app.js")).toBe("/gigsmith/assets/app.js");
    expect(worker).toContain('"/gigsmith/index.html"');
    expect(worker).toContain(`key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME`);
    expect(worker).not.toContain("localStorage");
    expect(worker).not.toContain("indexedDB");
  });

  it("migrates legacy unscoped caches only from the root worker", () => {
    const identity = {
      cacheName: "gigsmith-shell-test-current",
      cachePrefix: "gigsmith-shell-test-"
    };
    const rootWorker = renderServiceWorker({ basePath: "/", files: [""], ...identity });
    const nestedWorker = renderServiceWorker({ basePath: "/gigsmith/", files: [""], ...identity });

    expect(rootWorker).toContain("const CLEAN_LEGACY_ROOT_CACHES = true");
    expect(nestedWorker).toContain("const CLEAN_LEGACY_ROOT_CACHES = false");
    expect(rootWorker).toContain("/^gigsmith-shell-\\d/.test(key)");
  });
});

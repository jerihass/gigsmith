import { defineConfig, devices } from "@playwright/test";

const localBrowser = process.env.CI ? {} : { channel: "chrome" as const };
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4173";
const subpathBaseURL = process.env.PLAYWRIGHT_SUBPATH_BASE_URL ?? "http://127.0.0.1:4174/gigsmith/";
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure"
  },
  projects: [
    {
      name: "desktop-chromium",
      testIgnore: /(?:performance|pwa-subpath)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], browserName: "chromium", ...localBrowser }
    },
    {
      name: "phone-chromium",
      testIgnore: /(?:performance|pwa-subpath)\.spec\.ts/,
      use: { ...devices["Pixel 7"], browserName: "chromium", ...localBrowser }
    },
    {
      name: "subpath-chromium",
      testMatch: /pwa-subpath\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], browserName: "chromium", baseURL: subpathBaseURL, ...localBrowser }
    },
    {
      name: "performance-chromium",
      testMatch: /performance\.spec\.ts/,
      use: { ...devices["Pixel 7"], browserName: "chromium", ...localBrowser }
    }
  ],
  webServer: skipWebServer ? undefined : [
    {
      command: "npm run preview",
      url: "http://127.0.0.1:4173",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: "node apps/web/scripts/serve-subpath-preview.mjs",
      url: "http://127.0.0.1:4174/gigsmith/",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ]
});

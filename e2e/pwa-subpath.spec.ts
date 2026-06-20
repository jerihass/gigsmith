import { expect, test } from "@playwright/test";

test("installs, reloads offline, and preserves deck data from a subpath", async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1", "Subpath coverage requires its production preview.");
  await page.goto("./");
  await expect(page).toHaveURL(/\/gigsmith\/$/);
  await expect(page.getByRole("heading", { name: "Gigsmith" })).toBeVisible();
  await expect(page.locator("link[rel='manifest']")).toHaveAttribute("href", "/gigsmith/manifest.webmanifest");

  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain("/gigsmith/sw.js");
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).scope)).toContain("/gigsmith/");
  await page.getByLabel("Deck name", { exact: true }).fill("Subpath Offline Deck");

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Gigsmith" })).toBeVisible();
    await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("Subpath Offline Deck");
  } finally {
    await context.setOffline(false);
  }
});

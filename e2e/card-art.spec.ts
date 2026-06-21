import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const artHostPattern = "https://dstcynss47vun.cloudfront.net/**";
const artSourcePattern = "https://api.netdeck.gg/api/cards/cyberpunk**";
const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const snapshot = JSON.parse(readFileSync(new URL("../packages/card-data/src/cyberpunk-snapshot.json", import.meta.url), "utf8")) as {
  cards: Array<{ id: string; external_id: string; source_image_url: string }>;
};

async function routeArtSource(page: Page) {
  await page.route(artSourcePattern, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      total: snapshot.cards.length,
      items: snapshot.cards.map((card) => ({
        id: card.id,
        external_id: card.external_id,
        image_url: `${card.source_image_url}?Expires=9999999999&Signature=test`
      }))
    })
  }));
}

test("makes no external art request until the preference is enabled", async ({ page }) => {
  const artRequests: string[] = [];
  const sourceRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://dstcynss47vun.cloudfront.net/")) artRequests.push(request.url());
    if (request.url().startsWith("https://api.netdeck.gg/api/cards/cyberpunk")) sourceRequests.push(request.url());
  });
  await routeArtSource(page);
  await page.route(artHostPattern, (route) => route.fulfill({ status: 200, contentType: "image/png", body: transparentPng }));
  await page.goto("/");

  await expect(page.locator("img[src*='dstcynss47vun.cloudfront.net']")).toHaveCount(0);
  expect(artRequests).toEqual([]);
  expect(sourceRequests).toEqual([]);

  const preference = page.getByLabel("External art");
  await preference.check();
  await expect(page.locator("img[src*='dstcynss47vun.cloudfront.net']")).toHaveCount(snapshot.cards.length);
  await expect.poll(() => sourceRequests.length).toBe(1);
  await expect.poll(() => artRequests.length).toBeGreaterThan(0);

  await preference.uncheck();
  await expect(page.locator("img[src*='dstcynss47vun.cloudfront.net']")).toHaveCount(0);
});

test("keeps card text and actions available when artwork fails", async ({ page }) => {
  await routeArtSource(page);
  await page.route(artHostPattern, (route) => route.abort());
  await page.goto("/");
  await page.getByLabel("External art").check();

  const firstCard = page.getByRole("article").filter({ hasText: "V — StreetKid" });
  await expect(firstCard.getByText("Art unavailable")).toBeVisible();
  await expect(firstCard.getByRole("button", { name: "Details" })).toBeEnabled();
  await firstCard.getByRole("button", { name: "Details" }).click();

  const dialog = page.getByRole("dialog", { name: "V — StreetKid" });
  await expect(dialog.getByText("Art unavailable")).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Rules" })).toBeVisible();
});

test("keeps responsive card text beside enabled artwork", async ({ page }) => {
  await routeArtSource(page);
  await page.route(artHostPattern, (route) => route.fulfill({ status: 200, contentType: "image/png", body: transparentPng }));
  await page.goto("/");
  await page.getByLabel("External art").check();

  const firstCard = page.getByRole("article").filter({ hasText: "V — StreetKid" });
  const art = firstCard.locator(".card-art.thumbnail");
  const copy = firstCard.locator(".card-copy");
  await expect(art).toBeVisible();

  const [artBox, copyBox] = await Promise.all([art.boundingBox(), copy.boundingBox()]);
  expect(artBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  expect(copyBox!.x).toBeGreaterThan(artBox!.x + artBox!.width - 1);
  expect(copyBox!.y).toBeLessThan(artBox!.y + artBox!.height);
});

test("keeps text-only card workflows usable offline with art enabled", async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1", "Offline coverage requires the production service worker.");
  await routeArtSource(page);
  await page.route(artHostPattern, (route) => route.abort());
  await page.goto("/");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByLabel("External art").check();

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByLabel("External art")).toBeChecked();
    const firstCard = page.getByRole("article").filter({ hasText: "V — StreetKid" });
    await expect(firstCard.getByRole("button", { name: "Details" })).toBeEnabled();
    await firstCard.getByRole("button", { name: "Details" }).click();
    await expect(page.getByRole("dialog", { name: "V — StreetKid" })).toContainText("RAM");
  } finally {
    await context.setOffline(false);
  }
});

import { expect, test } from "@playwright/test";

const artHostPattern = "https://dstcynss47vun.cloudfront.net/**";
const transparentPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

test("makes no external art request until the preference is enabled", async ({ page }) => {
  const artRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://dstcynss47vun.cloudfront.net/")) artRequests.push(request.url());
  });
  await page.route(artHostPattern, (route) => route.fulfill({ status: 200, contentType: "image/png", body: transparentPng }));
  await page.goto("/");

  await expect(page.locator("img[src*='dstcynss47vun.cloudfront.net']")).toHaveCount(0);
  expect(artRequests).toEqual([]);

  const preference = page.getByLabel("External art");
  await preference.check();
  await expect(page.locator("img[src*='dstcynss47vun.cloudfront.net']")).toHaveCount(60);
  await expect.poll(() => artRequests.length).toBeGreaterThan(0);

  await preference.uncheck();
  await expect(page.locator("img[src*='dstcynss47vun.cloudfront.net']")).toHaveCount(0);
});

test("keeps card text and actions available when artwork fails", async ({ page }) => {
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

test("keeps text-only card workflows usable offline with art enabled", async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1", "Offline coverage requires the production service worker.");
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

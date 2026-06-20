import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("supports keyboard tab navigation and has no serious accessibility violations", async ({ page }) => {
  const deckTab = page.getByRole("tab", { name: "Deck" });
  await deckTab.focus();
  await deckTab.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Analysis" })).toHaveAttribute("aria-selected", "true");

  for (const view of ["Deck", "Analysis", "Gigs", "Tactics", "Transfer"]) {
    await page.getByRole("tab", { name: view }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""));
    expect(serious, `${view}: ${serious.map((violation) => violation.id).join(", ")}`).toEqual([]);
  }
});

test("contains horizontal overflow and keeps deck status visible", async ({ page }) => {
  const layout = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: document.documentElement.clientWidth,
    activeDeck: document.querySelector(".active-deck-context strong")?.textContent,
    status: document.querySelector(".status")?.textContent
  }));

  expect(layout.documentWidth).toBe(layout.viewportWidth);
  expect(layout.activeDeck).toBeTruthy();
  expect(layout.status).toMatch(/Legal|issue/);
});

test("reloads offline without losing local deck changes", async ({ page, context }) => {
  test.skip(process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1", "Offline coverage requires the production service worker.");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.getByLabel("Deck name", { exact: true }).fill("Offline Browser Test");

  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Gigsmith" })).toBeVisible();
    await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("Offline Browser Test");
  } finally {
    await context.setOffline(false);
  }
});

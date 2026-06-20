import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("creates and edits a deck with immediate validation", async ({ page }) => {
  await page.getByRole("button", { name: "New", exact: true }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("Untitled Deck");
  await expect(page.locator(".status")).toContainText("issue");

  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Chrome Reverie");
  await page.getByRole("button", { name: "+ Main", exact: true }).click();
  await expect(page.getByText("1 / 40-50", { exact: true })).toBeVisible();
  await expect(page.getByText("1 in deck", { exact: false })).toBeVisible();
});

test("opens card details and restores focus when dismissed", async ({ page }) => {
  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Chrome Reverie");
  const card = page.getByRole("article").filter({ hasText: "Chrome Reverie" });
  const details = card.getByRole("button", { name: "Details", exact: true });
  await details.click();
  await expect(page.getByRole("dialog", { name: "Chrome Reverie" })).toBeVisible();
  const close = page.getByRole("button", { name: "Close card details" });
  await expect(close).toBeFocused();
  await close.click();
  await expect(details).toBeFocused();
});

test("upgrades a stale deck baseline only after explicit action", async ({ page }) => {
  await page.evaluate(() => {
    const key = "gigsmith.deck-library.v1";
    const library = JSON.parse(localStorage.getItem(key) ?? "{}");
    const deck = library.decks.find((candidate: { id: string }) => candidate.id === library.activeDeckId);
    deck.rulesetVersion = "ruleset.v0-guide";
    deck.cardDataVersion = "cards.old";
    localStorage.setItem(key, JSON.stringify(library));
  });
  await page.reload();

  const notice = page.getByRole("region", { name: "Deck baseline update" });
  await expect(notice).toBeVisible();
  await notice.getByRole("button", { name: "Use current baseline" }).click();
  await expect(notice).toBeHidden();
  await page.getByRole("tab", { name: "Analysis" }).click();
  await expect(page.getByRole("heading", { name: "Data Warnings" })).toHaveCount(0);
});

test("exports JSON and reports malformed imports", async ({ page }) => {
  await page.getByRole("tab", { name: "Transfer" }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await expect(page.getByLabel("JSON deck export")).toHaveValue(/"schema": "gigsmith\.deck"/);

  await page.getByLabel("JSON deck import").fill("{}");
  await page.getByRole("button", { name: "Import JSON" }).click();
  await expect(page.locator(".import-error")).toContainText("schema");
});

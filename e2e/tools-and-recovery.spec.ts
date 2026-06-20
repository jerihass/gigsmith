import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("preserves Gig state across task view switches", async ({ page }) => {
  await page.getByRole("tab", { name: "Gigs" }).click();
  await expect(page.locator(".match-gig")).toHaveCount(12);
  await page.getByRole("button", { name: "Roll and gain You d4" }).click();
  await expect(page.locator(".friendly-cred > dd:not(.street-cred-detail)")).toHaveText("1 Gig");

  await page.getByRole("tab", { name: "Transfer" }).click();
  await expect(page.getByRole("heading", { name: "Import / Export" })).toBeVisible();
  await page.getByRole("tab", { name: "Gigs" }).click();
  await expect(page.locator(".friendly-cred > dd:not(.street-cred-detail)")).toHaveText("1 Gig");
});

test("enforces the fixed pool, one Gig per turn, and d20-last rule", async ({ page }) => {
  await page.getByRole("tab", { name: "Gigs" }).click();
  await expect(page.getByRole("button", { name: "Roll and gain You d20" })).toBeDisabled();

  await page.getByRole("button", { name: "Roll and gain You d6" }).click();
  await expect(page.getByRole("button", { name: "Roll and gain You d4" })).toBeDisabled();
  await page.getByRole("button", { name: "End turn" }).click();
  await expect(page.getByRole("button", { name: "Roll and gain Rival d4" })).toBeEnabled();

  await page.getByRole("button", { name: "Reset match" }).click();
  await expect(page.locator(".match-gig")).toHaveCount(12);
  await expect(page.locator(".friendly-cred > dd:not(.street-cred-detail)")).toHaveText("0 Gigs");
});

test("preserves corrupt storage until the user explicitly resets it", async ({ page }) => {
  await page.evaluate(() => localStorage.setItem("gigsmith.deck-library.v1", "not-json"));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Saved decks need attention" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveValue("not-json");
  expect(await page.evaluate(() => localStorage.getItem("gigsmith.deck-library.v1"))).toBe("not-json");

  await page.getByRole("button", { name: "Reset saved decks", exact: true }).click();
  await page.getByRole("button", { name: "Reset saved decks", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Gigsmith" })).toBeVisible();
});

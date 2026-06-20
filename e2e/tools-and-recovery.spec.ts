import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("preserves Gig state across task view switches", async ({ page }) => {
  await page.getByRole("tab", { name: "Gigs" }).click();
  await page.getByRole("button", { name: "+ Add Gig" }).click();
  await page.getByLabel("Value for Gig 1").fill("4");
  await page.getByLabel("Controller for Gig 1").selectOption("player");
  await expect(page.locator(".friendly-cred > dd:not(.street-cred-detail)")).toHaveText("4");

  await page.getByRole("tab", { name: "Tactics" }).click();
  await expect(page.getByText("Attack rival Gig area: steal 1")).toBeVisible();
  await page.getByRole("tab", { name: "Gigs" }).click();
  await expect(page.getByLabel("Value for Gig 1")).toHaveValue("4");
});

test("explains Blocker changes in the tactical sandbox", async ({ page }) => {
  await page.getByRole("tab", { name: "Tactics" }).click();
  const steal = page.getByRole("article").filter({ hasText: "Attack rival Gig area: steal 1" });
  await expect(steal).toContainText("Blocked");

  const blocker = page.getByRole("group", { name: "Rival Blocker" });
  await blocker.getByRole("checkbox", { name: "Ready" }).uncheck();
  await expect(steal).toContainText("Legal");
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

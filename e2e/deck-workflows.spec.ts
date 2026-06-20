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

test("undoes and redoes an active-deck card edit", async ({ page }) => {
  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Chrome Reverie");
  await page.getByRole("button", { name: "+ Main", exact: true }).click();
  await expect(page.getByText("41 / 40-50", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Undo deck edit" }).click();
  await expect(page.getByText("40 / 40-50", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Redo deck edit" }).click();
  await expect(page.getByText("41 / 40-50", { exact: true })).toBeVisible();
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

test("opens card details from the deck editor", async ({ page }) => {
  const details = page.getByRole("button", { name: "View details for V — StreetKid" });
  await details.click();
  await expect(page.getByRole("dialog", { name: "V — StreetKid" })).toBeVisible();
  await page.getByRole("button", { name: "Close card details" }).click();
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

test("repeats a sample hand for the same seed", async ({ page }) => {
  await page.getByRole("tab", { name: "Analysis" }).click();
  const cards = page.getByRole("list", { name: "Sample hand cards" }).getByRole("listitem");
  await expect(cards).toHaveCount(6);

  const seed = page.getByLabel("Seed");
  await seed.fill("repeatable-test-seed");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  const firstHand = await cards.allTextContents();

  await page.getByRole("button", { name: "New seed" }).click();
  await seed.fill("repeatable-test-seed");
  await page.getByRole("button", { name: "Generate", exact: true }).click();
  await expect(cards).toHaveText(firstHand);
});

test("compares a hand with a full mulligan under visible assumptions", async ({ page }) => {
  await page.getByRole("tab", { name: "Analysis" }).click();
  const comparison = page.getByRole("region", { name: "Mulligan Comparison" });
  await expect(comparison.getByText(/Lean keep|Lean mulligan|Close call/)).toBeVisible();
  await expect(comparison.getByRole("list", { name: "Sample mulligan cards" }).getByRole("listitem")).toHaveCount(6);

  const goal = comparison.getByRole("combobox", { name: "Goal" });
  await goal.selectOption("eddy-supply");
  await expect(goal).toHaveValue("eddy-supply");

  const capacityRow = comparison.getByRole("row", { name: /Gross capacity/ });
  const firstPlayerCapacity = await capacityRow.getByRole("cell").nth(0).textContent();
  await comparison.getByRole("button", { name: "Going second" }).click();
  await expect(capacityRow.getByRole("cell").nth(0)).not.toHaveText(firstPlayerCapacity ?? "");

  await comparison.getByText("Recommendation method and limits").click();
  await expect(comparison.getByText(/seeded samples|exact outcomes/)).toBeVisible();
  await expect(comparison).toContainText("not claims of an objectively correct play");
});

test("connects deck Gig goals with exact roll and current-board odds", async ({ page }) => {
  await page.getByRole("tab", { name: "Analysis" }).click();
  const odds = page.getByRole("region", { name: "Gig Odds & Color Goals" });
  await expect(odds).toContainText("same-value pair");
  await expect(odds.locator(".die-order > span")).toHaveCount(6);
  await expect(odds.getByRole("row")).toHaveCount(7);

  await page.getByRole("tab", { name: "Gigs" }).click();
  await page.getByRole("button", { name: "Roll and gain You d4" }).click();
  await page.getByRole("tab", { name: "Analysis" }).click();
  await expect(odds.getByRole("heading", { name: "Your Next Fixer Die" })).toBeVisible();
  await expect(odds.locator(".next-die-options article")).toHaveCount(4);
});

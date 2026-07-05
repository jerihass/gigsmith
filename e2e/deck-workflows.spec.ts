import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

function cardResult(page: Page, name: string) {
  return page.getByRole("region", { name: "Card database results" }).getByRole("article", { name });
}

function mainDeckCard(page: Page, name: string) {
  return page.getByRole("list", { name: "Main deck cards" }).getByRole("listitem", { name: new RegExp(`^${name},`) });
}

async function showAdvancedCardFilters(page: Page) {
  const toggle = page.getByRole("button", { name: /^Filters/ });
  if ((await toggle.isVisible()) && (await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}

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
  await expect(cardResult(page, "Chrome Reverie").getByLabel("1 copy in deck")).toBeVisible();
});

test("prevents a fourth copy through deck editing controls", async ({ page }) => {
  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Swordwise Huscle");
  const card = page.getByRole("article").filter({ hasText: "Swordwise Huscle" });
  await expect(card.getByRole("button", { name: "Max 3" })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Swordwise Huscle already has the maximum 3 copies/ })).toBeDisabled();
  await expect(page.getByText("40 / 40-50", { exact: true })).toBeVisible();
});

test("repairs a previously saved over-limit deck without normalizing it on load", async ({ page }) => {
  await page.evaluate(() => {
    const key = "gigsmith.deck-library.v1";
    const library = JSON.parse(localStorage.getItem(key) ?? "{}");
    const deck = library.decks.find((candidate: { id: string }) => candidate.id === library.activeDeckId);
    const entry = deck.main.find(
      (candidate: { cardId: string }) => candidate.cardId === "3c4e7fcb-933d-4712-9ce7-6052a14f8e94"
    );
    entry.count = 4;
    localStorage.setItem(key, JSON.stringify(library));
  });
  await page.reload();

  const deckCard = mainDeckCard(page, "Swordwise Huscle");
  await expect(deckCard.getByRole("button", { name: "Remove one Swordwise Huscle" })).toBeEnabled();
  await expect(deckCard.getByLabel("4 copies", { exact: true })).toBeVisible();
  await deckCard.getByRole("button", { name: "Remove one Swordwise Huscle" }).click();
  await expect(deckCard.getByLabel("3 copies", { exact: true })).toBeVisible();
});

test("filters by Legend RAM fit and allows a warned incompatible addition", async ({ page }) => {
  await showAdvancedCardFilters(page);
  await page.getByRole("combobox", { name: "RAM fit", exact: true }).selectOption("Incompatible");
  const card = cardResult(page, "Adam Smasher — Metal Over Meat");
  await expect(card.getByText("Over RAM", { exact: false })).toBeVisible();
  await card.getByRole("button", { name: "+ Main" }).click();

  await expect(page.locator(".deck-edit-notice")).toContainText("requires 6 Yellow RAM");
  const deckCard = mainDeckCard(page, "Adam Smasher — Metal Over Meat");
  await expect(deckCard.getByText("Over RAM", { exact: false })).toBeVisible();
  await expect(page.getByText("41 / 40-50", { exact: true })).toBeVisible();
});

test("clears stale RAM warnings after Legends make the card compatible", async ({ page }) => {
  await page.getByRole("button", { name: "New", exact: true }).click();

  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Wraith Marauders");
  await cardResult(page, "Wraith Marauders").getByRole("button", { name: "+ Main" }).click();
  await expect(page.locator(".deck-edit-notice")).toContainText("requires 2 Green RAM");

  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Goro Takemura — Vengeful Bodyguard");
  await cardResult(page, "Goro Takemura — Vengeful Bodyguard").getByRole("button", { name: "Add Legend" }).click();
  await expect(page.locator(".deck-edit-notice")).toBeHidden();
  await expect(mainDeckCard(page, "Wraith Marauders").getByText("Over RAM", { exact: false })).toHaveCount(0);
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

test("saves, compares, restores, and exports deck versions explicitly", async ({ page }) => {
  await page.getByRole("textbox", { name: "Version name" }).fill("Before Chrome");
  await page.getByRole("button", { name: "Save version" }).click();
  await expect(page.getByRole("combobox", { name: "Saved deck version" })).toContainText("Before Chrome");

  await page.getByRole("textbox", { name: "Search", exact: true }).fill("Chrome Reverie");
  await page.getByRole("button", { name: "+ Main", exact: true }).click();

  await expect(page.getByLabel("Version comparison summary")).toContainText("40");
  await expect(page.getByLabel("Version comparison summary")).toContainText("41");
  await expect(page.getByText("Chrome Reverie 0 -> 1")).toBeVisible();

  await page.getByRole("button", { name: "Restore as current edit" }).click();
  await expect(page.getByText("40 / 40-50", { exact: true })).toBeVisible();
  await expect(page.getByText("No card-count changes from this saved version.")).toBeVisible();

  await page.getByRole("tab", { name: "Transfer" }).click();
  await page.getByRole("button", { name: "JSON" }).click();
  await page.getByLabel("Include versions").check();
  await expect(page.getByLabel("JSON deck export")).toContainText("\"versions\"");
  await expect(page.getByLabel("JSON deck export")).toContainText("Before Chrome");
});

test("records and edits a playtest tied to a saved deck version", async ({ page }) => {
  await page.getByRole("textbox", { name: "Version name" }).fill("Event List");
  await page.getByRole("button", { name: "Save version" }).click();
  await page.getByRole("tab", { name: "Journal" }).click();
  const journal = page.getByRole("tabpanel", { name: "Journal" });

  await journal.getByLabel("Playtest date").fill("2026-06-29");
  await journal.getByLabel("Playtest deck version").selectOption({ label: "Event List" });
  await journal.getByLabel("Playtest result").selectOption("win");
  await journal.getByLabel("Playtest first player").selectOption("first");
  await journal.getByLabel("Opponent archetype").fill("Blue control");
  await journal.getByLabel("Blue").check();
  await journal.getByLabel("Turns played").fill("5");
  await journal.getByLabel("Final Street Cred").fill("22");
  await journal.getByLabel("Playtest event").fill("Store night");
  await journal.getByLabel("Playtest tags").fill("starter, tempo");
  await journal.getByLabel("Playtest notes").fill("Won on Gig pressure.");
  await journal.getByRole("button", { name: "Record playtest" }).click();

  await expect(journal.getByLabel("Playtest summary")).toContainText("1");
  await expect(journal.getByLabel("Playtest records")).toContainText("WIN");
  await expect(journal.getByLabel("Playtest records")).toContainText("Event List");
  await expect(page.getByText("Blue 1")).toBeVisible();

  await journal.getByRole("button", { name: "Edit" }).click();
  await journal.getByLabel("Playtest result").selectOption("loss");
  await journal.getByRole("button", { name: "Save playtest" }).click();

  await expect(journal.getByLabel("Playtest summary")).toContainText("0-1-0");
  await expect(journal.getByLabel("Playtest records")).toContainText("LOSS");
  await expect(journal.getByLabel("Playtest records")).toContainText("Event List");
});

test("renders printable proxy cards without artwork", async ({ page }) => {
  await page.getByRole("tab", { name: "Print" }).click();
  const printPanel = page.getByRole("tabpanel", { name: "Print" });

  await expect(printPanel.getByRole("heading", { name: "Printable Proxy Deck" })).toBeVisible();
  await expect(printPanel.getByLabel("Proxy print mode")).toHaveValue("bw");
  await expect(printPanel.getByRole("button", { name: "Download 9-up PDF" })).toBeVisible();
  await expect(printPanel.getByRole("button", { name: "Browser print" })).toBeVisible();
  await expect(printPanel.locator(".proxy-card")).toHaveCount(43);
  await expect(printPanel.locator(".proxy-sheet-page")).toHaveCount(8);
  await expect(printPanel.getByLabel("V — StreetKid proxy")).toContainText("Red Legend");
  const longTitleProxy = printPanel.getByLabel("Dum Dum — Maelstrom Triggerman proxy").first();
  await expect(longTitleProxy).toContainText("Ability");
  const headerGap = await longTitleProxy.evaluate((proxy) => {
    const title = proxy.querySelector(".proxy-card-header h3")?.getBoundingClientRect();
    const header = proxy.querySelector(".proxy-card-header")?.getBoundingClientRect();
    if (!title || !header) return 0;
    return header.bottom - title.bottom;
  });
  expect(headerGap).toBeGreaterThan(4);
  await expect(printPanel.locator("img")).toHaveCount(0);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    printPanel.getByRole("button", { name: "Download 9-up PDF" }).click()
  ]);
  expect(download.suggestedFilename()).toBe("gigsmith-starter-legal-shell-proxies.pdf");
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  const document = await PDFDocument.load(await readFile(downloadPath!));
  expect(document.getPageCount()).toBe(5);
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

test("navigates Legend-first card details from the deck editor", async ({ page }) => {
  const details = page.getByRole("button", { name: "View details for V — StreetKid" });
  await details.click();
  const dialog = page.getByRole("dialog");
  await expect(page.getByRole("dialog", { name: "V — StreetKid" })).toBeVisible();
  await expect(dialog).toHaveAttribute("data-color", "red");
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.y).toBeGreaterThanOrEqual(8);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(viewport!.height - 8);
  await expect(page.getByText(/1 of \d+ in deck/)).toBeVisible();

  await page.getByRole("button", { name: "Next card: Dum Dum — Maelstrom Triggerman" }).click();
  await expect(page.getByRole("dialog", { name: "Dum Dum — Maelstrom Triggerman" })).toBeVisible();
  await expect(dialog).toHaveAttribute("data-color", "yellow");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Goro Takemura — Vengeful Bodyguard" })).toBeVisible();
  await expect(dialog).toHaveAttribute("data-color", "green");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("dialog", { name: "Swordwise Huscle" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: "Goro Takemura — Vengeful Bodyguard" })).toBeVisible();

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
  const exportField = page.getByLabel("JSON deck export");
  await expect(exportField).toHaveValue(/"schema": "gigsmith\.deck"/);

  await page.getByLabel("JSON deck import").fill("{}");
  await page.getByRole("button", { name: "Import JSON" }).click();
  await expect(page.getByRole("alert")).toContainText("Import failed");
  await expect(page.locator(".import-error")).toContainText("schema");

  const validExport = await exportField.inputValue();
  await page.getByLabel("JSON deck import").fill(validExport);
  await expect(page.locator(".import-error")).toHaveCount(0);
  await page.getByRole("button", { name: "Import JSON" }).click();
  await expect(page.getByRole("status")).toContainText("Imported Starter Legal Shell successfully");

  await page.getByRole("button", { name: "Copy share link" }).click();
  await expect(page.getByLabel("Deck share link")).toHaveValue(/#deck=/);
  await page.getByRole("tab", { name: "Deck" }).click();
  await page.getByLabel("Deck name", { exact: true }).fill("Fresh Share Deck");
  await page.getByRole("tab", { name: "Transfer" }).click();
  await expect(page.getByLabel("Deck share link")).toHaveCount(0);
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
  await page.getByRole("tab", { name: "Gigs" }).click();
  const odds = page.getByRole("region", { name: "Gig Odds & Color Goals" });
  await expect(odds).toContainText("same-value pair");
  await expect(odds.getByRole("heading", { name: "Your Next Fixer Die" })).toBeVisible();
  await expect(odds.locator(".next-die-options article")).toHaveCount(5);

  await odds.getByText("Deck demand and natural-order analysis").click();
  await expect(odds.locator(".die-order > span")).toHaveCount(6);
  await expect(odds.getByRole("row")).toHaveCount(7);

  await odds.getByRole("button", { name: "Roll and gain your d4" }).click();
  await expect(odds.locator(".next-die-options article")).toHaveCount(4);
  await expect(odds).toContainText(/Your Gig values: [1-4]/);
  await expect(page.getByRole("button", { name: "Rival", exact: true })).toBeDisabled();
  await expect(page.getByText(/[1-4] Street Cred · 5 in Fixer/)).toBeVisible();

  const gigRowsFitPools = await page.locator(".match-gig").evaluateAll((rows) =>
    rows.every((row) => {
      const pool = row.closest(".gig-pool");
      if (!pool) return false;
      const rowBox = row.getBoundingClientRect();
      const poolBox = pool.getBoundingClientRect();
      return (
        rowBox.left >= poolBox.left - 0.5 &&
        rowBox.right <= poolBox.right + 0.5 &&
        row.scrollWidth <= row.clientWidth
      );
    })
  );
  expect(gigRowsFitPools).toBe(true);

  await page.getByRole("button", { name: "End turn" }).click();
  await expect(odds.getByRole("heading", { name: "Your Next Fixer Die" })).toBeVisible();
  await expect(odds).toContainText(/Your Gig values: [1-4]/);
  await expect(odds).not.toContainText("Rival Next Fixer Die");
  await expect(odds).not.toContainText(/Rival Gig values: [1-9]/);
  await expect(odds.getByRole("button", { name: "Roll and gain your d6" })).toBeDisabled();

  await page.getByRole("button", { name: "Roll and gain Rival d4" }).click();
  await expect(odds).toContainText(/Your Gig values: [1-4]/);
  await expect(odds).not.toContainText(/Rival Gig values: [1-9]/);
});

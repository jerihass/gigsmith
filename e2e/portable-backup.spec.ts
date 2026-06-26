import { expect, test } from "@playwright/test";

const backup = {
  schema: "gigsmith.backup",
  version: 1,
  exportedAt: "2026-06-26T12:00:00.000Z",
  library: {
    version: 1,
    activeDeckId: "restored-deck",
    decks: [{
      id: "restored-deck",
      name: "Restored Backup Deck",
      legends: [],
      main: [],
      formatId: "open-guide",
      rulesetVersion: "ruleset.v1-printable-2026-06-19",
      cardDataVersion: "netdeck-cyberpunk-2026-06-20",
      metadata: { createdAt: "2026-06-26T12:00:00.000Z", updatedAt: "2026-06-26T12:00:00.000Z" }
    }]
  },
  preferences: { theme: "light", cardArtEnabled: true, activeView: "deck" }
};

test("validates and restores a portable backup across a reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Transfer" }).click();
  await page.getByLabel("Backup file").setInputFiles({
    name: "gigsmith-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup))
  });

  await expect(page.getByText(/1 deck from/)).toBeVisible();
  await page.getByRole("button", { name: "Confirm restore" }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("Restored Backup Deck");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("status")).toContainText("Restored 1 deck");

  await page.reload();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("Restored Backup Deck");
  await expect(page.getByLabel("External art")).toBeChecked();
});

test("merges backup decks without overwriting the active device deck", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Deck name", { exact: true }).fill("Current Device Deck");
  await page.getByRole("tab", { name: "Transfer" }).click();
  await page.getByLabel("Backup file").setInputFiles({
    name: "gigsmith-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup))
  });

  await page.getByLabel("Add backup decks only").check();
  await page.getByRole("button", { name: "Confirm restore" }).click();
  await page.getByRole("tab", { name: "Deck" }).click();
  await expect(page.getByLabel("Deck name", { exact: true })).toHaveValue("Current Device Deck");
  await expect(page.getByLabel("Active deck")).toContainText("Current Device Deck");
  await expect(page.locator(".deck-picker select option")).toHaveCount(2);
});

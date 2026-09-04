import { expect, test } from "@playwright/test";

test.skip(({ isMobile }) => !isMobile, "Mobile deck dock coverage");

test("keeps a compact deck summary attached to the viewport while scrolling", async ({ page }) => {
  await page.goto("/");

  const dock = page.getByRole("navigation", { name: "Mobile deck builder shortcuts" });
  await expect(dock).toBeVisible();

  const deckButton = dock.getByRole("button", { name: "Deck", exact: true });
  await deckButton.click();
  const drawer = page.getByRole("dialog", { name: "Current deck" });
  await expect(drawer).toBeVisible();
  await expect(drawer).toHaveJSProperty("tagName", "DIALOG");
  await expect(drawer.getByRole("button", { name: "Close current deck" })).toBeFocused();
  await expect(drawer.getByRole("heading", { name: "Deck health" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await expect(deckButton).toBeFocused();

  const dockLayout = async () => dock.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottomGap: Math.abs(window.innerHeight - bounds.bottom),
      height: bounds.height,
      parentIsBody: element.parentElement === document.body,
      position: getComputedStyle(element).position
    };
  });

  await expect.poll(dockLayout).toMatchObject({ bottomGap: 0, parentIsBody: true, position: "fixed" });
  expect((await dockLayout()).height).toBeLessThanOrEqual(96);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(dockLayout).toMatchObject({ bottomGap: 0, parentIsBody: true, position: "fixed" });

  await page.evaluate(() => window.scrollBy(0, -Math.min(900, window.scrollY)));
  await expect.poll(dockLayout).toMatchObject({ bottomGap: 0, parentIsBody: true, position: "fixed" });

  await page.getByRole("tab", { name: "Cards", exact: true }).click();
  await expect(dock.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  await dock.getByRole("button", { name: "Search", exact: true }).click();
  const search = page.getByRole("search", { name: "Card search" }).getByRole("searchbox", { name: "Search cards" });
  await expect(search).toBeFocused();
  const searchClearsDock = await page.evaluate(() => {
    const searchBar = document.querySelector(".mobile-card-search-bar");
    const mobileDock = document.querySelector(".mobile-deck-dock");
    if (!searchBar || !mobileDock) return false;
    return searchBar.getBoundingClientRect().bottom <= mobileDock.getBoundingClientRect().top + 1;
  });
  expect(searchClearsDock).toBe(true);

  await page.getByRole("tab", { name: "Analysis" }).click();
  await expect(dock).toHaveCount(0);

  await page.evaluate(() => localStorage.setItem("gigsmith.active-view.v1", "transfer"));
  await page.reload();
  const navigation = page.getByRole("navigation", { name: "Gigsmith tools" });
  const transferTab = page.getByRole("tab", { name: "Transfer", exact: true });
  await expect(transferTab).toHaveAttribute("aria-selected", "true");
  await expect.poll(async () => {
    const navigationBounds = await navigation.boundingBox();
    const tabBounds = await transferTab.boundingBox();
    if (!navigationBounds || !tabBounds) return false;
    return tabBounds.x >= navigationBounds.x && tabBounds.x + tabBounds.width <= navigationBounds.x + navigationBounds.width;
  }).toBe(true);
});

test("keeps the 320px card browser usable without overlap or undersized actions", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");

  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute("content", /viewport-fit=cover/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

  const dock = page.getByRole("navigation", { name: "Mobile deck builder shortcuts" });
  await expect(dock).toBeVisible();
  expect((await dock.boundingBox())?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(96);

  await page.getByRole("tab", { name: "Cards", exact: true }).click();
  const filterButton = page.getByRole("search", { name: "Card search" }).getByRole("button", { name: /^Filters/ });
  await filterButton.click();

  const filters = page.getByRole("dialog", { name: "Filters" });
  await expect(filters).toBeVisible();
  await expect(filters).toHaveJSProperty("tagName", "DIALOG");
  await expect(filters.getByRole("button", { name: "Close card filters" })).toBeFocused();
  await filters.getByRole("combobox", { name: "Color", exact: true }).selectOption("Red");
  await filters.getByRole("button", { name: /^Show \d+ cards$/ }).click();
  await expect(filters).toBeHidden();
  await expect(filterButton).toBeFocused();

  const firstCardAction = page.locator(".card-database-panel .card-action-group button:visible").first();
  await expect(firstCardAction).toBeVisible();
  expect((await firstCardAction.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

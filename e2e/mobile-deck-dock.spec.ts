import { expect, test } from "@playwright/test";

test.skip(({ isMobile }) => !isMobile, "Mobile deck dock coverage");

test("keeps the deck summary attached to the viewport while scrolling", async ({ page }) => {
  await page.goto("/");

  const dock = page.getByRole("navigation", { name: "Mobile deck builder shortcuts" });
  await expect(dock).toBeVisible();

  await dock.getByRole("button", { name: "Deck", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: "Current deck" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("button", { name: "Close current deck" }).click();
  await expect(drawer).toHaveCount(0);

  const dockLayout = async () => dock.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      bottomGap: Math.abs(window.innerHeight - bounds.bottom),
      parentIsBody: element.parentElement === document.body,
      position: getComputedStyle(element).position
    };
  });

  await expect.poll(dockLayout).toMatchObject({ bottomGap: 0, parentIsBody: true, position: "fixed" });

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect.poll(dockLayout).toMatchObject({ bottomGap: 0, parentIsBody: true, position: "fixed" });

  await page.evaluate(() => window.scrollBy(0, -Math.min(900, window.scrollY)));
  await expect.poll(dockLayout).toMatchObject({ bottomGap: 0, parentIsBody: true, position: "fixed" });

  await page.getByRole("tab", { name: "Analysis" }).click();
  await expect(dock).toHaveCount(0);
});

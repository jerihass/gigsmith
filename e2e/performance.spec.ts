import { expect, test, type Page } from "@playwright/test";
import budgets from "../apps/web/performance-budgets.json" with { type: "json" };

async function pageTime(page: Page): Promise<number> {
  return page.evaluate(() => performance.now());
}

test("keeps core phone workflows within measured response budgets", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: budgets.interactions.cpuThrottleRate });

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Gigsmith" })).toBeVisible();
    const initialRenderMs = await pageTime(page);

    const search = page.getByRole("textbox", { name: "Search", exact: true });
    let startedAt = await pageTime(page);
    await search.fill("Chrome Reverie");
    const filteredCard = page.getByRole("article").filter({ hasText: "Chrome Reverie" });
    await expect(filteredCard).toHaveCount(1);
    const filterResponseMs = await pageTime(page) - startedAt;

    startedAt = await pageTime(page);
    await filteredCard.getByRole("button", { name: "+ Main", exact: true }).click();
    await expect(page.getByText("41 / 40-50", { exact: true })).toBeVisible();
    const deckEditResponseMs = await pageTime(page) - startedAt;

    await page.getByRole("tab", { name: "Analysis", exact: true }).click();
    const comparison = page.getByRole("region", { name: "Mulligan Comparison" });
    const capacity = comparison.getByRole("row", { name: /Gross capacity/ }).getByRole("cell").nth(0);
    const firstPlayerCapacity = await capacity.textContent();
    startedAt = await pageTime(page);
    await comparison.getByRole("button", { name: "Going second", exact: true }).click();
    await expect(capacity).not.toHaveText(firstPlayerCapacity ?? "");
    const analysisRecalculationMs = await pageTime(page) - startedAt;

    const results = {
      cpuThrottleRate: budgets.interactions.cpuThrottleRate,
      initialRenderMs: Math.round(initialRenderMs),
      filterResponseMs: Math.round(filterResponseMs),
      deckEditResponseMs: Math.round(deckEditResponseMs),
      analysisRecalculationMs: Math.round(analysisRecalculationMs)
    };
    console.log(`[performance] ${JSON.stringify(results)}`);

    expect(results.initialRenderMs, "initial render").toBeLessThanOrEqual(budgets.interactions.initialRenderMs);
    expect(results.filterResponseMs, "card filter response").toBeLessThanOrEqual(budgets.interactions.filterResponseMs);
    expect(results.deckEditResponseMs, "deck edit response").toBeLessThanOrEqual(budgets.interactions.deckEditResponseMs);
    expect(results.analysisRecalculationMs, "analysis recalculation").toBeLessThanOrEqual(budgets.interactions.analysisRecalculationMs);
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
});

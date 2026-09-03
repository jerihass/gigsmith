import { expect, test, type Page } from "@playwright/test";
import budgets from "../apps/web/performance-budgets.json" with { type: "json" };

async function pageTime(page: Page): Promise<number> {
  return page.evaluate(() => performance.now());
}

test("keeps core phone workflows within measured response budgets", async ({ page, context }) => {
  const appTimings: unknown[] = [];
  page.on("console", (message) => {
    const text = message.text();
    const prefix = "[gigsmith:performance] ";
    if (!text.startsWith(prefix)) return;
    try {
      appTimings.push(JSON.parse(text.slice(prefix.length)) as unknown);
    } catch {
      appTimings.push({ malformed: text });
    }
  });
  await context.addInitScript(() => {
    (window as Window & { __GIGSMITH_PERF__?: boolean }).__GIGSMITH_PERF__ = true;
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: budgets.interactions.cpuThrottleRate });

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Gigsmith" })).toBeVisible();
    const initialRenderMs = await pageTime(page);

    await page.getByRole("tab", { name: "Cards", exact: true }).click();
    const search = page
      .getByRole("search", { name: "Card search" })
      .getByRole("textbox", { name: "Search cards" });
    let startedAt = await pageTime(page);
    await search.fill("Chrome Reverie");
    const filteredCard = page.getByRole("article").filter({ hasText: "Chrome Reverie" });
    await expect(filteredCard).toHaveCount(1);
    const filterResponseMs = await pageTime(page) - startedAt;

    startedAt = await pageTime(page);
    await filteredCard.getByRole("button", { name: "+ Main", exact: true }).click();
    await expect(page.getByLabel("Active deck summary").getByText("41 / 40-50", { exact: true })).toBeVisible();
    const deckEditResponseMs = await pageTime(page) - startedAt;

    await page.getByRole("tab", { name: "Analysis", exact: true }).click();
    const comparison = page.getByRole("region", { name: "Mulligan Comparison" });
    const capacity = comparison.getByRole("row", { name: /First-turn capacity/ }).getByRole("cell").nth(0);
    const firstPlayerCapacity = await capacity.textContent();
    startedAt = await pageTime(page);
    await comparison.getByRole("button", { name: "Going second", exact: true }).click();
    await expect(capacity).not.toHaveText(firstPlayerCapacity ?? "");
    const analysisRecalculationMs = await pageTime(page) - startedAt;

    await page.getByRole("tab", { name: "Gigs", exact: true }).click();
    const odds = page.getByRole("region", { name: "Gig Odds & Color Goals" });
    startedAt = await pageTime(page);
    await odds.getByRole("button", { name: "Roll and gain your d4" }).click();
    await expect(odds).toContainText(/Your Gig values: [1-4]/);
    const gigRollResponseMs = await pageTime(page) - startedAt;

    const results = {
      cpuThrottleRate: budgets.interactions.cpuThrottleRate,
      initialRenderMs: Math.round(initialRenderMs),
      filterResponseMs: Math.round(filterResponseMs),
      deckEditResponseMs: Math.round(deckEditResponseMs),
      analysisRecalculationMs: Math.round(analysisRecalculationMs),
      gigRollResponseMs: Math.round(gigRollResponseMs),
      appTimings: appTimings.slice(-12)
    };
    console.log(`[performance] ${JSON.stringify(results)}`);

    expect(results.initialRenderMs, "initial render").toBeLessThanOrEqual(budgets.interactions.initialRenderMs);
    expect(results.filterResponseMs, "card filter response").toBeLessThanOrEqual(budgets.interactions.filterResponseMs);
    expect(results.deckEditResponseMs, "deck edit response").toBeLessThanOrEqual(budgets.interactions.deckEditResponseMs);
    expect(results.analysisRecalculationMs, "analysis recalculation").toBeLessThanOrEqual(budgets.interactions.analysisRecalculationMs);
    expect(results.gigRollResponseMs, "Gig roll response").toBeLessThanOrEqual(budgets.interactions.gigRollResponseMs);
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }
});

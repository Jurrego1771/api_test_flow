// tests/embed/watch.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Watch - Resolución unificada Live/VOD", () => {

  test("EMB-44: Resolución live por schedule_job", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.scheduleJobLiveId, "Se requiere EMBED_SCHEDULE_JOB_LIVE_ID configurado");

    const url = embedUrl.watch(embedConfig.scheduleJobLiveId);
    await page.goto(url, { waitUntil: "networkidle" });

    const playerContainer = page.locator('[class*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });
  });

  test("EMB-45: Resolución VOD por schedule_job", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.scheduleJobVodId, "Se requiere EMBED_SCHEDULE_JOB_VOD_ID configurado");

    const url = embedUrl.watch(embedConfig.scheduleJobVodId);
    await page.goto(url, { waitUntil: "networkidle" });

    const playerContainer = page.locator('[class*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });
  });
});

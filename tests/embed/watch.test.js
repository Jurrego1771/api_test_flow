// tests/embed/watch.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Watch - Resolución unificada Live/VOD", () => {

  test("TC_EMB_GET_watch_resolve_live_schedule", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.scheduleJobLiveId, "Se requiere EMBED_SCHEDULE_JOB_LIVE_ID configurado");

    const url = embedUrl.watch(embedConfig.scheduleJobLiveId);
    await page.goto(url, { waitUntil: "networkidle" });

    const playerContainer = page.locator('[class*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });
  });

  test("TC_EMB_GET_watch_resolve_vod_schedule", async ({ page, embedUrl, embedConfig }) => {
    test.skip(!embedConfig.scheduleJobVodId, "Se requiere EMBED_SCHEDULE_JOB_VOD_ID configurado");

    const url = embedUrl.watch(embedConfig.scheduleJobVodId);
    await page.goto(url, { waitUntil: "networkidle" });

    const playerContainer = page.locator('[class*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });
  });
});

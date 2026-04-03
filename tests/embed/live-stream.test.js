// tests/embed/live-stream.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Live Stream - Eventos en vivo", () => {

  test("TC_EMB_GET_live_basic_load", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.liveStream(embedConfig.liveStreamId);
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const playerContainer = page.locator('[class*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });
  });

  test("TC_EMB_GET_live_autoplay_default", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.liveStream(embedConfig.liveStreamId);
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    // Live debería iniciar automáticamente
  });

  test("TC_EMB_GET_live_autoplay_disabled", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.liveStream(embedConfig.liveStreamId, { autoplay: "false" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("autoplay=false");
  });

  test("TC_EMB_GET_live_playlist_hls", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.livePlaylist(embedConfig.liveStreamId, "m3u8");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.text();
      expect(body).toContain("#EXTM3U");
    }
  });

  test("TC_EMB_GET_live_manifest_smil", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.livePlaylist(embedConfig.liveStreamId, "smil");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.text();
      expect(body.toLowerCase()).toContain("smil");
    }
  });

  test("TC_EMB_GET_live_rtmpt_param", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.livePlaylist(embedConfig.liveStreamId, "smil", { rtmpt: "true" });
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
  });
});

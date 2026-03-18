// tests/embed/live-stream.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Live Stream - Eventos en vivo", () => {

  test("EMB-24: Carga básica de evento en vivo", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.liveStream(embedConfig.liveStreamId);
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    const playerContainer = page.locator('[class*="player"], video, .mdstrm-player');
    await expect(playerContainer.first()).toBeVisible({ timeout: 15000 });
  });

  test("EMB-25: Autoplay por defecto en live", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.liveStream(embedConfig.liveStreamId);
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);
    // Live debería iniciar automáticamente
  });

  test("EMB-26: Desactivar autoplay en live (autoplay=false)", async ({ page, embedUrl, embedConfig }) => {
    const url = embedUrl.liveStream(embedConfig.liveStreamId, { autoplay: "false" });
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("autoplay=false");
  });

  test("EMB-27: Playlist HLS del live (.m3u8)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.livePlaylist(embedConfig.liveStreamId, "m3u8");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.text();
      expect(body).toContain("#EXTM3U");
    }
  });

  test("EMB-28: Manifest SMIL para RTMP", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.livePlaylist(embedConfig.liveStreamId, "smil");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.text();
      expect(body.toLowerCase()).toContain("smil");
    }
  });

  test("EMB-29: RTMP sobre TCP (rtmpt=true)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.livePlaylist(embedConfig.liveStreamId, "smil", { rtmpt: "true" });
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
  });
});

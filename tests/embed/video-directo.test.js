// tests/embed/video-directo.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Video Directo - Streams HLS/DASH/MP4", () => {

  test("EMB-19: Perfil de calidad máximo (profile=max)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.video(embedConfig.mediaId, "m3u8", { profile: "max" });
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302]).toContain(response.status());
  });

  test("EMB-20: Perfil de calidad mínimo (profile=min)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.video(embedConfig.mediaId, "m3u8", { profile: "min" });
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302]).toContain(response.status());
  });

  test("EMB-21: Stream HLS (m3u8)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.video(embedConfig.mediaId, "m3u8");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302]).toContain(response.status());
    if (response.status() === 200) {
      const body = await response.text();
      expect(body).toContain("#EXTM3U");
    }
  });

  test("EMB-22: Stream DASH (mpd)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.video(embedConfig.mediaId, "mpd");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
  });

  test("EMB-23: Archivo MP4 directo", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.video(embedConfig.mediaId, "mp4");
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404]).toContain(response.status());
  });
});

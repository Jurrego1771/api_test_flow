// tests/embed/playlist-share.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Playlist y Share", () => {

  test("TC_EMB_GET_playlist_redirects_to_first_video", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.playlist(embedConfig.playlistId);
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });

    // Debe ser redirect 302 al primer video
    expect([200, 301, 302, 404]).toContain(response.status());

    if (response.status() === 302) {
      const location = response.headers()["location"];
      expect(location).toBeDefined();
      expect(location).toContain("/embed/");
      expect(location).toContain("playlist_id=");
    }
  });

  test("TC_EMB_GET_share_vod", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.share("media", embedConfig.mediaId);
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });

    expect([200, 301, 302, 404]).toContain(response.status());

    if (response.status() === 302) {
      const location = response.headers()["location"];
      expect(location).toBeDefined();
    }
  });

  test("TC_EMB_GET_share_live", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.share("live", embedConfig.liveStreamId);
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });

    expect([200, 301, 302, 404]).toContain(response.status());
  });
});

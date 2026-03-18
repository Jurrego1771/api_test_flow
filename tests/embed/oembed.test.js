// tests/embed/oembed.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("OEmbed - Metadata", () => {

  test("EMB-41: Metadata en JSON", async ({ embedRequest, embedUrl, embedConfig }) => {
    const embedVideoUrl = embedUrl.vod(embedConfig.mediaId);
    const url = embedUrl.oembed(embedVideoUrl, { format: "json" });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
      expect(body).toHaveProperty("type");
      expect(body).toHaveProperty("version");
      if (body.html) expect(typeof body.html).toBe("string");
      if (body.width) expect(typeof body.width).toBe("number");
      if (body.height) expect(typeof body.height).toBe("number");
    }
  });

  test("EMB-42: Metadata en XML", async ({ embedRequest, embedUrl, embedConfig }) => {
    const embedVideoUrl = embedUrl.vod(embedConfig.mediaId);
    const url = embedUrl.oembed(embedVideoUrl, { format: "xml" });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.text();
      expect(body).toContain("<?xml");
      expect(body.toLowerCase()).toContain("oembed");
    }
  });

  test("EMB-43: Dimensiones maxwidth/maxheight", async ({ embedRequest, embedUrl, embedConfig }) => {
    const embedVideoUrl = embedUrl.vod(embedConfig.mediaId);
    const url = embedUrl.oembed(embedVideoUrl, {
      format: "json",
      maxwidth: 400,
      maxheight: 300,
    });

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
      if (body.width) expect(body.width).toBeLessThanOrEqual(400);
      if (body.height) expect(body.height).toBeLessThanOrEqual(300);
    }
  });
});

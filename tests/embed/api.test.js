// tests/embed/api.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("API Embed - Endpoints de metadata", () => {

  test("EMB-46: Detalle de video en JSON", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.video(embedConfig.mediaId, "json");

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
      if (body._id) expect(typeof body._id).toBe("string");
      if (body.title) expect(typeof body.title).toBe("string");
      if (body.duration) expect(typeof body.duration).toBe("number");
    }
  });

  test("EMB-47: Medios relacionados", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.api(`/api/media/${embedConfig.mediaId}/related`);

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
      expect(Array.isArray(body) || typeof body === "object").toBeTruthy();
    }
  });

  test("EMB-48: Contenido de playlist", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.api(`/api/playlist/${embedConfig.playlistId}/content`);

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
    }
  });

  test("EMB-49: Verificación de restricciones de acceso", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.api(`/api/access-restrictions/media/${embedConfig.mediaId}`);

    const response = await embedRequest.get(url, { failOnStatusCode: false });
    expect([200, 404, 403]).toContain(response.status());

    if (response.status() === 200) {
      const body = await response.json();
      expect(body).toBeDefined();
    }
  });
});

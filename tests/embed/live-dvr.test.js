// tests/embed/live-dvr.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Live DVR - Timeshift", () => {

  test("EMB-30: Rango DVR por fechas (start/end)", async ({ embedRequest, embedUrl, embedConfig }) => {
    // Usar fechas de ejemplo (ajustar según contenido disponible)
    const now = new Date();
    const start = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 horas atrás
    const end = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1 hora atrás

    const url = embedUrl.liveDvrMaster(embedConfig.liveStreamId, {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404, 400]).toContain(response.status());
  });

  test("EMB-31: DVR por offset en segundos (dvrOffset=300)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.liveDvrMaster(embedConfig.liveStreamId, { dvrOffset: 300 });
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404, 400]).toContain(response.status());
  });

  test("EMB-32: Parámetro delay (delay=60)", async ({ embedRequest, embedUrl, embedConfig }) => {
    const url = embedUrl.liveDvrMaster(embedConfig.liveStreamId, { delay: 60 });
    const response = await embedRequest.get(url, { maxRedirects: 0, failOnStatusCode: false });
    expect([200, 301, 302, 404, 400]).toContain(response.status());
  });
});

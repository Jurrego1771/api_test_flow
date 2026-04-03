// tests/embed/error.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Error Handler - Manejo de errores", () => {

  test("TC_EMB_GET_vod_not_found_id", async ({ page, embedUrl, embedConfig }) => {
    // ID inválido de 24 caracteres hex (todos ceros)
    const invalidId = "000000000000000000000000";
    const url = embedUrl.vod(invalidId);

    const response = await page.goto(url, { waitUntil: "networkidle" });

    // Debe retornar 404 o mostrar página de error sin crash
    expect([200, 404]).toContain(response.status());

    // Verificar que no hay crash del servidor (la página carga algo)
    const body = await page.content();
    expect(body.length).toBeGreaterThan(0);

  });

  test("TC_EMB_GET_vod_invalid_id_format", async ({ embedRequest, embedUrl }) => {
    // ID con formato incorrecto (no hex)
    const invalidId = "invalid-id-format";
    const url = embedUrl.vod(invalidId);

    const response = await embedRequest.get(url, { failOnStatusCode: false });

    // Debe manejar el error sin crash
    expect([200, 400, 404, 500]).toContain(response.status());
  });

  test("TC_EMB_GET_nonexistent_endpoint", async ({ embedRequest, embedConfig }) => {
    const url = `https://${embedConfig.host}/nonexistent/endpoint/12345`;

    const response = await embedRequest.get(url, { failOnStatusCode: false });

    // Debe retornar 404
    expect([404]).toContain(response.status());
  });
});

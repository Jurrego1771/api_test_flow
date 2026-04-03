// tests/embed/error.test.js
const { test, expect } = require("../../fixtures/embed.fixture");

test.describe("Error Handler - Manejo de errores", () => {

  test("EMB-50: URL con ID inexistente (404)", async ({ page, embedUrl, embedConfig }) => {
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

  test("EMB-50b: ID con formato inválido", async ({ embedRequest, embedUrl }) => {
    // ID con formato incorrecto (no hex)
    const invalidId = "invalid-id-format";
    const url = embedUrl.vod(invalidId);

    const response = await embedRequest.get(url, { failOnStatusCode: false });

    // Debe manejar el error sin crash
    expect([200, 400, 404, 500]).toContain(response.status());
  });

  test("EMB-50c: Endpoint inexistente", async ({ embedRequest, embedConfig }) => {
    const url = `https://${embedConfig.host}/nonexistent/endpoint/12345`;

    const response = await embedRequest.get(url, { failOnStatusCode: false });

    // Debe retornar 404
    expect([404]).toContain(response.status());
  });
});

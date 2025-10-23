const { test, expect } = require("../../fixtures/authRequest.fixture");
const logger = require("../utils/logger");

test.describe("Búsqueda de cupones", () => {
  test("GET /api/coupon - Verificar respuesta básica", async ({
    authRequest,
  }) => {
    const response = await authRequest.get("/api/coupon");
    const body = await response.json();

    logger.info(`📡 GET /api/coupon - Status: ${response.status()}`);

    expect(response.status()).toBe(200);
    expect(body.status).toBe("OK");
  });
});

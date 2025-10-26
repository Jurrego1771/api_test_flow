const { test, expect } = require("../../fixtures/ad.fixture");
const { logApiResult } = require("../utils/logger");

test.describe("💵 Ad - GET )", () => {
  test("Obtener Ad por ID (200)", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_get_${Date.now()}`,
      type: "vast",
      is_enabled: "false",
    });

    const endpoint = `/api/ad/${ad._id}`;
    const t0 = Date.now();
    const res = await authRequest.get(endpoint);
    const body = await res.json();
    logApiResult("GET", endpoint, res.status(), Date.now() - t0, body);

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
    expect(body.data._id).toBe(ad._id);
  });

  test("ID inexistente devuelve 404", async ({ authRequest }) => {
    const nonExistingId = "5ee2704ea666e81cf291a085";
    const endpoint = `/api/ad/${nonExistingId}`;
    const t0 = Date.now();
    const res = await authRequest.get(endpoint);
    const body = await res.json();
    logApiResult("GET", endpoint, res.status(), Date.now() - t0, body);

    expect(res.status()).toBe(404);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });
});

const { test, expect } = require("../../fixtures/ad.fixture");
const { getAdResponseSchema } = require("../../schemas/ad.schema");

test.describe("Ad API — GET", () => {
  test("TC_AD_002_GET_AdById_Success", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_get_${Date.now()}`,
      type: "vast",
      is_enabled: "false",
    });

    const res = await authRequest.get(`/api/ad/${ad._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data._id).toBe(ad._id);

    // Validación estructural con Zod
    getAdResponseSchema.parse(body);
  });

  test("TC_AD_003_GET_AdById_NotFound", async ({ authRequest }) => {
    const nonExistingId = "5ee2704ea666e81cf291a085";
    const res = await authRequest.get(`/api/ad/${nonExistingId}`);
    const body = await res.json();

    expect(res.status()).toBe(404);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });
});

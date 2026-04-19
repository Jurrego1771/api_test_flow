const { test, expect } = require("../../fixtures/ad.fixture");
const { getAdResponseSchema } = require("../../schemas/ad.schema");

test.describe("Ad API — GET", () => {
  test("TC_AD_GET_ad_by_id", async ({ createAd, authRequest }) => {
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

  test("TC_AD_GET_ad_not_found", async ({ authRequest }) => {
    const nonExistingId = "5ee2704ea666e81cf291a085";
    const res = await authRequest.get(`/api/ad/${nonExistingId}`);
    const body = await res.json();

    expect(res.status()).toBe(404);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });
});

test.describe("Auth — Sin token / Token inválido", () => {
  test("TC_AD_GET_list_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get("/api/ad");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_AD_GET_list_invalid_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.get("/api/ad");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

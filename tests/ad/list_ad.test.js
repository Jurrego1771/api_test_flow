const { test, expect } = require("../../fixtures/ad.fixture");
const { listAdResponseSchema } = require("../../schemas/ad.schema");

test.describe("Ad API — List & Search (GET /api/ad)", () => {
  test("TC_AD_GET_list_default", async ({ authRequest }) => {
    const res = await authRequest.get("/api/ad");
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    listAdResponseSchema.parse(body);
  });

  test("TC_AD_GET_list_pagination", async ({ authRequest }) => {
    const res = await authRequest.get("/api/ad?limit=2&skip=0");
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeLessThanOrEqual(2);
    listAdResponseSchema.parse(body);
  });

  test("TC_AD_GET_search_by_name", async ({ createAd, authRequest }) => {
    const uniqueName = `qa_search_${Date.now()}`;
    await createAd({ name: uniqueName });

    const res = await authRequest.get(`/api/ad/search?name=${uniqueName}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.some((ad) => ad.name === uniqueName)).toBe(true);
  });

  test("TC_AD_GET_search_by_id", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({ name: `qa_search_id_${Date.now()}` });

    const res = await authRequest.get(`/api/ad/search?id=${ad._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.some((a) => a._id === ad._id)).toBe(true);
  });
});

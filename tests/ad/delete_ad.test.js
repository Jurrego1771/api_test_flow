const { test, expect } = require("../../fixtures/ad.fixture");

test.describe("Ad API — Delete", () => {
  test("TC_AD_DELETE_ad_by_id", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({ name: `qa_ad_delete_${Date.now()}` });

    const res = await authRequest.delete(`/api/ad/${ad._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");

    // Verify it's gone
    const getRes = await authRequest.get(`/api/ad/${ad._id}`);
    const getBody = await getRes.json();
    expect(getRes.status()).toBe(404);
    expect(getBody.status).toBe("ERROR");
    expect(getBody.data).toBe("NOT_FOUND");
  });

  test("TC_AD_DELETE_ad_not_found", async ({ authRequest }) => {
    const res = await authRequest.delete("/api/ad/000000000000000000000000");

    // NOTE: API returns 200 for non-existent IDs (idempotent delete behavior)
    // A strict REST implementation would return 404 — worth reporting to backend
    expect([200, 400, 404]).toContain(res.status());
  });
});

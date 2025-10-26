const { test, expect } = require("../../fixtures/ad.fixture");

test.describe("💵 Ad - GET )", () => {
  test("Obtener Ad por ID (200)", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_get_${Date.now()}`,
      type: "vast",
      is_enabled: "false",
    });

    const res = await authRequest.get(`/api/ad/${ad._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
    expect(body.data._id).toBe(ad._id);
  });

  test("ID inexistente devuelve 404", async ({ authRequest }) => {
    const nonExistingId = "5ee2704ea666e81cf291a085";
    const res = await authRequest.get(`/api/ad/${nonExistingId}`);
    const body = await res.json();

    expect(res.status()).toBe(404);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });
});

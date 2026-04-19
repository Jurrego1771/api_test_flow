const { test, expect } = require("../../fixtures/ad.fixture");
const { getAdResponseSchema } = require("../../schemas/ad.schema");

test.describe("Ad API — Update", () => {
  test("TC_AD_POST_update_ad_valid", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_update_${Date.now()}`,
      type: "vast",
      is_enabled: "false",
      preroll_skip_at: 0,
      min_media_time_length: 0,
    });

    const updatePayload = {
      name: `${ad.name}_updated`,
      is_enabled: "true",
      preroll_skip_at: 5,
      min_media_time_length: 0,
    };

    const res = await authRequest.post(`/api/ad/${ad._id}`, {
      form: updatePayload,
    });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data._id).toBe(ad._id);
    expect(body.data.name).toBe(updatePayload.name);
    expect(body.data.is_enabled).toBeTruthy();
    expect(body.data.preroll_skip_at).toBe(updatePayload.preroll_skip_at);
    expect(body.data.min_media_time_length).toBe(updatePayload.min_media_time_length);

    // Validación estructural con Zod
    getAdResponseSchema.parse(body);
  });

  test("TC_AD_POST_update_ad_neg_min_length", async ({
    createAd,
    authRequest,
  }) => {
    const { ad } = await createAd({ name: `qa_ad_update_${Date.now()}` });

    const res = await authRequest.post(`/api/ad/${ad._id}`, {
      form: { min_media_time_length: -1 },
    });
    const body = await res.json();

    if (res.status() === 400) {
      expect(body.status).toBe("ERROR");
      expect(body.data).toMatchObject({ code: "AD_BAD_MIN_MEDIA_TIME" });
    } else {
      expect(res.status()).toBe(200);
      expect(body.status).toBe("OK");
      expect(body.data.min_media_time_length).toBeGreaterThanOrEqual(0);
    }
  });

  test("TC_AD_POST_update_ad_not_found", async ({ authRequest }) => {
    const nonExistingId = "5ee2704ea666e81cf291a085";
    const res = await authRequest.post(`/api/ad/${nonExistingId}`, {
      form: { name: "should_not_exist" },
    });
    const body = await res.json();

    expect(res.status()).toBe(404);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });

  test("TC_AD_GET_update_persist_fields", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_persist_${Date.now()}`,
      type: "vast",
      is_enabled: "false",
      preroll_skip_at: 0,
      min_media_time_length: 0,
    });

    const updatePayload = {
      name: `qa_ad_persist_updated_${Date.now()}`,
      is_enabled: "true",
      preroll_skip_at: 10,
    };

    const updRes = await authRequest.post(`/api/ad/${ad._id}`, { form: updatePayload });
    expect(updRes.status()).toBe(200);

    const getRes = await authRequest.get(`/api/ad/${ad._id}`);
    const body = await getRes.json();

    expect(getRes.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.name).toBe(updatePayload.name);
    expect(body.data.is_enabled).toBeTruthy();
    expect(body.data.preroll_skip_at).toBe(updatePayload.preroll_skip_at);
  });

  test("TC_AD_POST_update_clear_tags", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_clear_tags_${Date.now()}`,
      type: "vast",
      tags: ["qa_tag_1", "qa_tag_2"],
    });

    await authRequest.post(`/api/ad/${ad._id}`, { form: { tags: [] } });

    const res = await authRequest.get(`/api/ad/${ad._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    const tags = body.data.tags ?? [];
    expect(tags).toHaveLength(0);
  });

  test("TC_AD_POST_update_clear_categories", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({
      name: `qa_ad_clear_cats_${Date.now()}`,
      type: "vast",
    });

    await authRequest.post(`/api/ad/${ad._id}`, { form: { categories: [] } });

    const res = await authRequest.get(`/api/ad/${ad._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    const categories = body.data.categories ?? [];
    expect(categories).toHaveLength(0);
  });
});

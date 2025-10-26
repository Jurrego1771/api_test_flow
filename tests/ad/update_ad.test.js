const { test, expect } = require("../../fixtures/ad.fixture");

// Se usa createAd para crear un Ad inicial y luego se actualiza por ID

test.describe("💵 Ad - Update )", () => {
  test("Actualizar Ad existente (200)", async ({ createAd, authRequest }) => {
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

    const res = await authRequest.post(`/api/ad/${ad._id}`, { form: updatePayload });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data._id).toBe(ad._id);
    expect(body.data.name).toBe(updatePayload.name);
    expect(body.data.is_enabled).toBeTruthy();
    expect(body.data.preroll_skip_at).toBe(updatePayload.preroll_skip_at);
    expect(body.data.min_media_time_length).toBe(updatePayload.min_media_time_length);
  });

  test("min_media_time_length inválido devuelve 400", async ({ createAd, authRequest }) => {
    const { ad } = await createAd({ name: `qa_ad_update_${Date.now()}` });

    const badPayload = { min_media_time_length: -1 };
    const res = await authRequest.post(`/api/ad/${ad._id}`, { form: badPayload });
    const body = await res.json();

    expect(res.status()).toBe(400);
    expect(body.status).toBe("ERROR");
    expect(body.data).toMatchObject({ code: "AD_BAD_MIN_MEDIA_TIME" });
  });

  test("ID inexistente devuelve 404", async ({ authRequest }) => {
    const nonExistingId = "5ee2704ea666e81cf291a085";
    const res = await authRequest.post(`/api/ad/${nonExistingId}`, {
      form: { name: "should_not_exist" },
    });
    const body = await res.json();

    expect(res.status()).toBe(404);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });
});

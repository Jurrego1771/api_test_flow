// fixtures/ad.fixture.js
const { test } = require("./authRequest.fixture");

// Provee utilidades para crear Ads y un Ad temporal por defecto
exports.test = test.extend({
  createAd: async ({ authRequest }, use) => {
    const createdIds = [];

    async function createAd(overrides = {}) {
      const basePayload = {
        name: `qa_ad_${Date.now()}`,
        type: "vast",
        is_enabled: "false",
        preroll_skip_at: 0,
        min_media_time_length: 0,
      };

      const form = { ...basePayload, ...overrides };
      const res = await authRequest.post("/api/ad/new", { form });
      const body = await res.json();
      if (!(res.ok() && body?.status === "OK")) {
        throw new Error(`createAd fallo: status=${res.status()} body=${JSON.stringify(body)}`);
      }
      const raw = body.data;
      const ad = Array.isArray(raw) ? raw[0] : raw;
      if (ad && ad._id) createdIds.push(ad._id);
      return { ad, res, body };
    }

    await use(createAd);

    for (const id of createdIds) {
      try {
        const delRes = await authRequest.delete(`/api/ad/${id}`);
        const delText = await delRes.text();
        console.log(`[ad.fixture] DELETE ${id} -> ${delRes.status()} ${delText}`);
      } catch (e) {
        console.log(`[ad.fixture] Error eliminando Ad ${id}:`, e);
      }
    }
  },

  tempAd: async ({ createAd }, use) => {
    let ad = null;
    try {
      const result = await createAd();
      ad = result.ad;
    } catch (e) {
      console.log(`[ad.fixture] Error creando tempAd:`, e);
    }
    await use(ad);
  },
});




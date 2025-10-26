// fixtures/ad.fixture.js
const { test } = require("./authRequest.fixture");

// Provee un Ad temporal creado para pruebas y lo elimina al finalizar
exports.test = test.extend({
  tempAd: async ({ authRequest }, use) => {
    const payload = {
      // application/x-www-form-urlencoded esperado por la API
      name: `qa_ad_${Date.now()}`,
      type: "vast", // vast | vmap | googleima | local | ad-insertion | adswizz
      is_enabled: "false",
      preroll_skip_at: 0,
      min_media_time_length: 0,
      // Campos complejos opcionales pueden omitirse o enviarse vacíos
      // insertion, schedule, adswizz como objetos; categories/tags/referers como arrays
    };

    let created = null;
    try {
      const res = await authRequest.post("/api/ad/new", { form: payload });
      const body = await res.json();

      if (res.ok() && body?.status === "OK") {
        const raw = body.data;
        created = Array.isArray(raw) ? raw[0] : raw;
        if (created && !created.name) created.name = payload.name;
      } else {
        console.log(
          `[ad.fixture] No se pudo crear Ad temporal. status=${res.status()} body=${JSON.stringify(body)}`
        );
      }
    } catch (e) {
      console.log(`[ad.fixture] Error creando Ad temporal:`, e);
    }

    await use(created);

    // Cleanup si se creó (si hay endpoint DELETE disponible)
    if (created && created._id) {
      try {
        const delRes = await authRequest.delete(`/api/ad/${created._id}`);
        const delText = await delRes.text();
        console.log(
          `[ad.fixture] DELETE temp ad ${created._id} -> ${delRes.status()} ${delText}`
        );
      } catch (e) {
        console.log(
          `[ad.fixture] Error eliminando Ad temporal ${created._id}:`,
          e
        );
      }
    }
  },
});



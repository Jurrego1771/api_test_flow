// fixtures/media.fixture.js
const { test } = require("./authRequest.fixture");

// Provee media de muestra existente y media temporal creada para pruebas
exports.test = test.extend({
  // Fixture para asegurar que tenemos una media publicada y otra sin publicar
  mediaStates: async ({ authRequest }, use) => {
    let publishedMedia = null;
    let unpublishedMedia = null;

    // 1. Buscar medias existentes con diferentes estados
    const res = await authRequest.get("/api/media?all=true&limit=10");
    const body = await res.json();
    const list = Array.isArray(body?.data) ? body.data : [];

    publishedMedia = list.find((m) => m.is_published === true);
    unpublishedMedia = list.find((m) => m.is_published === false);

    // 2. Si no encontramos alguna, crear las que falten
    if (!unpublishedMedia) {
      const unpublishedPayload = {
        title: `qa_media_unpublished_${Date.now()}`,
        type: "video",
        visible: "true",
        is_published: "false",
      };
      try {
        const createRes = await authRequest.post("/api/media", {
          form: unpublishedPayload,
        });
        const createBody = await createRes.json();
        if (createRes.ok() && createBody?.status === "OK") {
          unpublishedMedia = Array.isArray(createBody.data)
            ? createBody.data[0]
            : createBody.data;
        }
      } catch (e) {
        console.log(`[media.fixture] Error creando media sin publicar:`, e);
      }
    }

    if (!publishedMedia) {
      const publishedPayload = {
        title: `qa_media_published_${Date.now()}`,
        type: "video",
        visible: "true",
        is_published: "true",
      };
      try {
        const createRes = await authRequest.post("/api/media", {
          form: publishedPayload,
        });
        const createBody = await createRes.json();
        if (createRes.ok() && createBody?.status === "OK") {
          publishedMedia = Array.isArray(createBody.data)
            ? createBody.data[0]
            : createBody.data;
        }
      } catch (e) {
        console.log(`[media.fixture] Error creando media publicada:`, e);
      }
    }

    // 3. Si tenemos una media sin publicar pero necesitamos una publicada, intentar publicarla
    if (!publishedMedia && unpublishedMedia) {
      try {
        const updateRes = await authRequest.put(
          `/api/media/${unpublishedMedia._id}`,
          {
            form: { ...unpublishedMedia, is_published: "true" },
          }
        );
        if (updateRes.ok()) {
          const updateBody = await updateRes.json();
          publishedMedia = Array.isArray(updateBody.data)
            ? updateBody.data[0]
            : updateBody.data;
        }
      } catch (e) {
        console.log(`[media.fixture] Error publicando media:`, e);
      }
    }

    await use({ published: publishedMedia, unpublished: unpublishedMedia });
  },
  mediaSample: async ({ authRequest }, use) => {
    const res = await authRequest.get("/api/media?limit=1");
    const body = await res.json();
    const list = Array.isArray(body?.data) ? body.data : [];
    const sample = list.length > 0 ? list[0] : null;
    await use(sample);
  },

  tempMedia: async ({ authRequest }, use) => {
    // Intentar crear una media mínima; si la API no soporta POST, se devolverá null
    const payload = {
      title: `qa_media_${Date.now()}`,
      type: "video",
      visible: "true",
      is_published: "false",
    };

    let created = null;
    try {
      const createRes = await authRequest.post("/api/media", { form: payload });
      const createBody = await createRes.json();
      if (createRes.ok() && createBody?.status === "OK") {
        const raw = createBody.data;
        created = Array.isArray(raw) ? raw[0] : raw;
        // Asegurar campos comunes
        if (created && !created.title) created.title = payload.title;
      } else {
        console.log(
          `[media.fixture] No se pudo crear media temporal. status=${createRes.status()} body=${JSON.stringify(
            createBody
          )}`
        );
      }
    } catch (e) {
      console.log(`[media.fixture] Error creando media temporal:`, e);
    }

    await use(created);

    // Cleanup si se creó
    if (created && created._id) {
      try {
        const delRes = await authRequest.delete(`/api/media/${created._id}`);
        const delText = await delRes.text();
        console.log(
          `[media.fixture] DELETE temp media ${
            created._id
          } -> ${delRes.status()} ${delText}`
        );
      } catch (e) {
        console.log(
          `[media.fixture] Error eliminando media temporal ${created._id}:`,
          e
        );
      }
    }
  },
});

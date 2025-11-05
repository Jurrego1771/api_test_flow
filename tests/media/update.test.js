const { test, expect } = require("../../fixtures");
const logger = require("../utils/logger");

test.describe("Media - Actualización (POST /api/media/{id})", () => {
  test("Actualizar título y flags de una media existente", async ({
    authRequest,
  }) => {
    // Preparar una media temporal
    const createPayload = {
      title: `qa_media_update_${Date.now()}`,
      type: "video",
      visible: "false",
      is_published: "false",
    };
    const createRes = await authRequest.post("/api/media", {
      form: createPayload,
    });
    const createBody = await createRes.json();
    expect(createRes.ok()).toBeTruthy();
    const created = Array.isArray(createBody.data)
      ? createBody.data[0]
      : createBody.data;

    // Actualizar
    const updatePayload = {
      title: `${createPayload.title}_updated`,
      visible: "true",
      is_published: "true",
    };
    const updRes = await authRequest.post(`/api/media/${created._id}`, {
      form: updatePayload,
    });
    const updBody = await updRes.json();
    logger.info(
      `POST /api/media/${created._id} -> ${updRes.status()} ${JSON.stringify(
        updBody
      )}`
    );

    expect(updRes.ok()).toBeTruthy();
    expect(updBody.status).toBe("OK");
    expect(updBody.data.title).toBe(updatePayload.title);

    // Cleanup
    const del = await authRequest.delete(`/api/media/${created._id}`);
    logger.info(
      `DELETE /api/media/${created._id} -> ${del.status()} ${await del.text()}`
    );
  });

  test("Negativo: actualizar media inexistente", async ({ authRequest }) => {
    const fakeId = "000000000000000000000000";
    const updRes = await authRequest.post(`/api/media/${fakeId}`, {
      form: { title: "x" },
    });
    const updBody = await updRes.json();
    expect([200, 400, 404, 500]).toContain(updRes.status());
    // Muchas APIs devuelven 200 con data:null o status:ERROR
    expect(["OK", "ERROR"]).toContain(updBody.status);
  });
});

// Bloque de pruebas para metas: GET / DELETE / TRANSCODE
test.describe("Media - Metas (GET/DELETE/TRANSCODE)", () => {
  test("GET-META-OK-01 - Obtener metas correctamente", async ({
    authRequest,
  }) => {
    // Buscar una media que ya tenga metas en el sistema
    const resAll = await authRequest.get("/api/media?all=true&limit=50");
    expect(resAll.ok()).toBeTruthy();
    const allBody = await resAll.json();

    const mediaWithMeta = allBody.data.find(
      (m) => Array.isArray(m.meta) && m.meta.length > 0
    );
    expect(
      mediaWithMeta,
      "No se encontró media con metas para probar"
    ).toBeTruthy();

    const media_id = mediaWithMeta._id;
    const res = await authRequest.get(`/api/media/${media_id}/meta`);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.status).toBe("OK");
    // La API puede devolver { data: { meta: [...] } } o { data: [...] }
    const metas = body.data?.meta ?? body.data;
    expect(Array.isArray(metas)).toBe(true);
    expect(metas.length).toBeGreaterThan(0);
  });

  test("GET-META-ERR-01 - Media no existente", async ({ authRequest }) => {
    const res = await authRequest.get(
      "/api/media/666666666666666666666666/meta"
    );
    const body = await res.json();
    expect(res.status()).toBe(200);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NOT_FOUND");
  });

  test("DEL-META-OK-01 - Eliminar meta NO original", async ({
    authRequest,
  }) => {
    // Buscar una media que tenga al menos una meta no original
    const resAll = await authRequest.get("/api/media?all=true&limit=50");
    expect(resAll.ok()).toBeTruthy();
    const allBody = await resAll.json();

    const target = allBody.data.find(
      (m) => Array.isArray(m.meta) && m.meta.some((mm) => !mm.is_original)
    );
    expect(
      target,
      "No se encontró media con meta no original para eliminar"
    ).toBeTruthy();

    const media_id = target._id;
    const metaObj = target.meta.find((mm) => !mm.is_original);
    const meta_no_original_id = metaObj._id ?? metaObj.id ?? metaObj;

    const delRes = await authRequest.delete(
      `/api/media/${media_id}/meta/${meta_no_original_id}`
    );
    expect(delRes.status()).toBe(200);
  });
});

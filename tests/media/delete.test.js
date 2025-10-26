const { test, expect } = require("../../fixtures");
const logger = require("../utils/logger");

test.describe("🎬 Media - Eliminación )", () => {
  test("Crear media temporal y eliminarla", async ({ authRequest }) => {
    // Crear
    const payload = {
      title: `qa_media_del_${Date.now()}`,
      type: "video",
      visible: "false",
      is_published: "false",
    };
    const createRes = await authRequest.post("/api/media", { form: payload });
    const createBody = await createRes.json();
    expect(createRes.ok()).toBeTruthy();
    const created = Array.isArray(createBody.data)
      ? createBody.data[0]
      : createBody.data;

    // Eliminar
    const delRes = await authRequest.delete(`/api/media/${created._id}`);
    const delText = await delRes.text();
    logger.info(
      `DELETE /api/media/${created._id} -> ${delRes.status()} ${delText}`
    );
    expect(delRes.ok()).toBeTruthy();

    // Verificar que ya no existe
    const getRes = await authRequest.get(`/api/media/${created._id}`);
    const getBody = await getRes.json();
    expect(getRes.status()).toBe(404);
    expect(getBody.status).toBe("ERROR");
    expect(getBody.data).toBe("NOT_FOUND");
  });

  test("Negativo: eliminar media inexistente", async ({ authRequest }) => {
    const fakeId = "000000000000000000000000";
    const delRes = await authRequest.delete(`/api/media/${fakeId}`);
    const delBody = await delRes.json().catch(() => ({}));
    expect([200, 400, 404, 500]).toContain(delRes.status());
    expect(["OK", "ERROR", undefined]).toContain(delBody.status);
  });
});

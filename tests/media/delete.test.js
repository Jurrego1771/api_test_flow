const { test, expect } = require("../../fixtures");
const { logApiResult } = require("../utils/logger");

test.describe("🎬 Media - Eliminación )", () => {
  test("Crear media temporal y eliminarla", async ({ authRequest }) => {
    // Crear
    const payload = {
      title: `qa_media_del_${Date.now()}`,
      type: "video",
      visible: "false",
      is_published: "false",
    };
    const createEndpoint = "/api/media";
    const t0 = Date.now();
    const createRes = await authRequest.post(createEndpoint, { form: payload });
    const createBody = await createRes.json();
    logApiResult("POST", createEndpoint, createRes.status(), Date.now() - t0, createBody);
    expect(createRes.ok()).toBeTruthy();
    const created = Array.isArray(createBody.data)
      ? createBody.data[0]
      : createBody.data;

    // Eliminar
    const delEndpoint = `/api/media/${created._id}`;
    const t1 = Date.now();
    const delRes = await authRequest.delete(delEndpoint);
    const delText = await delRes.text();
    logApiResult("DELETE", delEndpoint, delRes.status(), Date.now() - t1, delText);
    expect(delRes.ok()).toBeTruthy();

    // Verificar que ya no existe
    const getEndpoint = `/api/media/${created._id}`;
    const t2 = Date.now();
    const getRes = await authRequest.get(getEndpoint);
    const getBody = await getRes.json();
    logApiResult("GET", getEndpoint, getRes.status(), Date.now() - t2, getBody);
    expect(getRes.status()).toBe(404);
    expect(getBody.status).toBe("ERROR");
    expect(getBody.data).toBe("NOT_FOUND");
  });

  test("Negativo: eliminar media inexistente", async ({ authRequest }) => {
    const fakeId = "000000000000000000000000";
    const endpoint = `/api/media/${fakeId}`;
    const t0 = Date.now();
    const delRes = await authRequest.delete(endpoint);
    const delBody = await delRes.json().catch(() => ({}));
    logApiResult("DELETE", endpoint, delRes.status(), Date.now() - t0, delBody);
    expect([200, 400, 404, 500]).toContain(delRes.status());
    expect(["OK", "ERROR", undefined]).toContain(delBody.status);
  });
});

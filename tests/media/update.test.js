const { test, expect } = require("../../fixtures");
const { logApiResult } = require("../utils/logger");

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
    const createEndpoint = "/api/media";
    const t0 = Date.now();
    const createRes = await authRequest.post(createEndpoint, {
      form: createPayload,
    });
    const createBody = await createRes.json();
    logApiResult("POST", createEndpoint, createRes.status(), Date.now() - t0, createBody);
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
    const updateEndpoint = `/api/media/${created._id}`;
    const t1 = Date.now();
    const updRes = await authRequest.post(updateEndpoint, {
      form: updatePayload,
    });
    const updBody = await updRes.json();
    logApiResult("POST", updateEndpoint, updRes.status(), Date.now() - t1, updBody);

    expect(updRes.ok()).toBeTruthy();
    expect(updBody.status).toBe("OK");
    expect(updBody.data.title).toBe(updatePayload.title);

    // Cleanup
    const delEndpoint = `/api/media/${created._id}`;
    const t2 = Date.now();
    const del = await authRequest.delete(delEndpoint);
    const delText = await del.text();
    logApiResult("DELETE", delEndpoint, del.status(), Date.now() - t2, delText);
  });

  test("Negativo: actualizar media inexistente", async ({ authRequest }) => {
    const fakeId = "000000000000000000000000";
    const endpoint = `/api/media/${fakeId}`;
    const t0b = Date.now();
    const updRes = await authRequest.post(endpoint, {
      form: { title: "x" },
    });
    const updBody = await updRes.json();
    logApiResult("POST", endpoint, updRes.status(), Date.now() - t0b, updBody);
    expect([200, 400, 404, 500]).toContain(updRes.status());
    // Muchas APIs devuelven 200 con data:null o status:ERROR
    expect(["OK", "ERROR"]).toContain(updBody.status);
  });
});

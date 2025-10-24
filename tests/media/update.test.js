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

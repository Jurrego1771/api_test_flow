const { test, expect } = require("../../fixtures");
const logger = require("../utils/logger");

test.describe("Media - Creación (POST /api/media)", () => {
  test("Crear media mínima (title, type)", async ({ authRequest }) => {
    const payload = {
      title: `qa_media_${Date.now()}`,
      type: "video",
      visible: "true",
      is_published: "false",
    };

    const res = await authRequest.post("/api/media", { form: payload });
    const body = await res.json();

    logger.info(`POST /api/media -> ${res.status()} ${JSON.stringify(body)}`);

    expect(res.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    const created = Array.isArray(body.data) ? body.data[0] : body.data;
    expect(created).toBeDefined();
    expect(created).toHaveProperty("_id");

    // Cleanup
    const del = await authRequest.delete(`/api/media/${created._id}`);
    logger.info(
      `DELETE /api/media/${created._id} -> ${del.status()} ${await del.text()}`
    );
  });

  test("Validación negativa: missing title", async ({ authRequest }) => {
    const payload = { type: "video" };
    const res = await authRequest.post("/api/media", { form: payload });
    const body = await res.json();
    expect([400, 422, 500]).toContain(res.status());
    expect(body.status).toBe("ERROR");
  });
});

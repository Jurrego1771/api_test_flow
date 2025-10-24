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

 test("Asignación de ID como title cuando falta 'title'", async ({
   authRequest,
 }) => {
   const payload = { type: "video" };
   const res = await authRequest.post("/api/media", { form: payload });
   const body = await res.json();

   expect(res.status()).toBe(200); // o el código correcto si es exitoso
   expect(body.status).toBe("OK");
   expect(body.data.title).toBe(body.data._id); // Verificar si title es igual al id asignado

   // Cleanup
   if (body.data && body.data._id) {
     const delResponse = await authRequest.delete(
       `/api/media/${body.data._id}`
     );
     console.log(
       `DELETE /api/media/${body.data._id} -> ${delResponse.status()}`
     );
   }
 });
});

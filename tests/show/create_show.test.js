const { test, expect } = require("../../fixtures");
const showHelper = require("../../fixtures/show.fixture");

test.describe("Show API - create and cleanup example", () => {
  test("CREATE-SHOW-001 - crear show y verificar listado", async ({ authRequest }) => {
    const info = test.info();

    // Crear show de prueba
    const { show, cleanup } = await showHelper.createShow(authRequest, {
      title: `qa_show_test_${Date.now()}`,
      type: "tvshow",
      description: "Show de prueba creado por tests",
      genres: ["drama", "history"],
    });

    try {
      expect(show).toBeTruthy();
      const id = show._id || show.id;
      expect(id).toBeTruthy();

      // Adjuntar el show creado al reporte
      await info.attach("created-show", {
        body: JSON.stringify({ createdId: id, created: show }, null, 2),
        contentType: "application/json",
      });

      // Verificar que el endpoint GET /api/show devuelve el id creado cuando pedimos all/limit
      const res = await authRequest.get("/api/show?limit=50");
      expect(res.ok()).toBeTruthy();
      const list = await res.json();
      // La ruta puede devolver array o { status, data }
      const shows = Array.isArray(list) ? list : Array.isArray(list?.data) ? list.data : [];
      const ids = shows.map((s) => s._id ?? s.id ?? s);
      expect(ids).toContain(id);
    } finally {
      // Cleanup: siempre eliminar el show creado
      await cleanup();
    }
  });
});

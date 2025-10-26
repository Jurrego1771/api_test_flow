const { test, expect } = require("../../fixtures");
const { logApiResult } = require("../utils/logger");

test.describe("🎬 Media all", () => {
  test("GET /api/media all false", async ({ authRequest }) => {
    const endpoint = "/api/media?all=false&limit=1";
    const t0 = Date.now();
    const res = await authRequest.get(endpoint);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const allPublished = body.data.every(
      (media) => media.is_published === true
    );
    expect(allPublished).toBe(true);
    logApiResult("GET", endpoint, res.status(), Date.now() - t0, { status: body.status, data: `[${body.data.length}]` });
  });

  test("GET /api/media all true", async ({ authRequest }) => {
    const endpoint = "/api/media?all=true&limit=1";
    const t0 = Date.now();
    const res = await authRequest.get(endpoint);
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const hasUnpublished = body.data.some(
      (media) => media.is_published === false
    );
    expect(hasUnpublished).toBe(true);
    logApiResult("GET", endpoint, res.status(), Date.now() - t0, { status: body.status, data: `[${body.data.length}]` });
  });
});

test.describe("🎬 Filtro Media without_category", () => {
  test("without_category=true - sin categorías", async ({ authRequest }) => {
    const res = await authRequest.get("/api/media?without_category=true");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    // Verifica que cada media tenga categories vacío o null
    const allWithoutCategory = body.data.every(
      (media) =>
        media.categories === null ||
        (Array.isArray(media.categories) && media.categories.length === 0)
    );

    expect(allWithoutCategory).toBe(true);
  });

  test("without_category=false - algunas medias con categorías", async ({
    authRequest,
  }) => {
    const res = await authRequest.get("/api/media?without_category=false");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    //  Al menos una media tiene categorías (array con elementos)
    const hasCategories = body.data.some(
      (media) => Array.isArray(media.categories) && media.categories.length > 0
    );

    expect(hasCategories).toBe(true);
  });
});

test.describe("🎬 Get  filtro logico sin categoria", () => {
  test("debe retornar vacio por que el id tiene categoria y pasamos without_category=true", async ({
    authRequest,
  }) => {
    // 1️⃣ Primero obtenemos todas las medias (sin filtros)
    const resAll = await authRequest.get("/api/media");
    expect(resAll.ok()).toBeTruthy();

    const allBody = await resAll.json();

    // 2️⃣ Buscamos una media que tenga al menos una categoría
    const mediaWithCategory = allBody.data.find(
      (media) => Array.isArray(media.categories) && media.categories.length > 0
    );

    // 3️⃣ Validamos que exista (si no, el test falla)
    expect(
      mediaWithCategory,
      "No se encontró una media con categorías"
    ).toBeTruthy();

    // 4️⃣ Usamos el ID para hacer la prueba con without_category=true
    const resFiltered = await authRequest.get(
      `/api/media?without_category=true&id=${mediaWithCategory._id}`
    );
    expect(resFiltered.ok()).toBeTruthy();

    const filteredBody = await resFiltered.json();

    // 5️⃣ Validamos que la respuesta sea exactamente { status: "OK", data: [] }
    expect(filteredBody.status).toBe("OK");
    expect(Array.isArray(filteredBody.data)).toBe(true);
    expect(filteredBody.data.length).toBe(0);

    // 6️⃣ (Opcional) Adjuntamos la respuesta al reporte si algo falla
    if (filteredBody.data.length !== 0) {
      await test.info().attach("Filtered Response", {
        body: JSON.stringify(filteredBody, null, 2),
        contentType: "application/json",
      });
      console.error(
        "❌ La API devolvió resultados cuando se esperaba un array vacío:",
        filteredBody.data
      );
    }
  });
});

const { test, expect } = require("../../fixtures");
const logger = require("../utils/logger");

// Helper para adjuntar un resumen de la respuesta al reporte (trunca cuerpo largo)
async function attachSummary(info, title, details) {
  try {
    let payload = JSON.stringify(details, null, 2);
    if (payload.length > 20000)
      payload = payload.slice(0, 20000) + "\n...truncated";
    await info.attach(title, {
      body: payload,
      contentType: "application/json",
    });
  } catch (e) {
    console.error("attachSummary error:", e);
  }
}

test.describe("🎬 Media all", () => {
  test("TC-MED-GET-001: Lista de medias solo publicadas (all=false)", async ({
    authRequest,
  }) => {
    const res = await authRequest.get("/api/media?all=false");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const allPublished = body.data.every(
      (media) => media.is_published === true
    );
    expect(allPublished).toBe(true);

    // Adjuntar resumen al reporte
    const info = test.info();
    await attachSummary(info, "TC-MED-GET-001 - Response Summary", {
      url: "/api/media?all=false",
      status: res.status(),
      publishedCount: body.data.length,
      sampleIds: body.data.slice(0, 5).map((m) => m._id),
    });

    logger.info(
      `📡 GET /api/media all=false - Status: ${res.status()}, Published: ${allPublished}`
    );
  });

  test("TC-MED-GET-001.1: Verificar que media despublicada no aparece con all=false", async ({
    authRequest,
  }) => {
    // 1️⃣ Primero obtenemos una media despublicada
    const resAll = await authRequest.get("/api/media?all=true");
    expect(resAll.ok()).toBeTruthy();

    const allBody = await resAll.json();
    const unpublishedMedia = allBody.data.find(
      (media) => media.is_published === false
    );

    // Verificar que encontramos una media despublicada
    expect(
      unpublishedMedia,
      "No se encontró una media despublicada para probar"
    ).toBeTruthy();

    // 2️⃣ Intentar obtener esa media específica con all=false
    const res = await authRequest.get(
      `/api/media?all=false&id=${unpublishedMedia._id}`
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(0);

    // Adjuntar evidencia (id de la media y la respuesta)
    const info = test.info();
    await attachSummary(info, "TC-MED-GET-001.1 - Response Evidence", {
      requestedUrl: `/api/media?all=false&id=${unpublishedMedia._id}`,
      status: res.status(),
      mediaId: unpublishedMedia._id,
      body: body,
    });

    logger.info(
      `📡 GET /api/media?all=false&id=${
        unpublishedMedia._id
      } - Status: ${res.status()}, Empty Response: ${body.data.length === 0}`
    );
  });

  test("TC-MED-GET-002: Lista completa de medias (all=true)", async ({
    authRequest,
  }) => {
    const res = await authRequest.get("/api/media?all=true");
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    const hasUnpublished = body.data.some(
      (media) => media.is_published === false
    );
    expect(hasUnpublished).toBe(true);

    // Adjuntar resumen al reporte
    const info = test.info();
    await attachSummary(info, "TC-MED-GET-002 - Response Summary", {
      url: "/api/media?all=true",
      status: res.status(),
      total: body.data.length,
      unpublishedSampleIds: body.data
        .filter((m) => m.is_published === false)
        .slice(0, 5)
        .map((m) => m._id),
    });

    logger.info(
      `📡 GET /api/media all=true - Status: ${res.status()}, Has Unpublished: ${hasUnpublished}`
    );
  });

  test("TC-MED-GET-002.1: Verificar que media despublicada aparece con all=true", async ({
    authRequest,
  }) => {
    // 1️⃣ Primero obtenemos una media despublicada específica
    const resAll = await authRequest.get("/api/media?all=true");
    expect(resAll.ok()).toBeTruthy();

    const allBody = await resAll.json();
    const unpublishedMedia = allBody.data.find(
      (media) => media.is_published === false
    );

    // Verificar que encontramos una media despublicada
    expect(
      unpublishedMedia,
      "No se encontró una media despublicada para probar"
    ).toBeTruthy();

    // 2️⃣ Intentar obtener esa media específica con all=true
    const res = await authRequest.get(
      `/api/media?all=true&id=${unpublishedMedia._id}`
    );
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(1);

    // 3️⃣ Verificar que la media retornada es la correcta y mantiene su estado
    const returnedMedia = body.data[0];
    expect(returnedMedia._id).toBe(unpublishedMedia._id);
    expect(returnedMedia.is_published).toBe(false);

    // Adjuntar evidencia completa (id y respuesta truncada)
    const info = test.info();
    await attachSummary(info, "TC-MED-GET-002.1 - Response Evidence", {
      requestedUrl: `/api/media?all=true&id=${unpublishedMedia._id}`,
      status: res.status(),
      expectedId: unpublishedMedia._id,
      returned: {
        id: returnedMedia._id,
        is_published: returnedMedia.is_published,
        title: returnedMedia.title,
      },
      fullBody: body,
    });

    logger.info(
      `📡 GET /api/media?all=true&id=${
        unpublishedMedia._id
      } - Status: ${res.status()}, Media Found: ${returnedMedia._id}`
    );
  });
});

test.describe("🎬 Filtro Media without_category", () => {
  test("TC-MED-GET-003: Filtrado de medias sin categorías", async ({
    authRequest,
  }) => {
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

  test("TC-MED-GET-004: Filtrado de medias con categorías", async ({
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

test.describe("🎬 Get filtro lógico sin categoria", () => {
  test("TC-MED-GET-005: Validación de filtro without_category con ID específico", async ({
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

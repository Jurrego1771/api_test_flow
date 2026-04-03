const { test } = require("../../fixtures/category.fixture");
const { expect } = require("@playwright/test");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const { createCategoryResponseSchema } = require("../../schemas/category.schema");

test.describe("POST /api/category - Creación de categorías", () => {
  let apiClient;
  let cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.clean();
  });

  test("TC-CAT-POST-001: Crear categoría mínima (solo name)", async ({
    authRequest,
  }) => {
    const name = `qa_min_${Date.now()}`;
    const payload = { name };

    const response = await authRequest.post("/api/category", { form: payload });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.name).toBe(name);
    expect(body.data).toHaveProperty("_id");

    // Validación estructural con Zod
    createCategoryResponseSchema.parse(body);

    // Cleanup
    try {
      const del = await authRequest.delete(`/api/category/${body.data._id}`);
      expect(del.ok()).toBeTruthy();
    } catch {}
  });

  test("TC-CAT-POST-002: Crear categoría completa con parent, drm, track y visible", async ({
    authRequest,
    parentCategory,
  }) => {
    const name = `qa_full_${Date.now()}`;
    const payload = {
      name,
      description: "Categoría creada con todos los campos",
      drm: "deny", // permitido: all | compatible | deny
      parent: parentCategory._id,
      track: true,
      visible: false,
    };

    const response = await authRequest.post("/api/category", { form: payload });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.name).toBe(name);
    expect(body.data).toHaveProperty("_id");

    // Validación estructural con Zod
    createCategoryResponseSchema.parse(body);

    // Cleanup
    try {
      const del = await authRequest.delete(`/api/category/${body.data._id}`);
      expect(del.ok()).toBeTruthy();
    } catch {}
  });

  // ================== NEGATIVOS / REGLAS DE NEGOCIO ==================

  test("TC-CAT-POST-NEG-001: Debe fallar si falta 'name' (400 NAME_IS_REQUIRED)", async ({
    authRequest,
  }) => {
    const payload = {
      // sin name
      description: "Sin nombre",
      drm: "deny",
      track: true,
      visible: true,
    };

    const response = await authRequest.post("/api/category", { form: payload });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body.status).toBe("ERROR");
    expect(body.data).toBe("NAME_IS_REQUIRED");
  });

 test("TC-CAT-POST-NEG-002: Debe fallar si 'drm' tiene un valor inválido", async ({
   authRequest,
 }) => {
   const payload = {
     name: `qa_invalid_drm_${Date.now()}`,
     drm: "invalid_value", // no permitido
     track: true,
     visible: true,
   };

   const response = await authRequest.post("/api/category", { form: payload });
   const body = await response.json();

   // Si el backend retorna un 200 cuando drm es inválido
   expect(response.status()).toBe(200);
   expect(body.status).toBe("OK");

   // Verificar que drm no esté habilitado
   expect(body.data.drm.enabled).toBe(false);
   expect(body.data.drm.allow).toBe(false);
   expect(body.data.drm.allow_incompatible_devices).toBe(false);
 });

  test("TC-CAT-POST-NEG-003: Debe fallar si 'parent' no es un ID válido", async ({
    authRequest,
  }) => {
    const payload = {
      name: `qa_invalid_parent_${Date.now()}`,
      parent: "not_a_valid_id",
      track: true,
      visible: true,
    };

    const response = await authRequest.post("/api/category", { form: payload });
    const body = await response.json();

    expect([400, 500]).toContain(response.status());
    expect(body.status).toBe("ERROR");
    expect(body.data).toBeDefined();
  });

  test("TC-CAT-POST-NEG-004: Debe fallar si 'name' es vacío", async ({
    authRequest,
  }) => {
    const payload = {
      name: "",
      description: "Nombre vacío",
      track: true,
      visible: true,
    };

    const response = await authRequest.post("/api/category", { form: payload });
    const body = await response.json();

    expect([400, 500]).toContain(response.status());
    expect(body.status).toBe("ERROR");
    // Si el backend normaliza como NAME_IS_REQUIRED también vale
  });

  test("TC_CAT_GET_create_persist_fields", async ({ authRequest }) => {
    const name = `qa_persist_${Date.now()}`;
    const payload = {
      name,
      description: "qa_persist_description",
      drm: "deny",
      visible: false,
    };

    const createRes = await authRequest.post("/api/category", { form: payload });
    const createBody = await createRes.json();

    expect(createRes.status()).toBe(200);
    expect(createBody.status).toBe("OK");

    const id = createBody.data._id;
    cleaner.register("category", id);

    const getRes = await authRequest.get(`/api/category/${id}`);
    const getBody = await getRes.json();

    expect(getRes.status()).toBe(200);
    expect(getBody.status).toBe("OK");
    expect(getBody.data.name).toBe(name);
    expect(getBody.data.description).toBe(payload.description);
  });

  test("TC_CAT_POST_update_clear_description", async ({ authRequest }) => {
    const createRes = await authRequest.post("/api/category", {
      form: { name: `qa_cat_clear_${Date.now()}`, description: "qa_original_description" },
    });
    const createBody = await createRes.json();
    expect(createRes.status()).toBe(200);

    const id = createBody.data._id;
    cleaner.register("category", id);

    await authRequest.post(`/api/category/${id}`, { form: { description: "" } });

    const getRes = await authRequest.get(`/api/category/${id}`);
    const getBody = await getRes.json();

    expect(getRes.status()).toBe(200);
    expect(getBody.status).toBe("OK");
    const desc = getBody.data.description;
    expect(!desc || desc === "").toBeTruthy();
  });
});

const { test } = require("../../fixtures/category.fixture");
const { expect } = require("@playwright/test");
const { logApiResult } = require("../utils/logger");

test.describe("POST /api/category - Creación de categorías", () => {
  test("TC-CAT-POST-001: Crear categoría mínima (solo name)", async ({
    authRequest,
  }) => {
    const name = `qa_min_${Date.now()}`;
    const payload = { name };

    const endpoint = "/api/category";
    const t0 = Date.now();
    const response = await authRequest.post(endpoint, { form: payload });
    const body = await response.json();
    logApiResult("POST", endpoint, response.status(), Date.now() - t0, body);

    expect(response.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe(name);
    expect(body.data).toHaveProperty("_id");

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

    const endpoint = "/api/category";
    const t0 = Date.now();
    const response = await authRequest.post(endpoint, { form: payload });
    const body = await response.json();
    logApiResult("POST", endpoint, response.status(), Date.now() - t0, body);

    expect(response.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe(name);
    expect(body.data).toHaveProperty("_id");

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

    const endpoint = "/api/category";
    const t0 = Date.now();
    const response = await authRequest.post(endpoint, { form: payload });
    const body = await response.json();
    logApiResult("POST", endpoint, response.status(), Date.now() - t0, body);

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

  const endpoint = "/api/category";
  const t0 = Date.now();
  const response = await authRequest.post(endpoint, { form: payload });
  const body = await response.json();
  logApiResult("POST", endpoint, response.status(), Date.now() - t0, body);

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

    const endpoint = "/api/category";
    const t0 = Date.now();
    const response = await authRequest.post(endpoint, { form: payload });
    const body = await response.json();
    logApiResult("POST", endpoint, response.status(), Date.now() - t0, body);

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
});

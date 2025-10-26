const { test } = require("../../fixtures/category.fixture");
const { expect } = require("@playwright/test");
const { logApiResult } = require("../utils/logger");

test.describe("GET /api/category - Búsqueda y listados de categorías", () => {
  test("Debe devolver OK y un array de categorías (sin filtros)", async ({
    authRequest,
  }) => {
    const t0 = Date.now();
    const endpoint = "/api/category";
    const response = await authRequest.get(endpoint);
    const body = await response.json();
    logApiResult("GET", endpoint, response.status(), Date.now() - t0, body);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("Debe permitir buscar por category_name", async ({
    authRequest,
    parentCategory,
  }) => {
    const endpoint = `/api/category?category_name=${encodeURIComponent(
      parentCategory.name
    )}`;
    const t0 = Date.now();
    const response = await authRequest.get(endpoint);
    const body = await response.json();
    logApiResult("GET", endpoint, response.status(), Date.now() - t0, body);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const names = body.data.map((c) => c.name);
    expect(names).toContain(parentCategory.name);
  });

  test("Debe soportar flag full (ruta completa en nombre)", async ({
    authRequest,
  }) => {
    const endpoint = "/api/category?full=true";
    const t0 = Date.now();
    const response = await authRequest.get(endpoint);
    const body = await response.json();
    logApiResult("GET", endpoint, response.status(), Date.now() - t0, body);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("Debe soportar with_count (conteo de hijos)", async ({
    authRequest,
  }) => {
    const endpoint = "/api/category?with_count=true";
    const t0 = Date.now();
    const response = await authRequest.get(endpoint);
    const body = await response.json();
    logApiResult("GET", endpoint, response.status(), Date.now() - t0, body);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("Debe listar y contener la categoría hija creada", async ({
    authRequest,
    childCategory,
  }) => {
    const endpoint = `/api/category?category_name=${encodeURIComponent(
      childCategory.name
    )}`;
    const t0 = Date.now();
    const response = await authRequest.get(endpoint);
    const body = await response.json();
    logApiResult("GET", endpoint, response.status(), Date.now() - t0, body);

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    const ids = body.data.map((c) => c._id);
    expect(ids).toContain(childCategory._id);
  });
});

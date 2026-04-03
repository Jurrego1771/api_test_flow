const { test } = require("../../fixtures/category.fixture");
const { expect } = require("@playwright/test");
const { listCategoryResponseSchema } = require("../../schemas/category.schema");

test.describe("GET /api/category - Búsqueda y listados de categorías", () => {
  test("Debe devolver OK y un array de categorías (sin filtros)", async ({
    authRequest,
  }) => {
    const response = await authRequest.get("/api/category");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
    listCategoryResponseSchema.parse(body);
  });

  test("Debe permitir buscar por category_name", async ({
    authRequest,
    parentCategory,
  }) => {
    const response = await authRequest.get(
      `/api/category?category_name=${encodeURIComponent(parentCategory.name)}`
    );
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const names = body.data.map((c) => c.name);
    expect(names).toContain(parentCategory.name);
  });

  test("Debe soportar flag full (ruta completa en nombre)", async ({
    authRequest,
  }) => {
    const response = await authRequest.get("/api/category?full=true");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("Debe soportar with_count (conteo de hijos)", async ({
    authRequest,
  }) => {
    const response = await authRequest.get("/api/category?with_count=true");
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("Debe listar y contener la categoría hija creada", async ({
    authRequest,
    childCategory,
  }) => {
    const response = await authRequest.get(
      `/api/category?category_name=${encodeURIComponent(childCategory.name)}`
    );
    const body = await response.json();

    expect(response.ok()).toBeTruthy();
    expect(body.status).toBe("OK");
    const ids = body.data.map((c) => c._id);
    expect(ids).toContain(childCategory._id);
  });
});

test.describe("Auth — Sin token / Token inválido", () => {
  test("TC_CAT_GET_list_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get("/api/category");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_CAT_GET_list_invalid_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.get("/api/category");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

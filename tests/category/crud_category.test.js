const { test } = require("../../fixtures/category.fixture");
const { expect } = require("@playwright/test");
const {
  getCategoryResponseSchema,
  createCategoryResponseSchema,
} = require("../../schemas/category.schema");
require("dotenv").config();

// ─── GET /api/category/:id ────────────────────────────────────────────────────

test.describe("GET /api/category/:id - Detalle de categoría", () => {
  test("TC_CAT_GET_category_by_id", async ({ authRequest, parentCategory }) => {
    const res = await authRequest.get(`/api/category/${parentCategory._id}`);
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data._id).toBe(parentCategory._id);
    expect(body.data.name).toBe(parentCategory.name);

    getCategoryResponseSchema.parse(body);
  });

  test("TC_CAT_GET_category_by_id_not_found", async ({ authRequest }) => {
    const res = await authRequest.get("/api/category/000000000000000000000000");
    const body = await res.json();

    expect([404, 400]).toContain(res.status());
    expect(body.status).toBe("ERROR");
  });

  test("TC_CAT_GET_category_by_id_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    try {
      const res = await ctx.get("/api/category/000000000000000000000001");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_CAT_GET_category_by_id_invalid_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.get("/api/category/000000000000000000000001");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST /api/category/:id (update) ─────────────────────────────────────────

test.describe("POST /api/category/:id - Actualización de categoría", () => {
  test("TC_CAT_POST_update_category_name", async ({
    authRequest,
    parentCategory,
  }) => {
    const newName = `qa_updated_${Date.now()}`;

    const res = await authRequest.post(`/api/category/${parentCategory._id}`, {
      form: { name: newName },
    });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data._id).toBe(parentCategory._id);
    expect(body.data.name).toBe(newName);

    getCategoryResponseSchema.parse(body);

    // Verify persisted
    const getRes = await authRequest.get(
      `/api/category/${parentCategory._id}`
    );
    const getBody = await getRes.json();
    expect(getRes.status()).toBe(200);
    expect(getBody.data.name).toBe(newName);
  });

  test("TC_CAT_POST_update_category_description", async ({
    authRequest,
    parentCategory,
  }) => {
    const newDesc = `qa_desc_updated_${Date.now()}`;

    const res = await authRequest.post(`/api/category/${parentCategory._id}`, {
      form: { description: newDesc },
    });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    expect(body.data.description).toBe(newDesc);
  });

  test("TC_CAT_POST_update_category_drm", async ({
    authRequest,
    parentCategory,
  }) => {
    const res = await authRequest.post(`/api/category/${parentCategory._id}`, {
      form: { drm: "all" },
    });
    const body = await res.json();

    expect(res.status()).toBe(200);
    expect(body.status).toBe("OK");
    // drm: "all" → enabled true, allow true
    expect(body.data.drm.enabled).toBe(true);
    expect(body.data.drm.allow).toBe(true);
  });

  test("TC_CAT_POST_update_category_assign_child_to_parent", async ({
    authRequest,
    parentCategory,
    childCategory,
  }) => {
    // childCategory ya tiene parentCategory como parent (creado en fixture)
    // Verificamos que la relación persiste correctamente
    const getRes = await authRequest.get(
      `/api/category/${childCategory._id}`
    );
    const getBody = await getRes.json();

    expect(getRes.status()).toBe(200);
    expect(getBody.status).toBe("OK");
    expect(getBody.data.parent).toBe(parentCategory._id);
  });

  test("TC_CAT_POST_update_category_not_found", async ({ authRequest }) => {
    const res = await authRequest.post(
      "/api/category/000000000000000000000000",
      { form: { name: "qa_should_not_exist" } }
    );
    const body = await res.json();

    expect([404, 400]).toContain(res.status());
    expect(body.status).toBe("ERROR");
  });

  test("TC_CAT_POST_update_category_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    try {
      const res = await ctx.post("/api/category/000000000000000000000001", {
        form: { name: "qa_no_token" },
      });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── DELETE /api/category/:id ─────────────────────────────────────────────────

test.describe("DELETE /api/category/:id - Eliminación de categoría", () => {
  test("TC_CAT_DELETE_category_by_id", async ({ authRequest }) => {
    // Creamos una categoría solo para este test (no usamos fixture para controlar el ciclo)
    const createRes = await authRequest.post("/api/category", {
      form: { name: `qa_delete_${Date.now()}` },
    });
    const createBody = await createRes.json();
    expect(createRes.status()).toBe(200);
    const id = createBody.data._id;

    const delRes = await authRequest.delete(`/api/category/${id}`);
    expect(delRes.ok()).toBeTruthy();

    // Verify it's gone
    const getRes = await authRequest.get(`/api/category/${id}`);
    const getBody = await getRes.json();
    expect([404, 400]).toContain(getRes.status());
    expect(getBody.status).toBe("ERROR");
  });

  test("TC_CAT_DELETE_category_not_found", async ({ authRequest }) => {
    const res = await authRequest.delete(
      "/api/category/000000000000000000000000"
    );

    // API can be idempotent (200) or strict (404)
    expect([200, 404, 400]).toContain(res.status());
  });

  test("TC_CAT_DELETE_category_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    try {
      const res = await ctx.delete("/api/category/000000000000000000000001");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_CAT_DELETE_category_invalid_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.delete("/api/category/000000000000000000000001");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

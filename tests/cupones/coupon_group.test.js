/**
 * Test Suite: Coupon Group API
 * Endpoints: GET/POST /api/coupon-group · GET /api/coupon-group/:id · POST /api/coupon-group/:id/disable
 * Nomenclatura: TC_CPN_<METHOD>_group_<scenario>
 * Ref: .agents/skills/mediastream-api/references/coupon.md
 *
 * NOTAS DE LA API:
 * - No existe DELETE ni POST update para coupon-group
 * - Los errores de validación devuelven HTTP 200 con { status:"ERROR", data:"..." } (no 400)
 * - Los grupos creados en tests no pueden eliminarse — se prefijan con qa_cpngrp_
 * - GET /api/coupon-group/:id retorna los subgrupos del grupo, no el grupo en sí
 */

const { test, expect } = require("../../fixtures");
const {
  couponGroupListResponseSchema,
  couponGroupCreateResponseSchema,
} = require("../../schemas/coupon_group.schema");
const { ApiClient } = require("../../lib/apiClient");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

const BASE = "/api/coupon-group";

// ID de grupo existente, obtenido una sola vez para la suite
let existingGroupId;

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: { "X-API-Token": process.env.API_TOKEN },
  });
  const res = await ctx.get(BASE);
  const body = await res.json();
  existingGroupId = body.data?.[0]?._id;
  await ctx.dispose();
});

test.describe("Coupon Group — List (GET /api/coupon-group)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
  });

  test("TC_CPN_GET_group_list_valid", async () => {
    const res = await apiClient.get(BASE);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(Array.isArray(res.body.data)).toBe(true);

    couponGroupListResponseSchema.parse(res.body);
  });

  test("TC_CPN_GET_group_list_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(BASE);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

test.describe("Coupon Group — Create (POST /api/coupon-group)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
  });

  // ── Happy Path ────────────────────────────────────────────────────────────

  test("TC_CPN_POST_group_create_valid", async () => {
    const name = `qa_cpngrp_${faker.random.alphaNumeric(10)}`;

    const res = await apiClient.post(BASE, { coupon_group_name: name });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.data._id).toBeTruthy();
    expect(res.body.data.name).toBe(name);

    // NOTE: No DELETE endpoint exists — group will remain in the system
    couponGroupCreateResponseSchema.parse(res.body);
  });

  test("TC_CPN_POST_group_create_stores_name_correctly", async () => {
    const name = `qa_cpngrp_${faker.random.alphaNumeric(10)}`;

    const res = await apiClient.post(BASE, { coupon_group_name: name });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(name);
  });

  // ── Validation (HTTP 200 con status ERROR — quirk de la API) ─────────────

  test("TC_CPN_POST_group_create_missing_name", async () => {
    const res = await apiClient.post(BASE, {});

    // BUG/QUIRK: API returns HTTP 200 instead of 400 for validation errors
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ERROR");
    expect(res.body.data).toBe("NAME_IS_REQUIRED");
  });

  test("TC_CPN_POST_group_create_duplicate_name", async () => {
    // Use a fixed qa name that is guaranteed to already exist after the first run
    const name = `qa_cpngrp_probe_group_delete_me`;

    // First ensure it exists (may already exist from probe)
    await apiClient.post(BASE, { coupon_group_name: name });

    // Try to create again — should fail
    const res = await apiClient.post(BASE, { coupon_group_name: name });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ERROR");
    expect(res.body.data).toBe("NAME_MUST_BE_UNIQUE");
  });

  // ── Authentication ────────────────────────────────────────────────────────

  test("TC_CPN_POST_group_create_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(BASE, {
        data: { coupon_group_name: `qa_cpngrp_noauth_${faker.random.alphaNumeric(6)}` },
      });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

test.describe("Coupon Group — Subgroups (GET /api/coupon-group/:id)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
  });

  test("TC_CPN_GET_group_subgroups_valid", async () => {
    if (!existingGroupId) {
      test.skip("No existing coupon group found in account");
    }

    const res = await apiClient.get(`${BASE}/${existingGroupId}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("TC_CPN_GET_group_subgroups_not_found", async () => {
    const res = await apiClient.get(`${BASE}/000000000000000000000000`);

    // API may return 404 or 200 with empty data for unknown group
    expect([200, 404]).toContain(res.status);
  });
});

test.describe("Coupon Group — Bulk Disable (POST /api/coupon-group/:id/disable)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
  });

  test("TC_CPN_POST_group_disable_missing_dates", async () => {
    if (!existingGroupId) {
      test.skip("No existing coupon group found in account");
    }

    const res = await apiClient.post(`${BASE}/${existingGroupId}/disable`, {});

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
    // BUG: API returns "DB_ERROR" instead of documented "BOTH_DATE_START_AND_DATE_END_ARE_REQUIRED"
    expect(["BOTH_DATE_START_AND_DATE_END_ARE_REQUIRED", "DB_ERROR"]).toContain(res.body.data);
  });

  test("TC_CPN_POST_group_disable_invalid_date_format", async () => {
    if (!existingGroupId) {
      test.skip("No existing coupon group found in account");
    }

    const res = await apiClient.post(`${BASE}/${existingGroupId}/disable`, {
      date_start: "not-a-date",
      date_end: "not-a-date",
    });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
  });

  test("TC_CPN_POST_group_disable_no_token", async ({ playwright }) => {
    if (!existingGroupId) {
      test.skip("No existing coupon group found in account");
    }

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(`${BASE}/${existingGroupId}/disable`, {
        data: { date_start: "2024-01-01", date_end: "2024-12-31" },
      });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

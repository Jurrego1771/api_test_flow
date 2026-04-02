/**
 * Plan de Automatización: Módulo Access Restrictions API
 * Nomenclatura: TC_AR_XXX_<MÉTODO>_<descripción>
 * Ref: doc_api/AR.md | testplan/acces_restriction.md
 *
 * Cubre operaciones de lectura (GET) del endpoint:
 *   GET /api/settings/advanced-access-restrictions
 *   GET /api/settings/advanced-access-restrictions/:id
 *
 * Nota: Las operaciones de escritura (POST/PUT/DELETE) requieren autenticación
 * por sesión de navegador y están pendientes de implementación.
 */

const { test, expect } = require("../../fixtures/accessRestriction.fixture");
require("dotenv").config();

const AR_ENDPOINT = "/api/settings/advanced-access-restrictions";

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST (GET) — autenticación
// ─────────────────────────────────────────────────────────────────────────────

test.describe("1. List (GET /api/settings/advanced-access-restrictions)", () => {
  test("TC_AR_001_GET_ListAllRestrictions", async ({ authRequest }) => {
    const res = await authRequest.get(AR_ENDPOINT);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });

  test("TC_AR_002_GET_ListNoToken_Returns401", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    try {
      const res = await ctx.get(AR_ENDPOINT);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_AR_003_GET_ListInvalidToken_Returns401", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.get(AR_ENDPOINT);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET BY ID — casos negativos
// ─────────────────────────────────────────────────────────────────────────────

test.describe("2. Get by ID (GET /api/settings/advanced-access-restrictions/:id)", () => {
  test("TC_AR_NEG_010_GET_NonExistentRestriction", async ({ authRequest }) => {
    const fakeId = "507f1f77bcf86cd799439011";
    const res = await authRequest.get(`${AR_ENDPOINT}/${fakeId}`);
    expect([404, 500]).toContain(res.status());
  });

  test("TC_AR_NEG_011_GET_InvalidIdFormat", async ({ authRequest }) => {
    const res = await authRequest.get(`${AR_ENDPOINT}/not-a-valid-id`);
    expect([400, 404, 500]).toContain(res.status());
  });
});

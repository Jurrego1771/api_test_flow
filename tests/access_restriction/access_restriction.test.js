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

const AR_ENDPOINT = "/api/settings/advanced-access-restrictions";

// ─────────────────────────────────────────────────────────────────────────────
// 1. LIST (GET) — solo lectura → authRequest
// ─────────────────────────────────────────────────────────────────────────────

test.describe("1. List (GET /api/settings/advanced-access-restrictions)", () => {
  // AR-INTEG-003.1.1
  test("TC_AR_001_GET_ListAllRestrictions", async ({ authRequest }) => {
    const res = await authRequest.get(AR_ENDPOINT);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET BY ID — casos negativos sin datos previos → authRequest
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

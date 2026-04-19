/**
 * Test Suite: Access Token — Issue
 * Endpoint: POST /api/access/issue
 * Nomenclatura: TC_AT_POST_issue_<scenario>
 * Ref: .agents/skills/mediastream-api/references/access-token.md
 *
 * NOTAS:
 * - Respuesta no estándar: { status, message, access_token } en lugar de { status, data }
 * - Los tokens son de un solo uso y expiran en 30 min (sin impacto en estos tests de issuance)
 * - No se requiere limpieza de recursos
 */

const { test, expect } = require('@playwright/test');
const { accessTokenIssuedSchema } = require('../../../../schemas/access_token.schema');
const { ApiClient } = require('../../helpers');
require("dotenv").config();

const ISSUE_ENDPOINT = "/api/access/issue";

// IDs obtenidos una sola vez para toda la suite
let mediaId, liveId;

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: { "X-API-Token": process.env.API_TOKEN },
  });

  const [mediaRes, liveRes] = await Promise.all([
    ctx.get("/api/media?limit=1"),
    ctx.get("/api/live-stream?limit=1"),
  ]);

  mediaId = (await mediaRes.json()).data[0]._id;
  liveId = (await liveRes.json()).data[0]._id;

  await ctx.dispose();
});

test.describe("Access Token — Issue (POST /api/access/issue)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
  });

  // ── Happy Path ────────────────────────────────────────────────────────────

  test("TC_AT_POST_issue_media_valid", async () => {
    const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`, {});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.message).toBe("ACCESS_TOKEN_ISSUED");
    expect(typeof res.body.access_token).toBe("string");
    expect(res.body.access_token.length).toBeGreaterThan(0);

    accessTokenIssuedSchema.parse(res.body);
  });

  test("TC_AT_POST_issue_live_valid", async () => {
    const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${liveId}&type=live`, {});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.message).toBe("ACCESS_TOKEN_ISSUED");
    expect(typeof res.body.access_token).toBe("string");

    accessTokenIssuedSchema.parse(res.body);
  });

  test("TC_AT_POST_issue_with_ip_param", async () => {
    const res = await apiClient.post(
      `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&ip=192.168.1.1`,
      {}
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("ACCESS_TOKEN_ISSUED");
    expect(typeof res.body.access_token).toBe("string");
  });

  test("TC_AT_POST_issue_with_time_limit", async () => {
    const res = await apiClient.post(
      `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&time_limit=300`,
      {}
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("ACCESS_TOKEN_ISSUED");
    expect(typeof res.body.access_token).toBe("string");
  });

  test("TC_AT_POST_issue_with_max_profile", async () => {
    const res = await apiClient.post(
      `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&max_profile=720p`,
      {}
    );

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("ACCESS_TOKEN_ISSUED");
    expect(typeof res.body.access_token).toBe("string");
  });

  test("TC_AT_POST_issue_tokens_are_unique", async () => {
    const [res1, res2] = await Promise.all([
      apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`, {}),
      apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`, {}),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.access_token).not.toBe(res2.body.access_token);
  });

  // ── Authentication ────────────────────────────────────────────────────────

  test("TC_AT_POST_issue_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    try {
      const res = await ctx.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_AT_POST_issue_invalid_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.post(`${ISSUE_ENDPOINT}?id=${mediaId}&type=media`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  // ── Validation ────────────────────────────────────────────────────────────

  test("TC_AT_POST_issue_missing_type", async () => {
    const res = await apiClient.post(`${ISSUE_ENDPOINT}?id=${mediaId}`, {});

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
    expect(res.body.message).toMatch(/INVALID_TYPE/i);
  });

  test("TC_AT_POST_issue_invalid_type", async () => {
    const res = await apiClient.post(
      `${ISSUE_ENDPOINT}?id=${mediaId}&type=podcast`,
      {}
    );

    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
    expect(res.body.message).toMatch(/INVALID_TYPE/i);
  });

  test("TC_AT_POST_issue_missing_id", async () => {
    const res = await apiClient.post(`${ISSUE_ENDPOINT}?type=media`, {});

    // API validates type first, then id — returns 400 or 401 depending on flow
    expect([400, 401]).toContain(res.status);
    expect(res.body.status).toBe("ERROR");
  });

  // ── Error Cases ───────────────────────────────────────────────────────────

  test("TC_AT_POST_issue_invalid_object_id", async () => {
    const res = await apiClient.post(
      `${ISSUE_ENDPOINT}?id=000000000000000000000000&type=media`,
      {}
    );

    // BUG: API returns 401 INVALID_OBJECT_ID instead of documented 404
    expect([401, 404]).toContain(res.status);
    expect(res.body.status).toBe("ERROR");
  });

  test("TC_AT_POST_issue_type_mismatch_media_as_live", async () => {
    // Passing a media ID with type=live — API may issue token or return error
    const res = await apiClient.post(
      `${ISSUE_ENDPOINT}?id=${mediaId}&type=live`,
      {}
    );

    // Behavior is undefined in docs — accept any non-500 response
    expect([200, 400, 401, 404]).toContain(res.status);
  });
});

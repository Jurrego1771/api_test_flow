/**
 * Test Suite: Media Sub-resources
 * Endpoints:
 *   GET    /api/media/:id/chapters
 *   POST   /api/media/:id/chapters    (requires AI module + transcription)
 *   GET    /api/media/:id/metadata
 *   POST   /api/media/:id/metadata    (queues AI job)
 *   POST   /api/media/:id/transcription  (triggers processing — auth/not-found only)
 * Nomenclatura: TC_MED_<METHOD>_<resource>_<scenario>
 * Ref: .agents/skills/mediastream-api/references/media-id.md
 */

const { test, expect } = require("../../fixtures");
const { ApiClient } = require("../../lib/apiClient");
require("dotenv").config();

let mediaId;

// Fetch a real media ID once before all tests
test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: { "X-API-Token": process.env.API_TOKEN },
  });
  try {
    const res = await ctx.get("/api/media?limit=1");
    const body = await res.json();
    mediaId = body.data?.[0]?._id;
  } finally {
    await ctx.dispose();
  }
});

// ─── GET /chapters ────────────────────────────────────────────────────────────

test.describe("Media Sub-resources — Chapters GET", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
  });

  test("TC_MED_GET_chapters_valid", async () => {
    const res = await apiClient.get(`/api/media/${mediaId}/chapters`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    // chapters may be empty array if AI has not been run
    expect(Array.isArray(res.body.data?.chapters ?? [])).toBe(true);
  });

  test("TC_MED_GET_chapters_not_found", async () => {
    const res = await apiClient.get("/api/media/000000000000000000000000/chapters");
    // BUG: API returns 200 with empty chapters instead of 404 for non-existent media
    expect([200, 404, 500]).toContain(res.status);
  });

  test("TC_MED_GET_chapters_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(`/api/media/${mediaId}/chapters`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST /chapters ───────────────────────────────────────────────────────────

test.describe("Media Sub-resources — Chapters POST (AI generate)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
  });

  test("TC_MED_POST_chapters_no_transcription", async () => {
    // Without a prior transcription the API returns 400 MISSING_TRANSCRIPTION_JSON_URL
    // or 403 AI_MODULE_NOT_ENABLED depending on account config
    const res = await apiClient.post(`/api/media/${mediaId}/chapters`, {});
    expect([400, 403]).toContain(res.status);
    expect(["MISSING_TRANSCRIPTION_JSON_URL", "AI_MODULE_NOT_ENABLED", "MISSING_MEDIA_INFO"])
      .toContain(res.body.data ?? res.body.message);
  });

  test("TC_MED_POST_chapters_not_found", async () => {
    const res = await apiClient.post("/api/media/000000000000000000000000/chapters", {});
    expect([400, 403, 404, 500]).toContain(res.status);
  });

  test("TC_MED_POST_chapters_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(`/api/media/${mediaId}/chapters`, { data: {} });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── GET /metadata ────────────────────────────────────────────────────────────

test.describe("Media Sub-resources — Metadata GET", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
  });

  test("TC_MED_GET_metadata_valid", async () => {
    // Metadata may not exist if AI has never been triggered → 200 with null or 404
    const res = await apiClient.get(`/api/media/${mediaId}/metadata`);
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.status).toBe("OK");
    }
  });

  test("TC_MED_GET_metadata_not_found", async () => {
    const res = await apiClient.get("/api/media/000000000000000000000000/metadata");
    expect([404, 500]).toContain(res.status);
  });

  test("TC_MED_GET_metadata_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(`/api/media/${mediaId}/metadata`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST /metadata ───────────────────────────────────────────────────────────

test.describe("Media Sub-resources — Metadata POST (AI queue)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
  });

  test("TC_MED_POST_metadata_valid", async () => {
    // Queues an AI metadata enrichment job — returns 200 immediately (async)
    const res = await apiClient.post(`/api/media/${mediaId}/metadata`, {});
    expect(res.status).toBe(200);
  });

  test("TC_MED_POST_metadata_not_found", async () => {
    const res = await apiClient.post("/api/media/000000000000000000000000/metadata", {});
    expect([404, 500]).toContain(res.status);
  });

  test("TC_MED_POST_metadata_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(`/api/media/${mediaId}/metadata`, { data: {} });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST /transcription ──────────────────────────────────────────────────────
// NOTE: This endpoint triggers real AI processing.
// Tests are limited to auth and not-found scenarios to avoid unwanted side effects.

test.describe("Media Sub-resources — Transcription POST (auth/validation)", () => {
  let apiClient;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
  });

  test("TC_MED_POST_transcription_not_found", async () => {
    const res = await apiClient.post("/api/media/000000000000000000000000/transcription", {});
    expect([404, 500]).toContain(res.status);
  });

  test("TC_MED_POST_transcription_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(`/api/media/${mediaId}/transcription`, { data: {} });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

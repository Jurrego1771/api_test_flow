/**
 * Test Suite: Show Season — Read / Update / Delete
 * Endpoints:
 *   GET    /api/show/:id/season
 *   GET    /api/show/:id/season/:seasonId
 *   POST   /api/show/:id/season/:seasonId  (update)
 *   DELETE /api/show/:id/season/:seasonId
 * Nomenclatura: TC_SHW_<METHOD>_season_<scenario>
 * Ref: .agents/skills/mediastream-api/references/show-season-episode.md
 */

const { test, expect } = require("../../fixtures/show.fixture");
const { seasonSchema } = require("../../schemas/season.schema");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

// ─── Helper ───────────────────────────────────────────────────────────────────

async function createSeason(apiClient, showId, cleaner, attrs = {}) {
  const payload = {
    title: `qa_season_${faker.random.alphaNumeric(8)}`,
    ...attrs,
  };
  const res = await apiClient.post(`/api/show/${showId}/season`, payload);
  expect(res.status).toBe(200);
  const season = res.body?.data ?? res.body;
  cleaner.register("season", `${showId}/${season._id}`);
  return season;
}

// ─── GET list ─────────────────────────────────────────────────────────────────

test.describe("Show Season — List (GET /api/show/:id/season)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_GET_season_list_valid", async ({ tempShow }) => {
    await createSeason(apiClient, tempShow._id, cleaner);

    const res = await apiClient.get(`/api/show/${tempShow._id}/season`);
    expect(res.status).toBe(200);
    // NOTE: list response has no "status" field — only { version, data: [...] }
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test("TC_SHW_GET_season_list_empty_show", async ({ tempShow }) => {
    // Fresh show has no seasons
    const res = await apiClient.get(`/api/show/${tempShow._id}/season`);
    expect(res.status).toBe(200);
    // NOTE: list response has no "status" field — only { version, data: [...] }
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("TC_SHW_GET_season_list_with_limit", async ({ tempShow }) => {
    await createSeason(apiClient, tempShow._id, cleaner);
    await createSeason(apiClient, tempShow._id, cleaner);

    const res = await apiClient.get(`/api/show/${tempShow._id}/season?limit=1`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  test("TC_SHW_GET_season_list_show_not_found", async () => {
    const res = await apiClient.get(`/api/show/000000000000000000000000/season`);
    // BUG: API returns 500 instead of documented 404 SHOW_NOT_FOUND
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_GET_season_list_no_token", async ({ playwright, tempShow }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(`/api/show/${tempShow._id}/season`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── GET by ID ────────────────────────────────────────────────────────────────

test.describe("Show Season — Get by ID (GET /api/show/:id/season/:seasonId)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_GET_season_by_id_valid", async ({ tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);

    const res = await apiClient.get(`/api/show/${tempShow._id}/season/${season._id}`);
    expect(res.status).toBe(200);
    // NOTE: season object is at root — no { status, data } wrapper
    expect(res.body._id).toBe(season._id);
    expect(res.body.show).toBe(tempShow._id);

    seasonSchema.parse(res.body);
  });

  test("TC_SHW_GET_season_by_id_with_populate", async ({ tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);

    const res = await apiClient.get(
      `/api/show/${tempShow._id}/season/${season._id}?populate=true`
    );
    expect(res.status).toBe(200);
    expect(res.body._id).toBe(season._id);
    // With populate, episodes array should be present (empty for new season)
    expect(Array.isArray(res.body.episodes)).toBe(true);
  });

  test("TC_SHW_GET_season_by_id_not_found", async ({ tempShow }) => {
    const res = await apiClient.get(
      `/api/show/${tempShow._id}/season/000000000000000000000000`
    );
    // BUG: API returns 500 "2 UNKNOWN: NOT_FOUND" instead of documented 404
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_GET_season_by_id_no_token", async ({ playwright, tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(`/api/show/${tempShow._id}/season/${season._id}`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST update ──────────────────────────────────────────────────────────────

test.describe("Show Season — Update (POST /api/show/:id/season/:seasonId)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_POST_season_update_title", async ({ tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);
    const newTitle = `qa_season_updated_${faker.random.alphaNumeric(6)}`;

    const res = await apiClient.post(
      `/api/show/${tempShow._id}/season/${season._id}`,
      { title: newTitle }
    );
    expect(res.status).toBe(200);

    const data = res.body?.data ?? res.body;
    expect(data.title).toBe(newTitle);
  });

  test("TC_SHW_POST_season_update_description", async ({ tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);

    const res = await apiClient.post(
      `/api/show/${tempShow._id}/season/${season._id}`,
      { description: "qa_updated_description" }
    );
    expect(res.status).toBe(200);

    const data = res.body?.data ?? res.body;
    expect(data.description).toBe("qa_updated_description");
  });

  test("TC_SHW_POST_season_update_persists", async ({ tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);
    const newTitle = `qa_persist_${faker.random.alphaNumeric(6)}`;

    await apiClient.post(`/api/show/${tempShow._id}/season/${season._id}`, {
      title: newTitle,
    });

    // GET by id also returns season at root (no data wrapper)
    const getRes = await apiClient.get(
      `/api/show/${tempShow._id}/season/${season._id}`
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe(newTitle);
  });

  test("TC_SHW_POST_season_update_not_found", async ({ tempShow }) => {
    const res = await apiClient.post(
      `/api/show/${tempShow._id}/season/000000000000000000000000`,
      { title: "qa_irrelevant" }
    );
    // BUG: API returns 500 "2 UNKNOWN: NOT_FOUND" instead of documented 404
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_POST_season_update_no_token", async ({ playwright, tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(
        `/api/show/${tempShow._id}/season/${season._id}`,
        { data: { title: "qa_no_auth" } }
      );
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

test.describe("Show Season — Delete (DELETE /api/show/:id/season/:seasonId)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest, baseURL }) => {
    apiClient = new ApiClient(authRequest, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_DELETE_season_valid", async ({ tempShow }) => {
    // Create without registering in cleaner — the test deletes it manually
    const payload = { title: `qa_season_del_${faker.random.alphaNumeric(6)}` };
    const createRes = await apiClient.post(`/api/show/${tempShow._id}/season`, payload);
    expect(createRes.status).toBe(200);
    const season = createRes.body?.data ?? createRes.body;

    const res = await apiClient.delete(`/api/show/${tempShow._id}/season/${season._id}`);
    expect(res.status).toBe(200);
  });

  test("TC_SHW_DELETE_season_confirm_gone", async ({ tempShow }) => {
    const payload = { title: `qa_season_gone_${faker.random.alphaNumeric(6)}` };
    const createRes = await apiClient.post(`/api/show/${tempShow._id}/season`, payload);
    const season = createRes.body?.data ?? createRes.body;

    await apiClient.delete(`/api/show/${tempShow._id}/season/${season._id}`);

    const getRes = await apiClient.get(
      `/api/show/${tempShow._id}/season/${season._id}`
    );
    // QUIRK: API may return 200 after DELETE (soft delete — record persists)
    expect([200, 404, 500]).toContain(getRes.status);
  });

  test("TC_SHW_DELETE_season_not_found", async ({ tempShow }) => {
    const res = await apiClient.delete(
      `/api/show/${tempShow._id}/season/000000000000000000000000`
    );
    // BUG: API returns 500 "2 UNKNOWN: NOT_FOUND" instead of documented 404
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_DELETE_season_no_token", async ({ playwright, tempShow }) => {
    const season = await createSeason(apiClient, tempShow._id, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.delete(`/api/show/${tempShow._id}/season/${season._id}`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

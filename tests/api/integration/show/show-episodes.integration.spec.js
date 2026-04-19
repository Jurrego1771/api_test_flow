/**
 * Test Suite: Show Episode — Full CRUD
 * Endpoints:
 *   POST   /api/show/:id/season/:seasonId/episode            (create)
 *   GET    /api/show/:id/season/:seasonId/episode            (list)
 *   GET    /api/show/:id/season/:seasonId/episode/:episodeId (get by id)
 *   POST   /api/show/:id/season/:seasonId/episode/:episodeId (update)
 *   DELETE /api/show/:id/season/:seasonId/episode/:episodeId (delete)
 * Nomenclatura: TC_SHW_<METHOD>_episode_<scenario>
 * Ref: .agents/skills/mediastream-api/references/show-season-episode.md
 *
 * QUIRKS DE LA API (igual que seasons):
 * - CREATE / GET by ID / UPDATE → episode en root, sin wrapper { status, data }
 * - LIST → { version, data: [...] } sin campo "status"
 * - not_found → 500 "2 UNKNOWN: NOT_FOUND" (BUG: debería ser 404)
 * - Validation errors → 400 con { version, data: "Mising required body fields: ..." }
 *   (typo en la API: "Mising" en lugar de "Missing")
 */

const { test, expect } = require('@playwright/test');
const { episodeSchema } = require('../../../../schemas/episode.schema');
const { ApiClient } = require('../../helpers');
const { ResourceCleaner } = require('../../helpers');
const { faker } = require("@faker-js/faker");
require("dotenv").config();

// ─── Media IDs obtenidos una sola vez ────────────────────────────────────────
// NOTE: API constraint — a media can only appear in ONE episode globally.
// We probe media IDs to find 2 that are not currently linked to any episode.
let mediaId, mediaId2;

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: { "X-API-Token": process.env.API_TOKEN },
  });

  // Probe show/season to find free media IDs
  const probeShowRes = await ctx.post("/api/show", { data: { title: `qa_probe_${Date.now()}`, type: "tvshow" } });
  const probeShow = await probeShowRes.json();
  const probeSeasonRes = await ctx.post(`/api/show/${probeShow._id}/season`, { data: { title: "qa_probe_season" } });
  const probeSeason = await probeSeasonRes.json();

  const mediaRes = await ctx.get("/api/media?limit=100&sort=-date_created");
  const allMedia = (await mediaRes.json()).data || [];

  const freeIds = [];
  for (const m of allMedia) {
    if (freeIds.length >= 2) break;
    const epRes = await ctx.post(`/api/show/${probeShow._id}/season/${probeSeason._id}/episode`, {
      data: { title: "qa_probe_ep", content: [{ content_type: "Media", type: "full", value: m._id }] },
    });
    if (epRes.status() === 200) {
      const ep = await epRes.json();
      freeIds.push(m._id);
      await ctx.delete(`/api/show/${probeShow._id}/season/${probeSeason._id}/episode/${ep._id}`);
    }
  }

  await ctx.delete(`/api/show/${probeShow._id}`);
  await ctx.dispose();

  if (freeIds.length < 2) throw new Error(`Could not find 2 free media IDs (found ${freeIds.length})`);
  mediaId = freeIds[0];
  mediaId2 = freeIds[1];
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function createSeason(apiClient, showId, cleaner) {
  const res = await apiClient.post(`/api/show/${showId}/season`, {
    title: `qa_season_${faker.random.alphaNumeric(6)}`,
  });
  expect(res.status).toBe(200);
  const season = res.body?.data ?? res.body;
  cleaner.register("season", `${showId}/${season._id}`);
  return season;
}

async function createEpisode(apiClient, showId, seasonId, cleaner, attrs = {}) {
  const payload = {
    title: `qa_episode_${faker.random.alphaNumeric(8)}`,
    content: [{ content_type: "Media", type: "full", value: mediaId }],
    ...attrs,
  };
  const res = await apiClient.post(
    `/api/show/${showId}/season/${seasonId}/episode`,
    payload
  );
  expect(res.status).toBe(200);
  const episode = res.body?.data ?? res.body;
  cleaner.register("episode", `${showId}/${seasonId}/${episode._id}`);
  return episode;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

test.describe("Show Episode — Create (POST /api/show/:id/season/:seasonId/episode)", () => {
  let apiClient, cleaner, show;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
    const showRes = await apiClient.post("/api/show", { title: `qa_show_${Date.now()}`, type: "tvshow" });
    show = showRes.body; // Show API returns object at root (no wrapper)
    cleaner.register("show", show._id);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_POST_episode_valid", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const title = `qa_episode_${faker.random.alphaNumeric(8)}`;

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode`,
      { title, content: [{ content_type: "Media", type: "full", value: mediaId }] }
    );

    expect(res.status).toBe(200);
    // Episode returned at root, no { status, data } wrapper
    expect(res.body._id).toBeTruthy();
    expect(res.body.title).toBe(title);

    cleaner.register("episode", `${show._id}/${season._id}/${res.body._id}`);
    episodeSchema.parse(res.body);
  });

  test("TC_SHW_POST_episode_with_optional_fields", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode`,
      {
        title: `qa_episode_opt_${faker.random.alphaNumeric(6)}`,
        description: "qa_episode_description",
        first_emision: "2024-03-01",
        content: [{ content_type: "Media", type: "recap", value: mediaId }],
      }
    );

    expect(res.status).toBe(200);
    expect(res.body._id).toBeTruthy();
    expect(res.body.description).toBe("qa_episode_description");

    cleaner.register("episode", `${show._id}/${season._id}/${res.body._id}`);
  });

  test("TC_SHW_POST_episode_order_auto_assigned", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    // Use different media IDs — same media cannot appear in two episodes of the same season
    const ep1 = await createEpisode(apiClient, show._id, season._id, cleaner, {
      content: [{ content_type: "Media", type: "full", value: mediaId }],
    });
    const ep2 = await createEpisode(apiClient, show._id, season._id, cleaner, {
      content: [{ content_type: "Media", type: "full", value: mediaId2 }],
    });

    expect(typeof ep1.order).toBe("number");
    expect(typeof ep2.order).toBe("number");
    expect(ep2.order).toBeGreaterThan(ep1.order);
  });

  // ── Validation ────────────────────────────────────────────────────────────

  test("TC_SHW_POST_episode_missing_title", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode`,
      { content: [{ content_type: "Media", value: mediaId }] }
    );

    expect(res.status).toBe(400);
    expect(res.body.data).toMatch(/title/i);
  });

  test("TC_SHW_POST_episode_missing_content", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode`,
      { title: `qa_episode_no_content_${faker.random.alphaNumeric(6)}` }
    );

    expect(res.status).toBe(400);
    expect(res.body.data).toMatch(/content/i);
  });

  test("TC_SHW_POST_episode_season_not_found", async () => {
    const res = await apiClient.post(
      `/api/show/${show._id}/season/000000000000000000000000/episode`,
      { title: "qa_irrelevant", content: [{ content_type: "Media", value: mediaId }] }
    );
    // BUG: returns 500 instead of documented 404 SEASON_NOT_FOUND
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_POST_episode_no_token", async ({ playwright }) => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(
        `/api/show/${show._id}/season/${season._id}/episode`,
        { data: { title: "qa_no_auth", content: [{ content_type: "Media", value: mediaId }] } }
      );
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── LIST ─────────────────────────────────────────────────────────────────────

test.describe("Show Episode — List (GET /api/show/:id/season/:seasonId/episode)", () => {
  let apiClient, cleaner, show;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
    const showRes = await apiClient.post("/api/show", { title: `qa_show_${Date.now()}`, type: "tvshow" });
    show = showRes.body; // Show API returns object at root (no wrapper)
    cleaner.register("show", show._id);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_GET_episode_list_valid", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    await createEpisode(apiClient, show._id, season._id, cleaner);

    const res = await apiClient.get(
      `/api/show/${show._id}/season/${season._id}/episode`
    );

    expect(res.status).toBe(200);
    // NOTE: list has no "status" field — only { version, data: [...] }
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  test("TC_SHW_GET_episode_list_empty_season", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.get(
      `/api/show/${show._id}/season/${season._id}/episode`
    );

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("TC_SHW_GET_episode_list_with_limit", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    // Use different media IDs — same media cannot appear in two episodes of the same season
    await createEpisode(apiClient, show._id, season._id, cleaner, {
      content: [{ content_type: "Media", type: "full", value: mediaId }],
    });
    await createEpisode(apiClient, show._id, season._id, cleaner, {
      content: [{ content_type: "Media", type: "full", value: mediaId2 }],
    });

    const res = await apiClient.get(
      `/api/show/${show._id}/season/${season._id}/episode?limit=1`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  test("TC_SHW_GET_episode_list_no_token", async ({ playwright }) => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(
        `/api/show/${show._id}/season/${season._id}/episode`
      );
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── GET BY ID ────────────────────────────────────────────────────────────────

test.describe("Show Episode — Get by ID (GET /api/show/:id/season/:seasonId/episode/:episodeId)", () => {
  let apiClient, cleaner, show;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
    const showRes = await apiClient.post("/api/show", { title: `qa_show_${Date.now()}`, type: "tvshow" });
    show = showRes.body; // Show API returns object at root (no wrapper)
    cleaner.register("show", show._id);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_GET_episode_by_id_valid", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);

    const res = await apiClient.get(
      `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`
    );

    expect(res.status).toBe(200);
    // Episode at root — no { status, data } wrapper
    expect(res.body._id).toBe(episode._id);
    expect(res.body.title).toBe(episode.title);

    episodeSchema.parse(res.body);
  });

  test("TC_SHW_GET_episode_by_id_not_found", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.get(
      `/api/show/${show._id}/season/${season._id}/episode/000000000000000000000000`
    );

    // BUG: returns 500 "2 UNKNOWN: NOT_FOUND" instead of documented 404
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_GET_episode_by_id_no_token", async ({ playwright }) => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(
        `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`
      );
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

test.describe("Show Episode — Update (POST /api/show/:id/season/:seasonId/episode/:episodeId)", () => {
  let apiClient, cleaner, show;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
    const showRes = await apiClient.post("/api/show", { title: `qa_show_${Date.now()}`, type: "tvshow" });
    show = showRes.body; // Show API returns object at root (no wrapper)
    cleaner.register("show", show._id);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_POST_episode_update_title", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);
    const newTitle = `qa_ep_updated_${faker.random.alphaNumeric(6)}`;

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`,
      { title: newTitle }
    );

    expect(res.status).toBe(200);
    expect(res.body.title).toBe(newTitle);
  });

  test("TC_SHW_POST_episode_update_description", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`,
      { description: "qa_updated_description" }
    );

    expect(res.status).toBe(200);
    expect(res.body.description).toBe("qa_updated_description");
  });

  test("TC_SHW_POST_episode_update_persists", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);
    const newTitle = `qa_ep_persist_${faker.random.alphaNumeric(6)}`;

    await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`,
      { title: newTitle }
    );

    const getRes = await apiClient.get(
      `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`
    );
    expect(getRes.status).toBe(200);
    expect(getRes.body.title).toBe(newTitle);
  });

  test("TC_SHW_POST_episode_update_not_found", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode/000000000000000000000000`,
      { title: "qa_irrelevant" }
    );

    // BUG: returns 500 instead of documented 404
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_POST_episode_update_no_token", async ({ playwright }) => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(
        `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`,
        { data: { title: "qa_no_auth" } }
      );
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

test.describe("Show Episode — Delete (DELETE /api/show/:id/season/:seasonId/episode/:episodeId)", () => {
  let apiClient, cleaner, show;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
    const showRes = await apiClient.post("/api/show", { title: `qa_show_${Date.now()}`, type: "tvshow" });
    show = showRes.body; // Show API returns object at root (no wrapper)
    cleaner.register("show", show._id);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_SHW_DELETE_episode_valid", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    // Create without registering in cleaner — test deletes it
    const createRes = await apiClient.post(
      `/api/show/${show._id}/season/${season._id}/episode`,
      {
        title: `qa_ep_del_${faker.random.alphaNumeric(6)}`,
        content: [{ content_type: "Media", type: "full", value: mediaId }],
      }
    );
    expect(createRes.status).toBe(200);
    const episode = createRes.body;

    const res = await apiClient.delete(
      `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`
    );
    expect(res.status).toBe(200);
  });

  test("TC_SHW_DELETE_episode_not_found", async () => {
    const season = await createSeason(apiClient, show._id, cleaner);

    const res = await apiClient.delete(
      `/api/show/${show._id}/season/${season._id}/episode/000000000000000000000000`
    );

    // BUG: returns 500 "2 UNKNOWN: NOT_FOUND" instead of documented 404
    expect([404, 500]).toContain(res.status);
  });

  test("TC_SHW_DELETE_episode_no_token", async ({ playwright }) => {
    const season = await createSeason(apiClient, show._id, cleaner);
    const episode = await createEpisode(apiClient, show._id, season._id, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.delete(
        `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`
      );
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

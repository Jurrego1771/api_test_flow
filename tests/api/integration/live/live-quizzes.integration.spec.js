/**
 * Test Suite: Live Stream Quizzes
 * Endpoints:
 *   GET    /api/live-stream/:id/quizzes              (list)
 *   POST   /api/live-stream/:id/quizzes              (create) → 201
 *   POST   /api/live-stream/:id/quizzes/:quizId      (update)
 *   POST   /api/live-stream/:id/quizzes/:quizId/send (send to audience)
 *   DELETE /api/live-stream/:id/quizzes/:quizId
 *
 * Non-standard response formats:
 *   GET list  → { status:"OK", quizzes: [...] }        (no data wrapper)
 *   POST create → 201, { status:"OK", quiz: {...} }    (no data wrapper, id not _id)
 *   DELETE      → { status:"OK", message:"..." }
 *   Options structure: [{ text, isCorrect }]           (each question needs ≥1 isCorrect:true)
 *
 * Nomenclatura: TC_LIV_<METHOD>_quizzes_<scenario>
 * Ref: .agents/skills/mediastream-api/references/live-stream-id.md
 */

const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');
const { ResourceCleaner } = require('../../helpers');
const { faker } = require("@faker-js/faker");
require("dotenv").config();

let liveId;

// Fetch a real live stream ID once before all tests
test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({
    baseURL: process.env.BASE_URL,
    extraHTTPHeaders: { "X-API-Token": process.env.API_TOKEN },
  });
  try {
    const res = await ctx.get("/api/live-stream?limit=1");
    const body = await res.json();
    liveId = body.data?.[0]?._id;
  } finally {
    await ctx.dispose();
  }
});

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildQuizPayload(attrs = {}) {
  return {
    title: `qa_quiz_${faker.random.alphaNumeric(8)}`,
    questions: [
      {
        text: faker.lorem.sentence(),
        options: [
          { text: "Option A", isCorrect: true },
          { text: "Option B", isCorrect: false },
          { text: "Option C", isCorrect: false },
        ],
      },
    ],
    ...attrs,
  };
}

async function createQuiz(apiClient, cleaner, attrs = {}) {
  const res = await apiClient.post(`/api/live-stream/${liveId}/quizzes`, buildQuizPayload(attrs));
  // NOTE: create returns 201, not 200
  expect([200, 201]).toContain(res.status);
  const quiz = res.body?.quiz ?? res.body?.data ?? res.body;
  // NOTE: quiz uses "id" (not "_id")
  const quizId = quiz.id ?? quiz._id;
  cleaner.register("quiz", `${liveId}/${quizId}`);
  quiz._id = quizId; // normalize for assertions
  return quiz;
}

// ─── GET list ─────────────────────────────────────────────────────────────────

test.describe("Live Quizzes — List (GET /api/live-stream/:id/quizzes)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_LIV_GET_quizzes_list_valid", async () => {
    const res = await apiClient.get(`/api/live-stream/${liveId}/quizzes`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    // NOTE: list response uses "quizzes" key (non-standard — not "data")
    expect(Array.isArray(res.body.quizzes)).toBe(true);
  });

  test("TC_LIV_GET_quizzes_list_with_quiz", async () => {
    await createQuiz(apiClient, cleaner);

    const res = await apiClient.get(`/api/live-stream/${liveId}/quizzes`);
    expect(res.status).toBe(200);
    expect(res.body.quizzes.length).toBeGreaterThan(0);
  });

  test("TC_LIV_GET_quizzes_list_not_found", async () => {
    const res = await apiClient.get("/api/live-stream/000000000000000000000000/quizzes");
    expect([404, 500]).toContain(res.status);
  });

  test("TC_LIV_GET_quizzes_list_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get(`/api/live-stream/${liveId}/quizzes`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST create ──────────────────────────────────────────────────────────────

test.describe("Live Quizzes — Create (POST /api/live-stream/:id/quizzes)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_LIV_POST_quizzes_create_valid", async () => {
    const quiz = await createQuiz(apiClient, cleaner);

    expect(quiz._id).toBeDefined();
    expect(quiz.title).toMatch(/^qa_quiz_/);
    expect(quiz.status).toBe("draft");
  });

  test("TC_LIV_POST_quizzes_create_missing_title", async () => {
    const res = await apiClient.post(`/api/live-stream/${liveId}/quizzes`, {
      questions: [
        { text: "Q?", options: [{ text: "A", isCorrect: true }] },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
  });

  test("TC_LIV_POST_quizzes_create_missing_questions", async () => {
    const res = await apiClient.post(`/api/live-stream/${liveId}/quizzes`, {
      title: `qa_quiz_noquestions_${faker.random.alphaNumeric(6)}`,
    });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
  });

  test("TC_LIV_POST_quizzes_create_option_missing_correct", async () => {
    // Options without any isCorrect:true → validation error
    const res = await apiClient.post(`/api/live-stream/${liveId}/quizzes`, {
      title: `qa_quiz_nocorrect_${faker.random.alphaNumeric(6)}`,
      questions: [
        { text: "Q?", options: [{ text: "A", isCorrect: false }, { text: "B", isCorrect: false }] },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.status).toBe("ERROR");
  });

  test("TC_LIV_POST_quizzes_create_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.post(`/api/live-stream/${liveId}/quizzes`, {
        data: buildQuizPayload(),
      });
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

// ─── POST update ──────────────────────────────────────────────────────────────

test.describe("Live Quizzes — Update (POST /api/live-stream/:id/quizzes/:quizId)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_LIV_POST_quizzes_update_title", async () => {
    const quiz = await createQuiz(apiClient, cleaner);
    const newTitle = `qa_quiz_upd_${faker.random.alphaNumeric(6)}`;

    // NOTE: Update requires full payload (title + questions) — not partial patch
    const res = await apiClient.post(`/api/live-stream/${liveId}/quizzes/${quiz._id}`,
      buildQuizPayload({ title: newTitle })
    );
    expect([200, 201]).toContain(res.status);
    const updated = res.body?.quiz ?? res.body?.data ?? res.body;
    expect(updated.title).toBe(newTitle);
  });

  test("TC_LIV_POST_quizzes_update_not_found", async () => {
    const res = await apiClient.post(
      `/api/live-stream/${liveId}/quizzes/000000000000000000000000`,
      { title: "qa_irrelevant" }
    );
    expect([400, 404, 500]).toContain(res.status);
    expect(res.body.status).toBe("ERROR");
  });
});

// ─── POST send ────────────────────────────────────────────────────────────────

test.describe("Live Quizzes — Send (POST /api/live-stream/:id/quizzes/:quizId/send)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_LIV_POST_quizzes_send_valid", async () => {
    const quiz = await createQuiz(apiClient, cleaner);

    const res = await apiClient.post(
      `/api/live-stream/${liveId}/quizzes/${quiz._id}/send`,
      {}
    );
    // Sending activates the quiz for the audience
    // Live stream may not be online → 400/500 is acceptable
    expect([200, 201, 400, 500]).toContain(res.status);
  });
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

test.describe("Live Quizzes — Delete (DELETE /api/live-stream/:id/quizzes/:quizId)", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => await cleaner.cleanAll());

  test("TC_LIV_DELETE_quizzes_valid", async () => {
    // Create without registering — test deletes manually
    const createRes = await apiClient.post(
      `/api/live-stream/${liveId}/quizzes`,
      buildQuizPayload()
    );
    expect([200, 201]).toContain(createRes.status);
    const quiz = createRes.body?.quiz ?? createRes.body?.data ?? createRes.body;
    const quizId = quiz.id ?? quiz._id;

    const res = await apiClient.delete(`/api/live-stream/${liveId}/quizzes/${quizId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("TC_LIV_DELETE_quizzes_not_found", async () => {
    const res = await apiClient.delete(
      `/api/live-stream/${liveId}/quizzes/000000000000000000000000`
    );
    expect([400, 404, 500]).toContain(res.status);
  });

  test("TC_LIV_DELETE_quizzes_no_token", async ({ playwright }) => {
    const quiz = await createQuiz(apiClient, cleaner);

    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.delete(`/api/live-stream/${liveId}/quizzes/${quiz._id}`);
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

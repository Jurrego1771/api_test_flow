/**
 * Test Suite: Webhooks — Configuration CRUD
 * Nomenclatura: TC_WHK_XXX
 *
 * Endpoints:
 *   GET    /api/settings/webhooks
 *   POST   /api/settings/webhooks                  → create
 *   POST   /api/settings/webhooks/:webhook_id       → update
 *   DELETE /api/settings/webhooks/:webhook_id       → delete
 *   GET    /api/settings/webhooks/:webhook_id/history
 *
 * Auth: REQUIERE Authorization: Bearer <JWT>  (NO X-API-Token hex)
 *       Definir WEBHOOK_JWT en .env (o usar SHOW_API_TOKEN como fallback).
 *
 * Notas:
 *   - Máximo 3 webhooks por cuenta (devuelve 402 si se supera el límite).
 *   - Cada test limpia el webhook que crea en afterEach.
 */

const { test, expect } = require("../../fixtures/webhookRequest.fixture");
const {
  webhookSchema,
  webhookListResponseSchema,
  webhookHistoryResponseSchema,
} = require("../../schemas/webhook.schema");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

const RECEIVER_URL =
  process.env.WEBHOOK_RECEIVER_URL || "https://httpbin.org/post";

const NONEXISTENT_ID = "507f1f77bcf86cd799439011";

// ---------------------------------------------------------------------------
// Helper: crea un webhook y devuelve { res, body, id }
// ---------------------------------------------------------------------------
async function createWebhook(webhookRequest, attrs = {}) {
  const res = await webhookRequest.post("/api/settings/webhooks", {
    data: {
      name: `qa_whk_${faker.random.alphaNumeric(8)}`,
      url: RECEIVER_URL,
      notify_on: ["medias.create"],
      ...attrs,
    },
  });
  const body = await res.json();
  return { res, body, id: body?.data?._id };
}

// ---------------------------------------------------------------------------
test.describe("Webhooks — Configuration CRUD", () => {
  let webhookId = null;

  test.afterEach(async ({ webhookRequest }) => {
    if (webhookId) {
      await webhookRequest
        .delete(`/api/settings/webhooks/${webhookId}`)
        .catch(() => {});
      webhookId = null;
    }
  });

  // ── CREATE ────────────────────────────────────────────────────────────────

  test("TC_WHK_001 — POST create webhook with valid data", async ({
    webhookRequest,
  }) => {
    const name = `qa_whk_${faker.random.alphaNumeric(8)}`;
    const notifyOn = ["medias.create", "medias.update", "medias.delete"];

    const res = await webhookRequest.post("/api/settings/webhooks", {
      data: { name, url: RECEIVER_URL, notify_on: notifyOn },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data._id).toBeTruthy();
    expect(body.data.name).toBe(name);
    expect(body.data.url).toBe(RECEIVER_URL);
    expect(body.data.notify_on).toEqual(expect.arrayContaining(notifyOn));
    expect(body.data.enabled).toBe(true);

    const parsed = webhookSchema.safeParse(body.data);
    expect(parsed.success, `Schema error: ${JSON.stringify(parsed.error)}`).toBe(true);

    webhookId = body.data._id;
  });

  test("TC_WHK_002 — POST create webhook minimal (no url, no notify_on)", async ({
    webhookRequest,
  }) => {
    const name = `qa_whk_min_${faker.random.alphaNumeric(6)}`;

    const res = await webhookRequest.post("/api/settings/webhooks", {
      data: { name },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data._id).toBeTruthy();
    expect(body.data.name).toBe(name);

    webhookId = body.data._id;
  });

  // ── LIST ──────────────────────────────────────────────────────────────────

  test("TC_WHK_010 — GET list webhooks includes created webhook", async ({
    webhookRequest,
  }) => {
    const { body: createBody, id } = await createWebhook(webhookRequest);
    webhookId = id;

    const res = await webhookRequest.get("/api/settings/webhooks");
    expect(res.status()).toBe(200);
    const body = await res.json();

    const parsed = webhookListResponseSchema.safeParse(body);
    expect(parsed.success, `Schema error: ${JSON.stringify(parsed.error)}`).toBe(true);

    const found = body.data.find((w) => w._id === webhookId);
    expect(found).toBeDefined();
    expect(found.name).toBe(createBody.data.name);
  });

  test("TC_WHK_011 — GET list webhooks returns array with stats", async ({
    webhookRequest,
  }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = id;

    const res = await webhookRequest.get("/api/settings/webhooks");
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data)).toBe(true);

    const found = body.data.find((w) => w._id === webhookId);
    expect(found).toBeDefined();
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test("TC_WHK_020 — POST update webhook name", async ({ webhookRequest }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = id;

    const newName = `qa_whk_upd_${faker.random.alphaNumeric(8)}`;
    const res = await webhookRequest.post(`/api/settings/webhooks/${webhookId}`, {
      data: { name: newName },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.name).toBe(newName);
    expect(body.data._id).toBe(webhookId);
  });

  test("TC_WHK_021 — POST update webhook notify_on events", async ({
    webhookRequest,
  }) => {
    const { id } = await createWebhook(webhookRequest, {
      notify_on: ["medias.create"],
    });
    webhookId = id;

    const newEvents = ["medias.create", "medias.update", "medias.delete", "categories.create"];
    const res = await webhookRequest.post(`/api/settings/webhooks/${webhookId}`, {
      data: { notify_on: newEvents },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.notify_on).toEqual(expect.arrayContaining(newEvents));
  });

  test("TC_WHK_022 — POST update webhook url", async ({ webhookRequest }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = id;

    const newUrl = "https://httpbin.org/anything";
    const res = await webhookRequest.post(`/api/settings/webhooks/${webhookId}`, {
      data: { url: newUrl },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(body.data.url).toBe(newUrl);
  });

  test("TC_WHK_023 — POST update non-existent webhook returns 404", async ({
    webhookRequest,
  }) => {
    const res = await webhookRequest.post(
      `/api/settings/webhooks/${NONEXISTENT_ID}`,
      { data: { name: "should_fail" } }
    );

    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.status).toBe("ERROR");
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  test("TC_WHK_030 — DELETE webhook successfully", async ({ webhookRequest }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = null; // se elimina manualmente

    const res = await webhookRequest.delete(`/api/settings/webhooks/${id}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");

    // Verificar que ya no aparece en el listado
    const listRes = await webhookRequest.get("/api/settings/webhooks");
    const listBody = await listRes.json();
    const found = listBody.data.find((w) => w._id === id);
    expect(found).toBeUndefined();
  });

  test("TC_WHK_031 — DELETE non-existent webhook returns 404", async ({
    webhookRequest,
  }) => {
    const res = await webhookRequest.delete(
      `/api/settings/webhooks/${NONEXISTENT_ID}`
    );
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body.status).toBe("ERROR");
  });

  // ── HISTORY ───────────────────────────────────────────────────────────────

  test("TC_WHK_040 — GET history of new webhook returns empty logs", async ({
    webhookRequest,
  }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = id;

    const res = await webhookRequest.get(
      `/api/settings/webhooks/${webhookId}/history`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();

    const parsed = webhookHistoryResponseSchema.safeParse(body);
    expect(parsed.success, `Schema error: ${JSON.stringify(parsed.error)}`).toBe(true);
    expect(body.data.logs).toEqual([]);
    expect(body.data.has_more).toBe(false);
  });

  test("TC_WHK_041 — GET history supports limit query param", async ({
    webhookRequest,
  }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = id;

    const res = await webhookRequest.get(
      `/api/settings/webhooks/${webhookId}/history?limit=5`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("OK");
    expect(Array.isArray(body.data.logs)).toBe(true);
    expect(body.data.logs.length).toBeLessThanOrEqual(5);
  });

  test("TC_WHK_042 — GET history with invalid obj_id returns 400", async ({
    webhookRequest,
  }) => {
    const { id } = await createWebhook(webhookRequest);
    webhookId = id;

    const res = await webhookRequest.get(
      `/api/settings/webhooks/${webhookId}/history?obj_id=not-a-valid-id`
    );
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.status).toBe("ERROR");
  });

  // ── AUTH ──────────────────────────────────────────────────────────────────

  test("TC_WHK_050 — GET webhooks without Authorization returns redirect/401", async ({
    playwright,
  }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    const res = await ctx.get("/api/settings/webhooks");
    // Sin JWT redirige a /?expired=true (200 del HTML) o devuelve 401/403
    expect([200, 401, 403]).toContain(res.status());
    const text = await res.text();
    // Si devuelve 200, debe ser el HTML de login, no JSON
    if (res.status() === 200) {
      expect(text).toContain("<!DOCTYPE html");
    }
    await ctx.dispose();
  });
});

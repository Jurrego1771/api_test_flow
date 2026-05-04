/**
 * Test Suite: Webhooks — Event Verification (all modules)
 * Nomenclatura: TC_WHK_EVT_XXX
 *
 * Estrategia:
 *   1. beforeAll: crear UN webhook apuntando a WEBHOOK_RECEIVER_URL con TODOS
 *      los eventos del screenshot habilitados.
 *   2. Cada test dispara operaciones sobre un recurso y hace polling sobre
 *      GET /api/settings/webhooks/:id/history?event=X&obj_id=Y
 *      hasta que el evento aparezca o se agote WEBHOOK_POLL_MAX_MS.
 *   3. afterAll: eliminar webhook y recursos residuales.
 *
 * Variables de entorno (.env):
 *   WEBHOOK_RECEIVER_URL      URL receptora (default: https://httpbin.org/post)
 *   WEBHOOK_POLL_MAX_MS       Tiempo máximo de espera por evento ms (default: 90000)
 *   WEBHOOK_POLL_INTERVAL_MS  Intervalo de polling ms (default: 6000)
 *
 * Timing:
 *   El sistema procesa eventos async con una ventana de deduplicación ~30s.
 *   Cada test usa timeout de 4 minutos.
 *
 * Nombres de evento — formato: <collectionName>.<eventCode>
 *   Los nombres de colección MongoDB son los prefijos, NO las rutas de API.
 *
 *   UI Label            | Collection         | Events
 *   --------------------|--------------------|----------------------------------
 *   Access Restrictions | access_restrictions| .create .update .delete
 *   Article             | articles           | .create .update .delete
 *   Category            | categories         | .create .update .delete
 *   Customer            | customers          | .create
 *   Profile             | customerprofiles   | .create .update .delete
 *   Purchase            | customerpurchases  | .create .update .delete
 *   Live                | events             | .create .update .delete
 *   Schedule            | eventschedules     | .create .update .delete .started .ended
 *   ScheduleJob         | eventschedulejobs  | .create .update .delete
 *   Federation Group    | federation_groups  | .create .update .delete
 *   Media               | media              | .create .update .delete .purged .undelete
 *                       |                    | .upload_failed .preview_created .validation_failed
 *   Localization        | localization       | .create .update .delete
 *   MediaMeta           | mediametas         | .status_changed
 *   Playlist            | playlists          | .create .update .delete
 *   Product             | products           | .create .update
 *   Payment             | purchase_payments  | .status_changed
 *   SeasonEpisode       | seasonepisodes     | .create
 *   Show                | show               | .create .update .delete
 *   ShowRelated         | showrelated        | .update .delete
 */

// authRequest → X-API-Token hex (para CRUD de recursos: media, category, etc.)
// apiCtx      → Authorization: Bearer JWT (para gestión de webhooks e historial)
const { test, expect } = require("../../fixtures");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
const RECEIVER_URL =
  process.env.WEBHOOK_RECEIVER_URL || "https://httpbin.org/post";

const POLL_MAX_MS = parseInt(process.env.WEBHOOK_POLL_MAX_MS ?? "90000", 10);
const POLL_INTERVAL_MS = parseInt(
  process.env.WEBHOOK_POLL_INTERVAL_MS ?? "6000",
  10
);

const TEST_TIMEOUT_MS = 6 * 60 * 1000; // 6 minutos por test (3 polls × ~90s)

// Todos los eventos — nombres EXACTOS verificados desde la API de producción
// Fuente: GET /api/settings/webhooks → webhook "OTT Next" → notify_on
const ALL_WEBHOOK_EVENTS = [
  // Access Restrictions
  "access_restrictions.create",
  "access_restrictions.update",
  "access_restrictions.delete",
  // Articles  ⚠️ "article" (singular), NO "articles"
  "article.create",
  "article.update",
  "article.delete",
  // Categories
  "categories.create",
  "categories.update",
  "categories.delete",
  // Customers
  "customers.create",
  "customers.update",
  "customers.delete",
  // Customer Profiles
  "customerprofiles.create",
  "customerprofiles.update",
  "customerprofiles.delete",
  // Customer Purchases
  "customerpurchases.create",
  "customerpurchases.update",
  "customerpurchases.delete",
  // Live Streams (colección "events")
  "events.create",
  "events.update",
  "events.delete",
  // Schedules
  "eventschedules.create",
  "eventschedules.update",
  "eventschedules.delete",
  "eventschedules.started",
  "eventschedules.ended",
  // Schedule Jobs
  "eventschedulejobs.create",
  "eventschedulejobs.update",
  "eventschedulejobs.delete",
  // Federation Groups
  "federation_groups.create",
  "federation_groups.update",
  "federation_groups.delete",
  // Media  ⚠️ "medias" (con s), NO "media"
  "medias.create",
  "medias.update",
  "medias.delete",
  "medias.purged",
  "medias.undelete",
  "medias.upload_failed",
  "medias.preview_created",
  "medias.validation_failed",
  // Localization
  "localization.create",
  "localization.update",
  "localization.delete",
  // MediaMeta
  "mediametas.status_changed",
  // Playlists
  "playlists.create",
  "playlists.update",
  "playlists.delete",
  // Products
  "products.create",
  "products.update",
  // Payment  ⚠️ "purchasepayments" (sin guion bajo)
  "purchasepayments.status_changed",
  // Season Episodes
  "seasonepisodes.create",
  // Show (colección "show" singular, sin "show.create")
  "show.update",
  "show.delete",
  // ShowRelated
  "showrelated.update",
  "showrelated.delete",
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/**
 * Polling sobre el historial del webhook hasta encontrar el evento o timeout.
 * @param {object}   ctx        - APIRequestContext con Bearer JWT
 * @param {string}   webhookId  - ID del webhook
 * @param {string}   eventType  - Nombre del evento (e.g. "medias.update")
 * @param {string}   objId      - _id del recurso
 * @param {Function} [predicate] - Filtro adicional sobre los logs. Si se proporciona,
 *                                 solo se retorna cuando algún log supera el filtro.
 *                                 Útil para update events donde puede haber logs del
 *                                 mismo tipo con datos anteriores (auto-triggered).
 * @returns {Array|null} logs filtrados o null si timeout
 */
async function pollForEvent(ctx, webhookId, eventType, objId, predicate = null) {
  if (POLL_MAX_MS === 0) return null;

  const deadline = Date.now() + POLL_MAX_MS;
  const url =
    `/api/settings/webhooks/${webhookId}/history` +
    `?event=${encodeURIComponent(eventType)}&obj_id=${objId}&limit=20`;

  const predicateDesc = predicate ? " (with predicate)" : "";
  console.log(`[poll] Waiting for "${eventType}" obj=${objId}${predicateDesc} ...`);

  while (Date.now() < deadline) {
    const res = await ctx.get(url);
    if (res.ok()) {
      const body = await res.json();
      const allLogs = body?.data?.logs ?? [];
      const logs = predicate ? allLogs.filter(predicate) : allLogs;
      if (logs.length > 0) {
        const elapsed = POLL_MAX_MS - (deadline - Date.now());
        console.log(`[poll] ✓ "${eventType}" found after ~${Math.round(elapsed / 1000)}s`);
        return logs;
      }
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.warn(`[poll] ✗ Timeout for "${eventType}" obj=${objId}`);
  return null;
}

/** Extrae _id de respuesta { data: obj } o { data: [obj] } */
function extractId(body) {
  const raw = body?.data ?? body;
  return (Array.isArray(raw) ? raw[0] : raw)?._id ?? null;
}

/**
 * Wrapper para assertions de polling: si no llegó el evento, falla con
 * mensaje descriptivo. También valida obj.id si se proporciona.
 */
function assertEventFound(logs, eventType, objId = null) {
  expect(
    logs,
    `Evento "${eventType}" no apareció en el historial dentro de ${POLL_MAX_MS}ms. ` +
      "Verifica WEBHOOK_POLL_MAX_MS y que el webhook worker esté activo en el entorno."
  ).not.toBeNull();
  expect(logs.length).toBeGreaterThan(0);
  expect(logs[0].event).toBe(eventType);
  if (objId) {
    expect(logs[0].obj?.id, `obj.id no coincide con el recurso creado`).toBe(objId);
  }
}

/**
 * Valida que el payload del webhook coincida con el recurso que disparó el evento.
 * @param {object} log        - entrada del historial (logs[0])
 * @param {string} eventType  - nombre del evento esperado
 * @param {string} objId      - _id del recurso
 * @param {object} extraFields - campos adicionales a verificar en payload.data
 */
function assertPayloadMatchesResource(log, eventType, objId, extraFields = {}) {
  const payload = log.request?.payload;
  expect(
    payload,
    `El log del evento "${eventType}" no contiene request.payload`
  ).toBeDefined();

  expect(payload.type, "payload.type no coincide con el tipo de evento").toBe(eventType);
  expect(
    payload.data?._id,
    `payload.data._id no coincide con el recurso (esperado: ${objId})`
  ).toBe(objId);

  for (const [key, value] of Object.entries(extraFields)) {
    expect(
      payload.data?.[key],
      `payload.data.${key} no refleja el valor del cambio realizado`
    ).toBe(value);
  }
}

// ---------------------------------------------------------------------------
// Estado compartido entre todos los tests del describe
// ---------------------------------------------------------------------------
let apiCtx;
let webhookId = null;

// Cleanup de seguridad para recursos no eliminados en los tests
const residual = {
  media: [],
  category: [],
  show: [],
  article: [],
  playlist: [],
  live: [],
};

// ---------------------------------------------------------------------------
test.describe("Webhooks — Event Verification (all modules)", () => {
  // ── Setup / Teardown ──────────────────────────────────────────────────────

  test.beforeAll(async ({ playwright }) => {
    // Los endpoints /api/settings/webhooks requieren Bearer JWT, NO X-API-Token
    const jwt = process.env.WEBHOOK_JWT || process.env.SHOW_API_TOKEN;
    if (!jwt) throw new Error("WEBHOOK_JWT no definido en .env");

    apiCtx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${jwt}`,
      },
    });

    const res = await apiCtx.post("/api/settings/webhooks", {
      data: {
        name: `qa_whk_events_${Date.now()}`,
        url: RECEIVER_URL,
        notify_on: ALL_WEBHOOK_EVENTS,
        enabled: true,
      },
    });

    const body = await res.json();
    if (body.status !== "OK" || !body.data?._id) {
      throw new Error(
        `No se pudo crear el webhook de prueba: ${JSON.stringify(body)}\n` +
          "Verifica que la cuenta no haya alcanzado el límite de 3 webhooks."
      );
    }
    webhookId = body.data._id;
    console.log(`[setup] Webhook creado: ${webhookId}`);
    console.log(`[setup] Eventos configurados: ${body.data.notify_on.length}`);
  });

  test.afterAll(async () => {
    if (webhookId && apiCtx) {
      await apiCtx.delete(`/api/settings/webhooks/${webhookId}`).catch(() => {});
      console.log(`[cleanup] Webhook ${webhookId} eliminado`);
    }

    // Limpieza de seguridad
    for (const id of residual.media)
      await apiCtx?.delete(`/api/media/${id}`).catch(() => {});
    for (const id of residual.category)
      await apiCtx?.delete(`/api/category/${id}`).catch(() => {});
    for (const id of residual.show)
      await apiCtx?.delete(`/api/show/${id}`).catch(() => {});
    for (const id of residual.article)
      await apiCtx?.delete(`/api/article/${id}`).catch(() => {});
    for (const id of residual.playlist)
      await apiCtx?.delete(`/api/playlist/${id}`).catch(() => {});
    for (const id of residual.live)
      await apiCtx?.delete(`/api/live-stream/${id}`).catch(() => {});

    await apiCtx?.dispose();
  });

  // ── Grupo 1: Media ────────────────────────────────────────────────────────

  test("TC_WHK_EVT_001 — medias: create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    const title = `qa_media_whk_${faker.random.alphaNumeric(8)}`;
    const createRes = await authRequest.post("/api/media", {
      data: { title, type: "video", visible: "true", is_published: "false" },
    });
    expect(createRes.ok()).toBeTruthy();
    const mediaId = extractId(await createRes.json());
    expect(mediaId).toBeTruthy();
    residual.media.push(mediaId);

    // media.create
    let logs = await pollForEvent(apiCtx, webhookId, "medias.create", mediaId);
    assertEventFound(logs, "medias.create", mediaId);
    assertPayloadMatchesResource(logs[0], "medias.create", mediaId, { title });

    // Update → media.update — usar predicado para encontrar el log con el title actualizado
    // (el sistema puede auto-disparar medias.update durante el create pipeline)
    const updatedTitle = `qa_media_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(`/api/media/${mediaId}`, {
      data: { title: updatedTitle },
    });
    logs = await pollForEvent(
      apiCtx, webhookId, "medias.update", mediaId,
      (log) => log.request?.payload?.data?.title === updatedTitle
    );
    assertEventFound(logs, "medias.update", mediaId);
    assertPayloadMatchesResource(logs[0], "medias.update", mediaId, { title: updatedTitle });

    // Delete (soft → status=TRASH) → media.delete
    await authRequest.delete(`/api/media/${mediaId}`);
    residual.media.splice(residual.media.indexOf(mediaId), 1);
    logs = await pollForEvent(apiCtx, webhookId, "medias.delete", mediaId);
    assertEventFound(logs, "medias.delete", mediaId);
    assertPayloadMatchesResource(logs[0], "medias.delete", mediaId);
  });

  // ── Grupo 2: Articles ─────────────────────────────────────────────────────

  test("TC_WHK_EVT_002 — article: create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    const title = `qa_art_whk_${faker.random.alphaNumeric(8)}`;
    const createRes = await authRequest.post("/api/article", {
      data: { title, status: "draft" },
    });
    expect(createRes.ok()).toBeTruthy();
    const articleId = extractId(await createRes.json());
    expect(articleId).toBeTruthy();
    residual.article.push(articleId);

    let logs = await pollForEvent(apiCtx, webhookId, "article.create", articleId);
    assertEventFound(logs, "article.create", articleId);
    assertPayloadMatchesResource(logs[0], "article.create", articleId, { title });

    const updatedTitle = `qa_art_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(`/api/article/${articleId}`, {
      data: { title: updatedTitle },
    });
    logs = await pollForEvent(
      apiCtx, webhookId, "article.update", articleId,
      (log) => log.request?.payload?.data?.title === updatedTitle
    );
    assertEventFound(logs, "article.update", articleId);
    assertPayloadMatchesResource(logs[0], "article.update", articleId, { title: updatedTitle });

    await authRequest.delete(`/api/article/${articleId}`);
    residual.article.splice(residual.article.indexOf(articleId), 1);
    logs = await pollForEvent(apiCtx, webhookId, "article.delete", articleId);
    assertEventFound(logs, "article.delete", articleId);
    assertPayloadMatchesResource(logs[0], "article.delete", articleId);
  });

  // ── Grupo 3: Categories ───────────────────────────────────────────────────

  test("TC_WHK_EVT_003 — categories: create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    const name = `qa_cat_whk_${faker.random.alphaNumeric(8)}`;
    const createRes = await authRequest.post("/api/category", {
      data: { name, visible: true },
    });
    expect(createRes.ok()).toBeTruthy();
    const categoryId = extractId(await createRes.json());
    expect(categoryId).toBeTruthy();
    residual.category.push(categoryId);

    let logs = await pollForEvent(apiCtx, webhookId, "categories.create", categoryId);
    assertEventFound(logs, "categories.create", categoryId);
    assertPayloadMatchesResource(logs[0], "categories.create", categoryId, { name });

    const updatedName = `qa_cat_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(`/api/category/${categoryId}`, {
      data: { name: updatedName },
    });
    logs = await pollForEvent(
      apiCtx, webhookId, "categories.update", categoryId,
      (log) => log.request?.payload?.data?.name === updatedName
    );
    assertEventFound(logs, "categories.update", categoryId);
    assertPayloadMatchesResource(logs[0], "categories.update", categoryId, { name: updatedName });

    // Hard delete → categories.delete (vía WebhookPreDelete)
    await authRequest.delete(`/api/category/${categoryId}`);
    residual.category.splice(residual.category.indexOf(categoryId), 1);
    logs = await pollForEvent(apiCtx, webhookId, "categories.delete", categoryId);
    assertEventFound(logs, "categories.delete", categoryId);
    assertPayloadMatchesResource(logs[0], "categories.delete", categoryId);
  });

  // ── Grupo 4: Playlists ────────────────────────────────────────────────────

  test("TC_WHK_EVT_004 — playlists: create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    // Playlist requiere: name, type: "manual", rules.manual.medias (puede ser [])
    const name = `qa_pls_whk_${faker.random.alphaNumeric(8)}`;
    const createRes = await authRequest.post("/api/playlist", {
      data: { name, type: "manual", rules: { manual: { medias: [] } } },
    });
    expect(createRes.ok(), `Playlist create failed: ${await createRes.text()}`).toBeTruthy();
    const playlistId = extractId(await createRes.json());
    expect(playlistId).toBeTruthy();
    residual.playlist.push(playlistId);

    let logs = await pollForEvent(apiCtx, webhookId, "playlists.create", playlistId);
    assertEventFound(logs, "playlists.create", playlistId);
    assertPayloadMatchesResource(logs[0], "playlists.create", playlistId, { name });

    const updatedName = `qa_pls_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(`/api/playlist/${playlistId}`, {
      data: { name: updatedName },
    });
    logs = await pollForEvent(
      apiCtx, webhookId, "playlists.update", playlistId,
      (log) => log.request?.payload?.data?.name === updatedName
    );
    assertEventFound(logs, "playlists.update", playlistId);
    assertPayloadMatchesResource(logs[0], "playlists.update", playlistId, { name: updatedName });

    await authRequest.delete(`/api/playlist/${playlistId}`);
    residual.playlist.splice(residual.playlist.indexOf(playlistId), 1);
    logs = await pollForEvent(apiCtx, webhookId, "playlists.delete", playlistId);
    assertEventFound(logs, "playlists.delete", playlistId);
    assertPayloadMatchesResource(logs[0], "playlists.delete", playlistId);
  });

  // ── Grupo 5: Shows ────────────────────────────────────────────────────────

  test("TC_WHK_EVT_005 — show: create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    // Colección: "show" (singular), NO "shows"

    // Nota: "show.create" NO existe en la colección "show" — solo .update y .delete
    const title = `qa_show_whk_${faker.random.alphaNumeric(8)}`;
    const createRes = await authRequest.post("/api/show", {
      data: { title, type: "tvshow" },
    });
    expect(createRes.ok()).toBeTruthy();
    const showId = extractId(await createRes.json());
    expect(showId).toBeTruthy();
    residual.show.push(showId);

    // Update → show.update
    const updatedTitle = `qa_show_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(`/api/show/${showId}`, {
      data: { title: updatedTitle },
    });
    let logs = await pollForEvent(
      apiCtx, webhookId, "show.update", showId,
      (log) => log.request?.payload?.data?.title === updatedTitle
    );
    assertEventFound(logs, "show.update", showId);
    assertPayloadMatchesResource(logs[0], "show.update", showId, { title: updatedTitle });

    // Soft delete (status=DELETE) → show.delete
    await authRequest.delete(`/api/show/${showId}`);
    residual.show.splice(residual.show.indexOf(showId), 1);
    logs = await pollForEvent(apiCtx, webhookId, "show.delete", showId);
    assertEventFound(logs, "show.delete", showId);
    assertPayloadMatchesResource(logs[0], "show.delete", showId);
  });

  // ── Grupo 6: Live Streams ─────────────────────────────────────────────────

  test("TC_WHK_EVT_006 — live (events): create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);
    // Colección: "events"

    // La colección "events" (live streams) usa "name", no "title"
    const name = `qa_live_whk_${faker.random.alphaNumeric(8)}`;
    const createRes = await authRequest.post("/api/live-stream", {
      data: { name, type: "video", online: "false" },
    });
    expect(createRes.ok(), `Live create failed: ${await createRes.text()}`).toBeTruthy();
    const liveId = extractId(await createRes.json());
    expect(liveId).toBeTruthy();
    residual.live.push(liveId);

    let logs = await pollForEvent(apiCtx, webhookId, "events.create", liveId);
    assertEventFound(logs, "events.create", liveId);
    assertPayloadMatchesResource(logs[0], "events.create", liveId, { name });

    const updatedName = `qa_live_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(`/api/live-stream/${liveId}`, {
      data: { name: updatedName },
    });
    logs = await pollForEvent(
      apiCtx, webhookId, "events.update", liveId,
      (log) => log.request?.payload?.data?.name === updatedName
    );
    assertEventFound(logs, "events.update", liveId);
    assertPayloadMatchesResource(logs[0], "events.update", liveId, { name: updatedName });

    await authRequest.delete(`/api/live-stream/${liveId}`);
    residual.live.splice(residual.live.indexOf(liveId), 1);
    logs = await pollForEvent(apiCtx, webhookId, "events.delete", liveId);
    assertEventFound(logs, "events.delete", liveId);
    assertPayloadMatchesResource(logs[0], "events.delete", liveId);
  });

  // ── Grupo 7: Schedules (requiere live stream) ─────────────────────────────

  test("TC_WHK_EVT_007 — eventschedulejobs: create + update + delete", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    // Crear live stream padre (campo "name", no "title")
    const liveRes = await authRequest.post("/api/live-stream", {
      data: { name: `qa_live_sched_${faker.random.alphaNumeric(6)}`, type: "video", online: "false" },
    });
    expect(liveRes.ok(), `Live create failed: ${await liveRes.text()}`).toBeTruthy();
    const liveId = extractId(await liveRes.json());
    residual.live.push(liveId);

    // Crear schedule-job (endpoint correcto para colección eventschedulejobs)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const dateStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
    const schedName = `qa_sched_whk_${faker.random.alphaNumeric(6)}`;
    const createRes = await authRequest.post(
      `/api/live-stream/${liveId}/schedule-job`,
      {
        form: {
          name: schedName,
          type: "onetime",
          date_start: dateStr,
          date_end: dateStr,
          date_start_hour: "10",
          date_start_minute: "00",
          date_end_hour: "11",
          date_end_minute: "00",
        },
      }
    );
    expect(createRes.ok(), `Schedule-job create failed: ${await createRes.text()}`).toBeTruthy();
    const scheduleId = extractId(await createRes.json());
    expect(scheduleId).toBeTruthy();

    let logs = await pollForEvent(apiCtx, webhookId, "eventschedulejobs.create", scheduleId);
    assertEventFound(logs, "eventschedulejobs.create", scheduleId);
    assertPayloadMatchesResource(logs[0], "eventschedulejobs.create", scheduleId, { name: schedName });

    // Update schedule-job
    const updatedName = `qa_sched_upd_${faker.random.alphaNumeric(6)}`;
    await authRequest.post(
      `/api/live-stream/${liveId}/schedule-job/${scheduleId}`,
      { form: { name: updatedName } }
    );
    logs = await pollForEvent(
      apiCtx, webhookId, "eventschedulejobs.update", scheduleId,
      (log) => log.request?.payload?.data?.name === updatedName
    );
    assertEventFound(logs, "eventschedulejobs.update", scheduleId);
    assertPayloadMatchesResource(logs[0], "eventschedulejobs.update", scheduleId, { name: updatedName });

    // Delete schedule-job
    await authRequest.delete(`/api/live-stream/${liveId}/schedule-job/${scheduleId}`);
    logs = await pollForEvent(apiCtx, webhookId, "eventschedulejobs.delete", scheduleId);
    assertEventFound(logs, "eventschedulejobs.delete", scheduleId);
    assertPayloadMatchesResource(logs[0], "eventschedulejobs.delete", scheduleId);

    // Cleanup live
    await authRequest.delete(`/api/live-stream/${liveId}`);
    residual.live.splice(residual.live.indexOf(liveId), 1);
  });

  // ── Grupo 9: SeasonEpisode (requiere show + season) ───────────────────────

  test("TC_WHK_EVT_009 — seasonepisodes: create", async ({ authRequest }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    // Show padre
    const showRes = await authRequest.post("/api/show", {
      data: {
        title: `qa_show_ep_${faker.random.alphaNumeric(6)}`,
        type: "tvshow",
      },
    });
    expect(showRes.ok()).toBeTruthy();
    const showId = extractId(await showRes.json());
    residual.show.push(showId);

    // Season
    const seasonRes = await authRequest.post(`/api/show/${showId}/season`, {
      data: { title: `qa_season_${faker.random.alphaNumeric(6)}`, number: 1 },
    });
    expect(seasonRes.ok()).toBeTruthy();
    const seasonId = extractId(await seasonRes.json());

    // Crear un media fresco para asignarlo al episodio
    // (no se puede reusar un media que ya esté en otro episodio)
    const mediaRes = await authRequest.post("/api/media", {
      data: { title: `qa_ep_media_${faker.random.alphaNumeric(6)}`, type: "video", visible: "true", is_published: "false" },
    });
    expect(mediaRes.ok()).toBeTruthy();
    const freshMediaId = extractId(await mediaRes.json());
    expect(freshMediaId).toBeTruthy();
    residual.media.push(freshMediaId);

    const epTitle = `qa_ep_whk_${faker.random.alphaNumeric(6)}`;
    const epRes = await authRequest.post(
      `/api/show/${showId}/season/${seasonId}/episode`,
      {
        data: {
          title: epTitle,
          content: [{ content_type: "Media", type: "full", value: freshMediaId }],
        },
      }
    );
    expect(epRes.ok(), `Episode creation failed: ${await epRes.text()}`).toBeTruthy();
    const episodeId = extractId(await epRes.json());
    expect(episodeId).toBeTruthy();

    const epLogs = await pollForEvent(apiCtx, webhookId, "seasonepisodes.create", episodeId);
    assertEventFound(epLogs, "seasonepisodes.create", episodeId);
    assertPayloadMatchesResource(epLogs[0], "seasonepisodes.create", episodeId, { title: epTitle });

    // Cleanup
    await authRequest.delete(`/api/show/${showId}`);
    residual.show.splice(residual.show.indexOf(showId), 1);
  });

  // ── Grupo 10: Eventos manuales / difíciles de disparar ────────────────────
  //
  // Los siguientes eventos requieren procesos de background o integraciones
  // externas que no pueden dispararse directamente vía API en tests:
  //   - media.upload_failed     → proceso de encoding fallido
  //   - media.preview_created   → proceso de preview completado
  //   - media.validation_failed → validación fallida en encoding
  //   - media.purged            → segundo DELETE (status=DELETE en lugar de TRASH)
  //   - media.undelete          → restauración de media eliminada
  //   - eventschedules.started  → fired por scheduler cuando inicia transmisión
  //   - eventschedules.ended    → fired por scheduler cuando termina transmisión
  //   - eventschedulejobs.*     → jobs creados por el scheduler
  //   - mediametas.status_changed → procesamiento de media meta
  //   - purchase_payments.status_changed → webhook de pago completado
  //   - customers.create        → registro de usuario en customer portal
  //   - customerprofiles.*      → actualización de perfil de cliente
  //   - customerpurchases.*     → compra completada por cliente
  //   - products.*              → gestión de catálogo de productos
  //   - federation_groups.*     → gestión de grupos de federación
  //   - localization.*          → gestión de localizaciones
  //   - showrelated.*           → gestión de contenido relacionado

  test("TC_WHK_EVT_090 — SKIP: eventos de background no disparables vía API", async () => {
    test.skip(
      true,
      "Los eventos de processing background (media.upload_failed, eventschedules.started, " +
        "purchase_payments.status_changed, etc.) no pueden dispararse directamente vía API. " +
        "Requieren pruebas de integración con el webhook worker activo y procesos de background."
    );
  });

  // ── Grupo 11: Verificaciones de estructura del log ────────────────────────

  test("TC_WHK_EVT_091 — log entry: estructura y campos obligatorios", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    // Crear un recurso simple para generar un evento
    const createRes = await authRequest.post("/api/category", {
      data: { name: `qa_cat_struct_${faker.random.alphaNumeric(6)}` },
    });
    expect(createRes.ok()).toBeTruthy();
    const catId = extractId(await createRes.json());
    residual.category.push(catId);

    const logs = await pollForEvent(
      apiCtx,
      webhookId,
      "categories.create",
      catId
    );
    assertEventFound(logs, "categories.create");

    const log = logs[0];
    // Campos obligatorios del log
    expect(log._id).toBeTruthy();
    expect(log.event).toBe("categories.create");
    expect(log.obj).toBeDefined();
    expect(log.obj.id).toBe(catId);
    expect(typeof log.is_success).toBe("boolean");
    expect(log.date_created).toBeTruthy();

    // Payload del webhook: debe contener type y data._id del recurso
    assertPayloadMatchesResource(log, "categories.create", catId);

    // Si la entrega fue exitosa, verificar response
    if (log.is_success) {
      expect(log.response?.code).toBeGreaterThanOrEqual(200);
      expect(log.response?.code).toBeLessThan(300);
      expect(typeof log.response?.time).toBe("number");
    }

    // Cleanup
    await authRequest.delete(`/api/category/${catId}`).catch(() => {});
    residual.category.splice(residual.category.indexOf(catId), 1);
  });

  test("TC_WHK_EVT_092 — history: paginación con has_more", async ({
    authRequest,
  }) => {
    test.setTimeout(TEST_TIMEOUT_MS);

    // Crear múltiples recursos para acumular logs
    const ids = [];
    for (let i = 0; i < 3; i++) {
      const res = await authRequest.post("/api/category", {
        data: { name: `qa_cat_pag_${faker.random.alphaNumeric(6)}` },
      });
      const id = extractId(await res.json());
      if (id) {
        ids.push(id);
        residual.category.push(id);
      }
    }

    // Esperar al menos un evento
    if (ids.length > 0) {
      const logs = await pollForEvent(
        apiCtx,
        webhookId,
        "categories.create",
        ids[0]
      );
      if (logs) {
        // Consultar con limit=1 para forzar has_more si hay múltiples logs
        const pagedRes = await apiCtx.get(
          `/api/settings/webhooks/${webhookId}/history?event=categories.create&limit=1`
        );
        const pagedBody = await pagedRes.json();
        expect(pagedBody.status).toBe("OK");
        expect(typeof pagedBody.data.has_more).toBe("boolean");
        expect(pagedBody.data.logs.length).toBeLessThanOrEqual(1);
      }
    }

    // Cleanup
    for (const id of ids) {
      await authRequest.delete(`/api/category/${id}`).catch(() => {});
      residual.category.splice(residual.category.indexOf(id), 1);
    }
  });
});

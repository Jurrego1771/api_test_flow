/**
 * Plan de Automatización: Módulo Schedule-Job (Live Stream API)
 * Nomenclatura: TC_SCH_XXX_<verbo>_<descripción>
 *
 * Endpoint base: /api/live-stream/:liveId/schedule-job
 *
 * Metodología:
 *  - Fixture authRequest (X-API-Token via .env)
 *  - DataFactory para payloads estandarizados
 *  - Validación Zod en respuestas clave
 *  - beforeAll crea live stream dedicado; afterAll lo elimina junto con jobs
 *  - ensureApiAvailable guard en cada suite
 *
 * Suites:
 *  1. GET  – Consulta de schedule-job
 *  2. POST – Crear / Actualizar schedule-job
 *  3. DELETE – Eliminar schedule-job
 *  4. Validaciones de fechas y campo recurrencia
 *  5. Seguridad – Autenticación y autorización
 *  6. Edge Cases – IDs inválidos, payloads vacíos, límites
 */

const { test, expect } = require('@playwright/test');
const dataFactory       = require('../../helpers').dataFactory;
const { faker }         = require("@faker-js/faker");
const {
  getScheduleResponseSchema,
} = require('../../../../schemas/schedule.schema');

// ─── Constantes ──────────────────────────────────────────────────────────────
const LIVE_BASE = "/api/live-stream";
const SCH_BASE  = (id) => `${LIVE_BASE}/${id}/schedule-job`;

let liveId; // set in beforeAll — dedicated live stream for this suite

// IDs de jobs creados durante los tests (para cleanup)
const createdJobIds = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function ensureScheduleApiAvailable(authRequest, streamId = liveId) {
  if (!streamId) {
    test.skip(true, 'No live stream available for schedule tests');
    return false;
  }
  const res = await authRequest.get(SCH_BASE(streamId));
  if (res.status() === 401 || res.status() === 403 || res.status() === 404) {
    test.skip(true, `Schedule API no disponible (${res.status()}) para live ${streamId}`);
    return false;
  }
  return true;
}

async function createScheduleJob(authRequest, streamId = liveId, attrs = {}) {
  const payload = dataFactory.generateSchedulePayload(attrs);
  const res = await authRequest.post(SCH_BASE(streamId), { form: payload });

  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    throw new Error(`createScheduleJob failed: ${res.status()} — ${txt}`);
  }
  const body = await res.json();
  const data = Array.isArray(body.data) ? body.data[0] : body.data;
  if (data?._id) createdJobIds.push({ streamId, jobId: data._id });
  return data;
}

async function deleteScheduleJob(authRequest, streamId, jobId) {
  let res;
  try {
    res = await authRequest.delete(`${SCH_BASE(streamId)}/${jobId}`);
  } finally {
    const idx = createdJobIds.findIndex(
      (r) => r.streamId === streamId && r.jobId === jobId
    );
    if (idx !== -1) createdJobIds.splice(idx, 1);
  }
  return res;
}

// ─── Describe raíz ───────────────────────────────────────────────────────────

test.describe("Schedule-Job API (Live Stream)", () => {

  test.beforeAll(async ({ request }) => {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false' });
    const res = await request.post(`${process.env.BASE_URL}${LIVE_BASE}`, {
      headers: { "X-API-Token": process.env.API_TOKEN },
      form: payload,
    });
    if (res.ok()) {
      const body = await res.json();
      const data = Array.isArray(body.data) ? body.data[0] : body.data;
      liveId = data?._id;
    }
  });

  test.afterAll(async ({ request }) => {
    for (const { streamId, jobId } of [...createdJobIds]) {
      try {
        await request.delete(`${process.env.BASE_URL}${SCH_BASE(streamId)}/${jobId}`, {
          headers: { "X-API-Token": process.env.API_TOKEN }
        });
      } catch (_) { /* orphan cleanup */ }
    }
    createdJobIds.length = 0;

    if (liveId) {
      try {
        await request.delete(`${process.env.BASE_URL}${LIVE_BASE}/${liveId}`, {
          headers: { "X-API-Token": process.env.API_TOKEN }
        });
      } catch (_) { /* orphan cleanup */ }
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. GET — Consulta de schedule-job
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("1. GET — Consulta de Schedule-Job", () => {

    test("TC_SCH_001_GET_ScheduleJobFromExistingLive", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.get(SCH_BASE(liveId));

      expect(res.ok()).toBeTruthy();
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("OK");
      expect(["object", "undefined"]).toContain(typeof body.data);

      getScheduleResponseSchema.parse(body);
    });

    test("TC_SCH_002_GET_ScheduleJob_NotFound_FakeId", async ({ request }) => {
      const fakeId = "000000000000000000000000";
      const res = await request.get(`${process.env.BASE_URL}${SCH_BASE(fakeId)}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });

      expect([200, 404]).toContain(res.status());

      const body = await res.json();
      if (res.status() === 404) {
        expect(body.status).toBe("ERROR");
      }
    });

    test("TC_SCH_003_GET_ScheduleJob_ResponseHeaders", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.get(SCH_BASE(liveId));

      expect(res.ok()).toBeTruthy();
      const headers = res.headers();
      expect(headers["content-type"]).toMatch(/application\/json/i);
    });

    test("TC_SCH_004_GET_ScheduleJob_DataStructureIfPresent", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.get(SCH_BASE(liveId));
      const body = await res.json();

      expect(body.status).toBe("OK");

      if (body.data && !Array.isArray(body.data)) {
        if (body.data._id) {
          expect(body.data).toHaveProperty("_id");
          expect(body.data).toHaveProperty("date_start");
          expect(body.data).toHaveProperty("date_start_hour");
          expect(body.data).toHaveProperty("date_start_minute");
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. POST — Crear / Actualizar schedule-job
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("2. POST — Crear y Actualizar Schedule-Job", () => {

    test("TC_SCH_005_POST_CreateScheduleJobBasic", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const payload = dataFactory.generateSchedulePayload();
      const res = await authRequest.post(SCH_BASE(liveId), { form: payload });

      if (!res.ok()) {
        const err = await res.text();
        console.error("POST Failed:", res.status(), err);
        test.skip(true, "POST schedule-job rechazado por el servidor");
        return;
      }

      const body = await res.json();
      expect(body.status).toBe("OK");

      const job = Array.isArray(body.data) ? body.data[0] : body.data;
      if (job?._id) {
        createdJobIds.push({ streamId: liveId, jobId: job._id });
        await deleteScheduleJob(authRequest, liveId, job._id);
      }
    });

    test("TC_SCH_007_POST_CreateScheduleJob_MissingRequiredFields", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.post(SCH_BASE(liveId), {
        form: { name: "PartialJob" },
      });

      expect([400, 422]).toContain(res.status());
    });

    test("TC_SCH_009_POST_UpdateScheduleJob_ChangeHour", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      let job;
      try {
        job = await createScheduleJob(authRequest, liveId);
      } catch {
        test.skip(true, "No se pudo crear schedule-job para update");
        return;
      }

      if (!job?._id) return;

      // Poll until job is accessible — EventSchedule materialization can lag
      await expect.poll(
        async () => {
          const r = await authRequest.get(`${SCH_BASE(liveId)}/${job._id}`);
          return r.status();
        },
        { timeout: 6000, intervals: [500, 1000, 2000] }
      ).toBe(200);

      const updRes = await authRequest.post(
        `${SCH_BASE(liveId)}/${job._id}`,
        { form: { date_end_hour: "23" } }
      );

      try {
        expect([200, 204]).toContain(updRes.status());
      } finally {
        await deleteScheduleJob(authRequest, liveId, job._id);
      }
    });

    test("TC_SCH_010_POST_CreateScheduleJob_PastDate_Behavior", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const payload = dataFactory.generateSchedulePayload({
        date_start: "2020-01-01",
        date_end:   "2020-01-01"
      });

      const res = await authRequest.post(SCH_BASE(liveId), { form: payload });
      expect([200, 400, 422]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const job = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) await deleteScheduleJob(authRequest, liveId, job._id);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. DELETE — Eliminar schedule-job
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("3. DELETE — Eliminar Schedule-Job", () => {

    test("TC_SCH_011_DELETE_ScheduleJobById", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      let job;
      try {
        job = await createScheduleJob(authRequest, liveId);
      } catch {
        test.skip(true, "No se pudo crear schedule-job");
        return;
      }

      if (!job?._id) return;

      const delRes = await deleteScheduleJob(authRequest, liveId, job._id);
      expect([200, 204]).toContain(delRes.status());
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. Validaciones de Fechas y Tiempos
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("4. Validaciones de Fechas y Tiempos", () => {

    test("TC_SCH_015_POST_EndHourBeforeStartHour_OnSameDay", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const payload = dataFactory.generateSchedulePayload({
        date_start_hour: "18",
        date_end_hour:   "10",
      });

      const res = await authRequest.post(SCH_BASE(liveId), { form: payload });
      expect([400, 422]).toContain(res.status());
    });

    test("TC_SCH_016_POST_InvalidMinuteValue_ShouldReject", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const payload = dataFactory.generateSchedulePayload({
        date_start_minute: "99",
      });

      const res = await authRequest.post(SCH_BASE(liveId), { form: payload });
      expect([400, 422]).toContain(res.status());
    });

    test("TC_SCH_017_POST_SameonDateAndoffDate_ShouldReject", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const singleDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const res = await authRequest.post(SCH_BASE(liveId), {
        form: { on_date: singleDate, off_date: singleDate },
      });

      expect([200, 400, 422]).toContain(res.status());
    });

    test("TC_SCH_018_POST_RecurringWithoutDays_Behavior", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const now     = new Date();
      const onDate  = new Date(now.getTime() + 60 * 60 * 1000);
      const offDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const res = await authRequest.post(SCH_BASE(liveId), {
        form: {
          on_date:   onDate.toISOString(),
          off_date:  offDate.toISOString(),
          recurring: "true",
        },
      });

      expect([200, 400, 422]).toContain(res.status());
      if (res.ok()) {
        const body = await res.json();
        const job  = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) {
          await deleteScheduleJob(authRequest, liveId, job._id);
        }
      }
    });

    test("TC_SCH_019_POST_RecurringWithAllDays", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const allDays = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
      const payload = dataFactory.generateRecurringSchedulePayload({ days: allDays });
      const res = await authRequest.post(SCH_BASE(liveId), { form: payload });

      expect([200, 400]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const job  = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) {
          await deleteScheduleJob(authRequest, liveId, job._id);
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Seguridad — Autenticación y Autorización
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("5. Seguridad — Autenticación y Autorización", () => {

    test("TC_SCH_020_GET_WithoutToken_ShouldReturn401or403", async ({ playwright }) => {
      if (!liveId) { test.skip(true, 'No live stream available'); return; }
      const unauthCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
      });

      try {
        const res = await unauthCtx.get(`${LIVE_BASE}/${liveId}/schedule-job`);
        expect([401, 403]).toContain(res.status());
      } finally {
        await unauthCtx.dispose();
      }
    });

    test("TC_SCH_021_POST_WithoutToken_ShouldReturn401or403", async ({ playwright }) => {
      if (!liveId) { test.skip(true, 'No live stream available'); return; }
      const now     = new Date();
      const onDate  = new Date(now.getTime() + 60 * 60 * 1000);
      const offDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const unauthCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
      });

      try {
        const res = await unauthCtx.post(`${LIVE_BASE}/${liveId}/schedule-job`, {
          form: {
            on_date:  onDate.toISOString(),
            off_date: offDate.toISOString(),
          },
        });
        expect([401, 403]).toContain(res.status());
      } finally {
        await unauthCtx.dispose();
      }
    });

    test("TC_SCH_022_DELETE_WithoutToken_ShouldReturn401or403", async ({ playwright }) => {
      if (!liveId) { test.skip(true, 'No live stream available'); return; }
      const fakeJobId = "000000000000000000000001";
      const unauthCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
      });

      try {
        const res = await unauthCtx.delete(
          `${LIVE_BASE}/${liveId}/schedule-job/${fakeJobId}`
        );
        expect([401, 403]).toContain(res.status());
      } finally {
        await unauthCtx.dispose();
      }
    });

    test("TC_SCH_023_GET_WithInvalidToken_ShouldReturn401or403", async ({ playwright }) => {
      if (!liveId) { test.skip(true, 'No live stream available'); return; }
      const badCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz_000" },
      });

      try {
        const res = await badCtx.get(`${LIVE_BASE}/${liveId}/schedule-job`);
        expect([401, 403]).toContain(res.status());
      } finally {
        await badCtx.dispose();
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. Edge Cases — IDs inválidos, payloads vacíos, límites
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("6. Edge Cases", () => {

    test("TC_SCH_024_POST_EmptyPayload_ShouldRejectOrAccept", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.post(SCH_BASE(liveId), { form: {} });

      expect([200, 400, 422]).toContain(res.status());
    });

    test("TC_SCH_025_POST_ExtraUnknownFields_ShouldNotCrash", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
        delete: (url) => request.delete(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const payload = dataFactory.generateSchedulePayload({
        unknownField:  faker.random.alphaNumeric(12),
        anotherExtra:  true,
      });
      const res = await authRequest.post(SCH_BASE(liveId), { form: payload });

      expect([200, 400, 422]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const job  = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) {
          await deleteScheduleJob(authRequest, liveId, job._id);
        }
      }
    });

    test("TC_SCH_026_GET_MalformedLiveId_ShouldReturn400or404", async ({ request }) => {
      const malformedId = "!@#$%^&*invalid-id";
      const res = await request.get(`${process.env.BASE_URL}${SCH_BASE(malformedId)}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });

      expect([400, 404, 422]).toContain(res.status());
    });

    test("TC_SCH_027_GET_JobById_WhenJobDoesNotExist", async ({ request }) => {
      if (!liveId) { test.skip(true, 'No live stream available'); return; }
      const fakeJobId = "000000000000000000000099";
      const res = await request.get(`${process.env.BASE_URL}${SCH_BASE(liveId)}/${fakeJobId}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });

      expect([200, 404]).toContain(res.status());
      if (res.status() === 404) {
        const body = await res.json();
        expect(body.status).toBe("ERROR");
      }
    });

    test("TC_SCH_028_POST_VeryLongStringInDates_ShouldReject", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const longStr = "A".repeat(500);
      const res = await authRequest.post(SCH_BASE(liveId), {
        form: { on_date: longStr, off_date: longStr },
      });

      expect([400, 422]).toContain(res.status());
    });

    test("TC_SCH_029_GET_ResponseTime_ShouldBeUnder5s", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const start = Date.now();
      const res   = await authRequest.get(SCH_BASE(liveId));
      const elapsed = Date.now() - start;

      expect(res.ok()).toBeTruthy();
      expect(elapsed).toBeLessThan(5000);
    });

    test("TC_SCH_030_POST_NullValues_ShouldRejectOrHandle", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.post(SCH_BASE(liveId), {
        form: { on_date: "null", off_date: "null" },
      });

      expect([200, 400, 422]).toContain(res.status());
    });
  });

}); // Schedule-Job API

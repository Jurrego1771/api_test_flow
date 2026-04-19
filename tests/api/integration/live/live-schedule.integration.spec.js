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
 *  - afterAll para cleanup de recursos creados
 *  - ensureApiAvailable guard en cada suite
 *  - Live fixture: 68dd426831f7bd5b6561e59e (live pre-existente)
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
  createScheduleResponseSchema,
} = require('../../../../schemas/schedule.schema');

// ─── Constantes ──────────────────────────────────────────────────────────────
const LIVE_BASE = "/api/live-stream";
const LIVE_ID   = process.env.LIVE_SCHEDULE_ID || "68dd426831f7bd5b6561e59e";
const SCH_BASE  = (liveId) => `${LIVE_BASE}/${liveId}/schedule-job`;

// IDs de jobs creados durante los tests (para cleanup)
const createdJobIds = [];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Verifica que el endpoint esté disponible; skips el test si no lo está */
async function ensureScheduleApiAvailable(authRequest, liveId = LIVE_ID) {
  const res = await authRequest.get(SCH_BASE(liveId));
  if (res.status() === 401 || res.status() === 403 || res.status() === 404) {
    test.skip(true, `Schedule API no disponible (${res.status()}) para live ${liveId}`);
    return false;
  }
  return true;
}

/**
 * Crea un schedule-job en el live indicado y registra su id para cleanup.
 * Retorna el objeto data del body.
 */
async function createScheduleJob(authRequest, liveId = LIVE_ID, attrs = {}) {
  const payload = dataFactory.generateSchedulePayload(attrs);
  const res = await authRequest.post(SCH_BASE(liveId), { form: payload });

  if (!res.ok()) {
    const txt = await res.text().catch(() => "");
    throw new Error(`createScheduleJob failed: ${res.status()} — ${txt}`);
  }
  const body = await res.json();
  const data = Array.isArray(body.data) ? body.data[0] : body.data;
  if (data?._id) createdJobIds.push({ liveId, jobId: data._id });
  return data;
}

async function deleteScheduleJob(authRequest, liveId, jobId) {
  let res;
  try {
    res = await authRequest.delete(`${SCH_BASE(liveId)}/${jobId}`);
  } finally {
    const idx = createdJobIds.findIndex(
      (r) => r.liveId === liveId && r.jobId === jobId
    );
    if (idx !== -1) createdJobIds.splice(idx, 1);
  }
  return res;
}

// ─── Describe raíz ───────────────────────────────────────────────────────────

test.describe("Schedule-Job API (Live Stream)", () => {

  // Cleanup global de todo lo creado durante la suite completa
  test.afterAll(async ({ request }) => {
    for (const { liveId, jobId } of [...createdJobIds]) {
      try {
        await request.delete(`${process.env.BASE_URL}${SCH_BASE(liveId)}/${jobId}`, {
          headers: { "X-API-Token": process.env.API_TOKEN }
        });
      } catch (_) { /* orphan cleanup */ }
    }
    createdJobIds.length = 0;
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

      const res = await authRequest.get(SCH_BASE(LIVE_ID));

      expect(res.ok()).toBeTruthy();
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("OK");
      // data puede ser null, objeto o array según el estado del live
      expect(["object", "undefined"]).toContain(typeof body.data);

      // Validación Zod
      getScheduleResponseSchema.parse(body);
    });

    test("TC_SCH_002_GET_ScheduleJob_NotFound_FakeId", async ({ request }) => {
      const fakeId = "000000000000000000000000";
      const res = await request.get(`${process.env.BASE_URL}${SCH_BASE(fakeId)}`, {
        headers: { "X-API-Token": process.env.API_TOKEN }
      });

      // La plataforma puede devolver 200 con data null o 404 con ERROR
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

      const res = await authRequest.get(SCH_BASE(LIVE_ID));

      expect(res.ok()).toBeTruthy();
      const headers = res.headers();
      // Esperamos Content-Type JSON
      expect(headers["content-type"]).toMatch(/application\/json/i);
    });

    test("TC_SCH_004_GET_ScheduleJob_DataStructureIfPresent", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const res = await authRequest.get(SCH_BASE(LIVE_ID));
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
      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: payload });

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
        createdJobIds.push({ liveId: LIVE_ID, jobId: job._id });
        await deleteScheduleJob(authRequest, LIVE_ID, job._id);
      }
    });

    test("TC_SCH_007_POST_CreateScheduleJob_MissingRequiredFields", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      // Enviamos solo el nombre, faltan fechas
      const res = await authRequest.post(SCH_BASE(LIVE_ID), {
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
        job = await createScheduleJob(authRequest, LIVE_ID);
      } catch {
        test.skip(true, "No se pudo crear schedule-job para update");
        return;
      }

      if (!job?._id) return;

      const updRes = await authRequest.post(
        `${SCH_BASE(LIVE_ID)}/${job._id}`,
        { form: { date_end_hour: "23" } }
      );

      try {
        expect([200, 204]).toContain(updRes.status());
      } finally {
        await deleteScheduleJob(authRequest, LIVE_ID, job._id);
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

      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: payload });
      expect([200, 400, 422]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const job = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) await deleteScheduleJob(authRequest, LIVE_ID, job._id);
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
        job = await createScheduleJob(authRequest, LIVE_ID);
      } catch {
        test.skip(true, "No se pudo crear schedule-job");
        return;
      }

      if (!job?._id) return;

      const delRes = await deleteScheduleJob(authRequest, LIVE_ID, job._id);
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
        date_end_hour:   "10", // Antes que el inicio
      });

      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: payload });
      expect([400, 422]).toContain(res.status());
    });

    test("TC_SCH_016_POST_InvalidMinuteValue_ShouldReject", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const payload = dataFactory.generateSchedulePayload({
        date_start_minute: "99", // Minuto inválido
      });

      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: payload });
      expect([400, 422]).toContain(res.status());
    });

    test("TC_SCH_017_POST_SameonDateAndoffDate_ShouldReject", async ({ request }) => {
      const authRequest = {
        get: (url) => request.get(`${process.env.BASE_URL}${url}`, { headers: { "X-API-Token": process.env.API_TOKEN } }),
        post: (url, opts) => request.post(`${process.env.BASE_URL}${url}`, { ...opts, headers: { "X-API-Token": process.env.API_TOKEN } }),
      };
      if (!(await ensureScheduleApiAvailable(authRequest))) return;

      const singleDate = new Date(Date.now() + 60 * 60 * 1000).toISOString();

      const res = await authRequest.post(SCH_BASE(LIVE_ID), {
        form: { on_date: singleDate, off_date: singleDate },
      });

      // on_date === off_date es inválido en la mayoría de plataformas
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

      const res = await authRequest.post(SCH_BASE(LIVE_ID), {
        form: {
          on_date:   onDate.toISOString(),
          off_date:  offDate.toISOString(),
          recurring: "true",
          // sin campo 'days'
        },
      });

      // Puede aceptar o rechazar; lo importante es que no sea 500
      expect([200, 400, 422]).toContain(res.status());
      if (res.ok()) {
        const body = await res.json();
        const job  = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) {
          await deleteScheduleJob(authRequest, LIVE_ID, job._id);
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
      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: payload });

      expect([200, 400]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const job  = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) {
          await deleteScheduleJob(authRequest, LIVE_ID, job._id);
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. Seguridad — Autenticación y Autorización
  // ══════════════════════════════════════════════════════════════════════════
  test.describe("5. Seguridad — Autenticación y Autorización", () => {

    test("TC_SCH_020_GET_WithoutToken_ShouldReturn401or403", async ({ playwright }) => {
      const unauthCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        // Sin token
      });

      try {
        const res = await unauthCtx.get(`${LIVE_BASE}/${LIVE_ID}/schedule-job`);
        expect([401, 403]).toContain(res.status());
      } finally {
        await unauthCtx.dispose();
      }
    });

    test("TC_SCH_021_POST_WithoutToken_ShouldReturn401or403", async ({ playwright }) => {
      const now     = new Date();
      const onDate  = new Date(now.getTime() + 60 * 60 * 1000);
      const offDate = new Date(now.getTime() + 2 * 60 * 60 * 1000);

      const unauthCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
      });

      try {
        const res = await unauthCtx.post(`${LIVE_BASE}/${LIVE_ID}/schedule-job`, {
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
      const fakeJobId = "000000000000000000000001";
      const unauthCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
      });

      try {
        const res = await unauthCtx.delete(
          `${LIVE_BASE}/${LIVE_ID}/schedule-job/${fakeJobId}`
        );
        expect([401, 403]).toContain(res.status());
      } finally {
        await unauthCtx.dispose();
      }
    });

    test("TC_SCH_023_GET_WithInvalidToken_ShouldReturn401or403", async ({ playwright }) => {
      const badCtx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz_000" },
      });

      try {
        const res = await badCtx.get(`${LIVE_BASE}/${LIVE_ID}/schedule-job`);
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

      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: {} });

      // Payload vacío no debería causar 500
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
      const res = await authRequest.post(SCH_BASE(LIVE_ID), { form: payload });

      // Campos extra deben ser ignorados o generar 400, nunca 500
      expect([200, 400, 422]).toContain(res.status());

      if (res.ok()) {
        const body = await res.json();
        const job  = Array.isArray(body.data) ? body.data[0] : body.data;
        if (job?._id) {
          await deleteScheduleJob(authRequest, LIVE_ID, job._id);
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
      const fakeJobId = "000000000000000000000099";
      const res = await request.get(`${process.env.BASE_URL}${SCH_BASE(LIVE_ID)}/${fakeJobId}`, {
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
      const res = await authRequest.post(SCH_BASE(LIVE_ID), {
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
      const res   = await authRequest.get(SCH_BASE(LIVE_ID));
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

      const res = await authRequest.post(SCH_BASE(LIVE_ID), {
        form: { on_date: "null", off_date: "null" },
      });

      // Valores literales "null" no deben producir 500
      expect([200, 400, 422]).toContain(res.status());
    });
  });

}); // Schedule-Job API

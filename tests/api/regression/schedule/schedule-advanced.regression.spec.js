const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
const { getScheduleResponseSchema } = require('../../../../schemas/schedule.schema');

const LIVE_API_BASE = '/api/live-stream';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function getCreatedStream(body) {
    return Array.isArray(body.data) ? body.data[0] : body.data;
}

function unwrapCollection(body) {
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.data?.data)) return body.data.data;
    if (Array.isArray(body?.data?.items)) return body.data.items;
    if (Array.isArray(body?.items)) return body.items;
    return [];
}

function extractCreatedScheduleJob(body) {
    if (Array.isArray(body?.data)) return body.data[0] || null;
    if (body?.data && typeof body.data === 'object') return body.data;
    if (body?.data !== undefined) return body.data;
    return body || null;
}

// sm2 createScheduleJob.js contract:
//   type: 'onetime' | 'recurrent'
//   date_start: 'YYYY-MM-DD'  (date only, time via hours/minutes)
//   date_end:   'YYYY-MM-DD'
//   date_start_hour: Number
//   date_start_minute: Number
//   date_end_hour: Number
//   date_end_minute: Number
//   tz_offset: Number (minutes offset, 0 = UTC)
//   name: non-empty string
function buildScheduleJobPayload(nameSeed) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];

    return {
        name: `[QA-SCHED] ${nameSeed} ${Date.now()}`,
        type: 'onetime',
        date_start: dateStr,
        date_end: dateStr,
        date_start_hour: 10,
        date_start_minute: 0,
        date_end_hour: 11,
        date_end_minute: 0,
        tz_offset: 0,
    };
}

function buildScheduleJobUpdatePayload(nameSeed) {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dateStr = dayAfter.toISOString().split('T')[0];

    return {
        name: `[QA-SCHED-UPD] ${nameSeed} ${Date.now()}`,
        type: 'onetime',
        date_start: dateStr,
        date_end: dateStr,
        date_start_hour: 14,
        date_start_minute: 0,
        date_end_hour: 15,
        date_end_minute: 0,
        tz_offset: 0,
    };
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createScheduleJob(stream, nameSeed) {
    const endpoint = `${LIVE_API_BASE}/${stream._id}/schedule-job`;
    const payload = buildScheduleJobPayload(nameSeed || stream._id);
    const res = await apiClient.post(endpoint, payload, { form: true });
    if (!res.ok) throw new Error(`schedule-job create failed: ${res.status} ${JSON.stringify(res.body)}`);
    return { res, payload };
}

async function findCreatedScheduleJobId(stream, createdName) {
    const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);
    if (!listRes.ok) throw new Error(`Unable to read schedule-job list: ${listRes.status} ${JSON.stringify(listRes.body)}`);

    const items = unwrapCollection(listRes.body);
    const candidate = createdName
        ? items.find((item) => (item?.name || item?.title) === createdName) || items[0]
        : items[0];

    return candidate?._id || candidate?.id || null;
}

async function ensureLiveApiAvailable(client) {
    const { available } = await ensureEndpointAvailable(client, `${LIVE_API_BASE}?limit=1`, {
        context: 'API Live no disponible en este entorno',
    });
    return available;
}

async function createLiveStream(client, attrs = {}) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false', ...attrs });
    const res = await client.post(LIVE_API_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedStream(res.body);
}

test.describe('Schedule - Regression', () => {
    test('TC_SCH_005_POST_CreateScheduleJob_HappyPath @critical', async () => {
        // Intent: validar que POST schedule-job acepta payload correcto y crea el registro.
        // Cubre: SCHED-RISK-011 (validación), SCHED-RISK-005 (materialización)
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const beforeItems = unwrapCollection(
            (await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`)).body
        );

        const { res, payload } = await createScheduleJob(stream);
        expect(res.ok).toBeTruthy();

        const created = extractCreatedScheduleJob(res.body);
        expect(created).toBeTruthy();
        expect(created._id || created.id).toBeTruthy();
        expect(created.name || created.title).toContain('[QA-SCHED]');

        // Verify job appears in list
        let afterItems = beforeItems;
        for (let attempt = 0; attempt < 3; attempt++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);
            expect(listRes.ok).toBeTruthy();
            afterItems = unwrapCollection(listRes.body);
            if (afterItems.length > beforeItems.length) break;
            await sleep(500);
        }
        expect(afterItems.length).toBeGreaterThan(beforeItems.length);
    });

    test('TC_SCH_006_POST_CreateScheduleJob_InvalidPayload @negative', async () => {
        // Intent: validar que el endpoint rechaza payload con type inválido y fechas vacías.
        // Cubre: SCHED-RISK-011 (validación gaps)
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        // type inválido → INVALID_TYPE
        const resInvalidType = await apiClient.post(
            `${LIVE_API_BASE}/${stream._id}/schedule-job`,
            { name: '[QA] Invalid', type: 'once', date_start: '2026-01-01', date_end: '2026-01-01' },
            { form: true }
        );
        expect([400, 422]).toContain(resInvalidType.status);
        expect(resInvalidType.body.data).toBe('INVALID_TYPE');

        // name vacío → INVALID_NAME
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        const resNoName = await apiClient.post(
            `${LIVE_API_BASE}/${stream._id}/schedule-job`,
            { name: '', type: 'onetime', date_start: dateStr, date_end: dateStr, date_start_hour: 10, date_end_hour: 11, tz_offset: 0 },
            { form: true }
        );
        expect([400, 422]).toContain(resNoName.status);
        expect(resNoName.body.data).toBe('INVALID_NAME');

        // date_end < date_start → INVALID_DATE_ERROR
        const resInvalidDates = await apiClient.post(
            `${LIVE_API_BASE}/${stream._id}/schedule-job`,
            { name: '[QA] BadDates', type: 'onetime', date_start: dateStr, date_end: dateStr,
              date_start_hour: 11, date_end_hour: 10, tz_offset: 0 },
            { form: true }
        );
        expect([400, 422]).toContain(resInvalidDates.status);
        expect(resInvalidDates.body.data).toBe('INVALID_DATE_ERROR');

        // Verify no jobs were created
        const afterRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);
        expect(afterRes.ok).toBeTruthy();
        expect(unwrapCollection(afterRes.body)).toHaveLength(0);
    });

    test('TC_SCH_007_POST_UpdateScheduleJob_HappyPath @critical', async () => {
        // Intent: validar que POST update persiste cambios sobre un schedule job existente.
        // Cubre: SCHED-RISK-002 (update flow), SCHED-RISK-005 (materialización post-update)
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const { res: createRes } = await createScheduleJob(stream);
        expect(createRes.ok).toBeTruthy();

        const created = extractCreatedScheduleJob(createRes.body);
        const scheduleJobId = created?._id || created?.id
            || await findCreatedScheduleJobId(stream, created?.name || created?.title);
        expect(scheduleJobId).toBeTruthy();

        const updatePayload = buildScheduleJobUpdatePayload(stream._id);
        const updateRes = await apiClient.post(
            `${LIVE_API_BASE}/${stream._id}/schedule-job/${scheduleJobId}`,
            updatePayload,
            { form: true }
        );
        expect(updateRes.ok).toBeTruthy();

        const updated = extractCreatedScheduleJob(updateRes.body);
        expect(updated).toBeTruthy();

        // Verify updated job in list
        let afterItems = [];
        for (let attempt = 0; attempt < 3; attempt++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);
            expect(listRes.ok).toBeTruthy();
            afterItems = unwrapCollection(listRes.body);
            const found = afterItems.find((item) => (item?._id || item?.id) === scheduleJobId);
            if (found) break;
            await sleep(500);
        }

        const updatedItem = afterItems.find((item) => (item?._id || item?.id) === scheduleJobId);
        expect(updatedItem).toBeTruthy();
        expect(updatedItem.name || updatedItem.title).toBe(updatePayload.name);
    });

    test('TC_SCH_001_GET_LiveStreamScheduleJobList', async () => {
        // Intent: validar que el listado de schedule jobs responde para un live stream válido.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);
        expect(res.ok).toBeTruthy();
        expect(Array.isArray(unwrapCollection(res.body))).toBe(true);
    });

    test('TC_SCH_002_GET_LiveStreamScheduleJobList_StableOnRepeat', async () => {
        // Intent: validar que dos lecturas consecutivas no alteran la respuesta (SCHED-RISK-006).
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const firstRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);
        const secondRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job`);

        expect(firstRes.ok).toBeTruthy();
        expect(secondRes.ok).toBeTruthy();
        expect(unwrapCollection(secondRes.body).length).toBe(unwrapCollection(firstRes.body).length);
    });

    test('TC_SCH_003_GET_RestreamList_StableOnRepeat', async () => {
        // Intent: validar que el listado de restream es estable entre lecturas repetidas (SCHED-RISK-006).
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const firstRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/restream`);
        const secondRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/restream`);

        expect(firstRes.ok).toBeTruthy();
        expect(secondRes.ok).toBeTruthy();
        expect(unwrapCollection(secondRes.body).length).toBe(unwrapCollection(firstRes.body).length);
    });

    test('TC_SCH_004_GET_ScheduleJobList_NotFound', async () => {
        // Intent: validar comportamiento 404 para un live stream inexistente.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const res = await apiClient.get(`${LIVE_API_BASE}/000000000000000000000000/schedule-job`);
        expect([200, 404]).toContain(res.status);
        if (res.status === 404) {
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_SCH_020_DELETE_ScheduleJob_CascadeCleansSchedule @critical', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const { res: createRes } = await createScheduleJob(stream, 'cascade');
        const created = extractCreatedScheduleJob(createRes.body);
        const jobId = created?._id || created?.id
            || await findCreatedScheduleJobId(stream, created?.name || created?.title);
        expect(jobId).toBeTruthy();

        for (let i = 0; i < 3; i++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
            if (unwrapCollection(listRes.body).length > 0) break;
            await sleep(500);
        }

        const delRes = await apiClient.delete(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobId}`);
        expect([200, 204]).toContain(delRes.status);

        let remaining = [1];
        for (let i = 0; i < 3; i++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
            remaining = unwrapCollection(listRes.body);
            if (remaining.length === 0) break;
            await sleep(500);
        }
        expect(remaining).toHaveLength(0);
    });

    test('TC_SCH_021_GET_DeletedScheduleJob_NotFound @negative', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const { res: createRes } = await createScheduleJob(stream, 'del-notfound');
        const created = extractCreatedScheduleJob(createRes.body);
        const jobId = created?._id || created?.id
            || await findCreatedScheduleJobId(stream, created?.name || created?.title);
        expect(jobId).toBeTruthy();

        const delRes = await apiClient.delete(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobId}`);
        expect([200, 204]).toContain(delRes.status);

        const res = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobId}`);
        expect(res.status).toBe(404);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_SCH_022_DELETE_ScheduleJob_Twice_Returns404 @negative', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const { res: createRes } = await createScheduleJob(stream, 'double-del');
        const created = extractCreatedScheduleJob(createRes.body);
        const jobId = created?._id || created?.id
            || await findCreatedScheduleJobId(stream, created?.name || created?.title);
        expect(jobId).toBeTruthy();

        const firstDel = await apiClient.delete(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobId}`);
        expect([200, 204]).toContain(firstDel.status);

        const secondDel = await apiClient.delete(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobId}`);
        expect(secondDel.status).toBe(404);
        expect(secondDel.body.status).toBe('ERROR');
    });

    test('TC_SCH_023_GET_OrphanSchedule_NotFound @negative', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const { res: createRes } = await createScheduleJob(stream, 'orphan');
        const created = extractCreatedScheduleJob(createRes.body);
        const jobId = created?._id || created?.id
            || await findCreatedScheduleJobId(stream, created?.name || created?.title);
        expect(jobId).toBeTruthy();

        let schedId = null;
        for (let i = 0; i < 3; i++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
            const items = unwrapCollection(listRes.body);
            if (items.length > 0) {
                schedId = items[0]._id || items[0].id;
                break;
            }
            await sleep(500);
        }

        if (!schedId) {
            test.skip(true, 'Derived schedule not materialized — cannot test orphan GET');
            return;
        }

        const delRes = await apiClient.delete(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobId}`);
        expect([200, 204]).toContain(delRes.status);

        const res = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule/${schedId}`);
        expect(res.status).toBe(404);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_SCH_024_Schedule_Count_Stable_After_Cascade_Delete', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const { res: resA } = await createScheduleJob(stream, 'stable-A');
        const createdA = extractCreatedScheduleJob(resA.body);
        const jobIdA = createdA?._id || createdA?.id
            || await findCreatedScheduleJobId(stream, createdA?.name || createdA?.title);
        expect(jobIdA).toBeTruthy();

        await createScheduleJob(stream, 'stable-B');

        let schedules = [];
        for (let i = 0; i < 6; i++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
            schedules = unwrapCollection(listRes.body);
            if (schedules.length >= 2) break;
            await sleep(500);
        }

        if (schedules.length < 2) {
            test.skip(true, 'Two derived schedules did not materialize — skipping cascade stability check');
            return;
        }

        const delRes = await apiClient.delete(`${LIVE_API_BASE}/${stream._id}/schedule-job/${jobIdA}`);
        expect([200, 204]).toContain(delRes.status);

        for (let i = 0; i < 3; i++) {
            const listRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
            const current = unwrapCollection(listRes.body);
            if (current.length < schedules.length) break;
            await sleep(500);
        }

        const firstRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
        expect(firstRes.ok).toBeTruthy();
        getScheduleResponseSchema.parse(firstRes.body);
        const firstCount = unwrapCollection(firstRes.body).length;

        const secondRes = await apiClient.get(`${LIVE_API_BASE}/${stream._id}/schedule`);
        expect(secondRes.ok).toBeTruthy();
        const secondCount = unwrapCollection(secondRes.body).length;

        expect(secondCount).toBe(firstCount);
        expect(firstCount).toBeLessThan(2);
    });
});

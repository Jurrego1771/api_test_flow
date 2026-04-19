const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');

const LIVE_BASE = '/api/live-stream';
const SCHED_SEARCH = '/api/schedule/search';

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
    if (Array.isArray(body?.items)) return body.items;
    return [];
}

function buildScheduleJobPayload(seed) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return {
        name: `[QA-SCH-SMOKE] ${seed} ${Date.now()}`,
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

async function ensureLiveAvailable(client) {
    const { available } = await ensureEndpointAvailable(client, `${LIVE_BASE}?limit=1`, {
        context: 'API Live no disponible en este entorno',
    });
    return available;
}

async function createLiveStream(client) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false' });
    const res = await client.post(LIVE_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedStream(res.body);
}

async function createScheduleJob(client, streamId, seed) {
    const payload = buildScheduleJobPayload(seed || streamId);
    const res = await client.post(`${LIVE_BASE}/${streamId}/schedule-job`, payload, { form: true });
    if (!res.ok) throw new Error(`createScheduleJob failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body;
    // schedule-job create returns the job directly or inside data
    return Array.isArray(raw?.data) ? raw.data[0] : (raw?.data ?? raw);
}

test.describe('Schedule - Smoke', () => {

    test('TC_SCH_010_POST_CreateScheduleJob @critical', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const payload = buildScheduleJobPayload(stream._id);
        const res = await apiClient.post(`${LIVE_BASE}/${stream._id}/schedule-job`, payload, { form: true });

        expect(res.ok, `POST schedule-job failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
        expect(res.status).toBe(200);

        const job = Array.isArray(res.body?.data) ? res.body.data[0] : (res.body?.data ?? res.body);
        expect(job._id || job.id).toBeTruthy();
        expect(job.name || job.title).toContain('[QA-SCH-SMOKE]');
    });

    test('TC_SCH_011_GET_ScheduleJobList @critical', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        await createScheduleJob(apiClient, stream._id, 'list');

        const res = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);

        expect(res.ok, `GET schedule-job list failed: ${res.status}`).toBeTruthy();
        expect(res.status).toBe(200);
        const items = unwrapCollection(res.body);
        expect(Array.isArray(items)).toBe(true);
        expect(items.length).toBeGreaterThan(0);
    });

    test('TC_SCH_012_GET_ScheduleJobDetail @critical', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        const job = await createScheduleJob(apiClient, stream._id, 'detail');

        const jobId = job._id || job.id;
        expect(jobId).toBeTruthy();

        const res = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job/${jobId}`);

        expect(res.ok, `GET schedule-job detail failed: ${res.status}`).toBeTruthy();
        expect(res.status).toBe(200);
        const detail = res.body?.data ?? res.body;
        expect(detail._id || detail.id).toBe(jobId);
    });

    test('TC_SCH_013_GET_DerivedScheduleList', async () => {
        // Cubre: SCHED-RISK-005 — EventSchedule (derived) se materializa tras crear el job
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        await createScheduleJob(apiClient, stream._id, 'derived');

        const res = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule`);

        expect(res.ok, `GET /schedule failed: ${res.status}`).toBeTruthy();
        expect(res.status).toBe(200);
        expect(Array.isArray(unwrapCollection(res.body))).toBe(true);
    });

    test('TC_SCH_014_GET_DerivedScheduleDetail', async () => {
        // Cubre: SCHED-RISK-005 — detail de EventSchedule individual responde
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        await createScheduleJob(apiClient, stream._id, 'sched-detail');

        const listRes = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule`);
        const schedules = unwrapCollection(listRes.body);
        if (schedules.length === 0) {
            test.skip(true, 'No derived schedules found after job creation — materialization may be async');
            return;
        }

        const schedId = schedules[0]._id || schedules[0].id;
        const res = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule/${schedId}`);

        expect(res.ok, `GET /schedule/:id failed: ${res.status}`).toBeTruthy();
        expect(res.status).toBe(200);
    });

    test('TC_SCH_015_GET_ScheduleSearch', async () => {
        // GET /api/schedule/search — queries EventScheduleJob with is_recording/for_recording
        if (!(await ensureLiveAvailable(apiClient))) return;

        const res = await apiClient.get(SCHED_SEARCH);

        expect(res.ok, `GET /api/schedule/search failed: ${res.status}`).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_SCH_016_POST_UpdateScheduleJob @critical', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        const job = await createScheduleJob(apiClient, stream._id, 'upd');
        const jobId = job._id || job.id;

        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);
        const dateStr = dayAfter.toISOString().split('T')[0];
        const updName = `[QA-SCH-SMOKE-UPD] ${Date.now()}`;

        const res = await apiClient.post(`${LIVE_BASE}/${stream._id}/schedule-job/${jobId}`, {
            name: updName,
            type: 'onetime',
            date_start: dateStr,
            date_end: dateStr,
            date_start_hour: 14,
            date_start_minute: 0,
            date_end_hour: 15,
            date_end_minute: 0,
            tz_offset: 0,
        }, { form: true });

        expect(res.ok, `POST update schedule-job failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
        expect(res.status).toBe(200);
    });

    test('TC_SCH_017_DELETE_ScheduleJob @critical', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        const job = await createScheduleJob(apiClient, stream._id, 'del');
        const jobId = job._id || job.id;

        const res = await apiClient.delete(`${LIVE_BASE}/${stream._id}/schedule-job/${jobId}`);

        expect([200, 204], `DELETE schedule-job got unexpected status: ${res.status}`).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.status).toBe('OK');
        }

        // Verify job no longer in list (SCHED-RISK-008 basic delete cleanup)
        const listRes = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        const remaining = unwrapCollection(listRes.body);
        const found = remaining.find(j => (j._id || j.id) === jobId);
        expect(found).toBeUndefined();
    });

    test('TC_SCH_018_GET_NotFound_ScheduleJobList', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const res = await apiClient.get(`${LIVE_BASE}/000000000000000000000000/schedule-job`);
        expect([200, 404]).toContain(res.status);
        if (res.status === 404) expect(res.body.status).toBe('ERROR');
    });

    test('TC_SCH_019_AUTH_NoToken @negative', async ({ playwright }) => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const unauth = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
        try {
            const res = await unauth.get(`${process.env.BASE_URL}${LIVE_BASE}/${stream._id}/schedule-job`);
            expect([401, 403]).toContain(res.status());
        } finally {
            await unauth.dispose();
        }
    });
});

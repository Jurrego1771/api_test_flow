const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
const {
    scheduleJobSchema,
    createScheduleResponseSchema,
    getScheduleResponseSchema,
} = require('../../../../schemas/schedule.schema');
const { errorResponseSchema } = require('../../../../schemas/errors.schema');

const LIVE_BASE = '/api/live-stream';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

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
    return Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
}

function buildJobPayload(nameSeed = '') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return {
        name: `[QA-CONTRACT] Schedule ${nameSeed} ${Date.now()}`,
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

test.describe('Schedule — Contract', () => {
    test('TC_CON_SCH_001 POST schedule-job create response schema', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(
            `${LIVE_BASE}/${stream._id}/schedule-job`,
            buildJobPayload('create'),
            { form: true }
        );
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createScheduleResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_SCH_002 GET schedule-job list response schema', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        await apiClient.post(`${LIVE_BASE}/${stream._id}/schedule-job`, buildJobPayload('list'), { form: true });

        const res = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const wrapperSchema = require('zod').z.object({
            status: require('zod').z.literal('OK'),
            data: require('zod').z.union([
                require('zod').z.array(scheduleJobSchema),
                scheduleJobSchema,
            ]),
        });
        const parsed = wrapperSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_SCH_003 GET derived schedule list response schema', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        await apiClient.post(`${LIVE_BASE}/${stream._id}/schedule-job`, buildJobPayload('derived'), { form: true });

        const res = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule`);
        expect(res.ok, `Derived list failed: ${res.status}`).toBeTruthy();

        const parsed = getScheduleResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_SCH_004 POST invalid type error schema @negative', async () => {
        if (!(await ensureLiveAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        const res = await apiClient.post(
            `${LIVE_BASE}/${stream._id}/schedule-job`,
            { name: '[QA] Invalid type', type: 'once', date_start: dateStr, date_end: dateStr, tz_offset: 0 },
            { form: true }
        );
        expect([400, 422]).toContain(res.status);

        const parsed = errorResponseSchema.safeParse(res.body);
        expect(parsed.success, `Error schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

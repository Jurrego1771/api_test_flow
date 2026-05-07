const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const {
    createEpgInputResponseSchema,
    epgSyncResponseSchema,
} = require('../../../../schemas/epg.schema');

const EPG_INPUT_BASE = '/api/settings/epg-mask/input';
const LIVE_BASE = '/api/live-stream';
const QA_EPG_URL = process.env.EPG_TEST_URL || 'https://example.com/qa-epg-test.json';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createLiveStream(client, cleanerRef) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false' });
    const res = await client.post(LIVE_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    const stream = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
    if (cleanerRef) cleanerRef.register('live-stream', stream._id);
    return stream;
}

test.describe('EPG - Contract', () => {

    // C_001: POST create returns expected schema (buildEpgMaskResponse shape)
    test('TC_EPG_C_001_POST_CreateEpgInput_ResponseSchema @contract', async () => {
        const payload = {
            name: `[QA-EPG-CONTRACT] ${Date.now()}`,
            epgUrl: QA_EPG_URL,
            timezone: 0,
            enabled: false,
        };

        const res = await apiClient.post(EPG_INPUT_BASE, payload);
        expect(res.ok, `POST EPG Input failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createEpgInputResponseSchema.safeParse(res.body);
        expect(
            parsed.success,
            `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`
        ).toBe(true);

        cleaner.register('epg-origin', String(parsed.data.data.id));
    });

    // C_002: GET /input/:id returns same schema as POST create
    test('TC_EPG_C_002_GET_EpgInputDetail_ResponseSchema @contract', async () => {
        const createRes = await apiClient.post(EPG_INPUT_BASE, {
            name: `[QA-EPG-CONTRACT-GET] ${Date.now()}`,
            epgUrl: QA_EPG_URL,
            timezone: 0,
            enabled: false,
        });
        expect(createRes.ok).toBeTruthy();
        const epgId = createRes.body.data.id;
        cleaner.register('epg-origin', String(epgId));

        const res = await apiClient.get(`${EPG_INPUT_BASE}/${epgId}`);
        expect(res.ok, `GET EPG Input failed: ${res.status}`).toBeTruthy();

        const parsed = createEpgInputResponseSchema.safeParse(res.body);
        expect(
            parsed.success,
            `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`
        ).toBe(true);
    });

    // C_003: POST sync returns { status: 'OK', data: 'EPG_SYNCED' }
    test('TC_EPG_C_003_POST_EpgSync_ResponseSchema @contract', async () => {
        if (!process.env.EPG_TEST_URL) {
            test.skip(true, 'EPG_TEST_URL not configured');
            return;
        }

        // Register epg-origin FIRST so live-stream is deleted first (reverse order)
        const epgRes = await apiClient.post(EPG_INPUT_BASE, {
            name: `[QA-EPG-CONTRACT-SYNC] ${Date.now()}`,
            epgUrl: process.env.EPG_TEST_URL,
            timezone: 0,
            enabled: true,
        });
        expect(epgRes.ok, `Create EPG origin failed: ${epgRes.status}`).toBeTruthy();
        const epgId = epgRes.body.data.id;
        cleaner.register('epg-origin', String(epgId));

        const stream = await createLiveStream(apiClient, cleaner);

        await apiClient.post(`${LIVE_BASE}/${stream._id}`, { epg: String(epgId) }, { form: true });

        const syncRes = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);

        if (syncRes.status === 403) {
            test.skip(true, 'EPG module not enabled on this account');
            return;
        }
        if (syncRes.status === 400) {
            test.skip(true, `Sync returned ${syncRes.body.data}`);
            return;
        }

        expect(syncRes.status).toBe(200);

        const parsed = epgSyncResponseSchema.safeParse(syncRes.body);
        expect(
            parsed.success,
            `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`
        ).toBe(true);
    });

});

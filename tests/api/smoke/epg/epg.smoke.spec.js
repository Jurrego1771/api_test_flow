const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

const EPG_INPUT_BASE = '/api/settings/epg-mask/input';
const EPG_INPUTS_LIST = '/api/settings/epg-mask/inputs';
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

function buildEpgInputPayload(overrides = {}) {
    return {
        name: `[QA-EPG] ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`,
        epgUrl: QA_EPG_URL,
        timezone: 0,
        enabled: false,
        ...overrides,
    };
}

async function createLiveStream(client, cleanerRef) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false' });
    const res = await client.post(LIVE_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    const stream = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
    if (cleanerRef) cleanerRef.register('live-stream', stream._id);
    return stream;
}

async function createEpgInput(client, cleanerRef, overrides = {}) {
    const res = await client.post(EPG_INPUT_BASE, buildEpgInputPayload(overrides));
    if (!res.ok) throw new Error(`createEpgInput failed: ${res.status} ${JSON.stringify(res.body)}`);
    // API returns { id, name, epg_url, timezone, enabled, ... } via buildEpgMaskResponse
    const data = res.body.data;
    if (cleanerRef) cleanerRef.register('epg-origin', String(data.id));
    return data;
}

test.describe('EPG - Smoke', () => {

    test('TC_EPG_S_001_POST_CreateEpgInput @critical', async () => {
        const payload = buildEpgInputPayload();
        const res = await apiClient.post(EPG_INPUT_BASE, payload);

        expect(res.ok, `POST EPG Input failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');

        const data = res.body.data;
        expect(data.id).toBeTruthy();
        expect(data.name).toContain('[QA-EPG]');
        expect(typeof data.enabled).toBe('boolean');
        cleaner.register('epg-origin', String(data.id));
    });

    test('TC_EPG_S_002_GET_EpgInputDetail @critical', async () => {
        const created = await createEpgInput(apiClient, cleaner);

        const res = await apiClient.get(`${EPG_INPUT_BASE}/${created.id}`);

        expect(res.ok, `GET EPG Input failed: ${res.status}`).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(String(res.body.data.id)).toBe(String(created.id));
        expect(res.body.data.name).toBe(created.name);
    });

    test('TC_EPG_S_003_PUT_UpdateEpgInput @critical', async () => {
        const created = await createEpgInput(apiClient, cleaner);
        const updatedName = `[QA-EPG-UPD] ${Date.now()}`;

        const res = await apiClient.put(`${EPG_INPUT_BASE}/${created.id}`, {
            name: updatedName,
            epgUrl: QA_EPG_URL,
            enabled: true,
        });

        expect(res.ok, `PUT EPG Input failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(res.body.data.name).toBe(updatedName);
        expect(res.body.data.enabled).toBe(true);
    });

    test('TC_EPG_S_004_DELETE_EpgInput @critical', async () => {
        // No auto-register: we manually delete and verify it's gone
        const created = await createEpgInput(apiClient, null);

        const res = await apiClient.delete(`${EPG_INPUT_BASE}/${created.id}`);

        expect([200, 204]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.status).toBe('OK');
        }

        const getRes = await apiClient.get(`${EPG_INPUT_BASE}/${created.id}`);
        expect(getRes.status).toBe(404);
    });

    test('TC_EPG_S_005_GET_EpgInput_New_Template', async () => {
        const res = await apiClient.get(`${EPG_INPUT_BASE}/new`);

        expect(res.ok, `GET /new failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        // Template must return empty structure — id = 'new'
        expect(res.body.data.id).toBe('new');
        expect(res.body.data.name).toBe('');
    });

    test('TC_EPG_S_006_POST_EpgSync_HappyPath @critical', async () => {
        if (!process.env.EPG_TEST_URL) {
            test.skip(true, 'EPG_TEST_URL not configured — skipping sync smoke');
            return;
        }

        // Register epg-origin FIRST so cleaner deletes live-stream first (reverse order)
        const epgOrigin = await createEpgInput(apiClient, cleaner, {
            epgUrl: process.env.EPG_TEST_URL,
            enabled: true,
        });
        const stream = await createLiveStream(apiClient, cleaner);

        // Associate EPG origin to live stream
        await apiClient.post(`${LIVE_BASE}/${stream._id}`, { epg: String(epgOrigin.id) }, { form: true });

        const syncRes = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);

        if (syncRes.status === 403) {
            test.skip(true, 'EPG module not enabled on this account');
            return;
        }

        // 400 NO_FUTURE_EPG_DATA is valid when all EPG data is in the past
        expect([200, 400]).toContain(syncRes.status);
        if (syncRes.status === 200) {
            expect(syncRes.body.status).toBe('OK');
            expect(syncRes.body.data).toBe('EPG_SYNCED');
        }
    });

    test('TC_EPG_S_007_GET_EpgInputsList', async () => {
        // GET /api/settings/epg-mask/inputs — list available EPG inputs
        const res = await apiClient.get(EPG_INPUTS_LIST);

        // 403 = epg module not enabled on this account (still a valid response)
        expect([200, 403]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.status).toBe('OK');
        }
    });

    test('TC_EPG_S_008_POST_EpgSync_NoEpgConfigured @negative', async () => {
        const stream = await createLiveStream(apiClient, cleaner);

        // Sync without EPG origin associated to live stream → 400 MISSING_EPG
        const syncRes = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);

        if (syncRes.status === 403) {
            test.skip(true, 'EPG module not enabled on this account');
            return;
        }

        expect(syncRes.status).toBe(400);
        expect(syncRes.body.status).toBe('ERROR');
        expect(syncRes.body.data).toBe('MISSING_EPG');
    });

});

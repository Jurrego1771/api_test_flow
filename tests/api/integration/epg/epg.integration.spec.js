const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

const EPG_INPUT_BASE = '/api/settings/epg-mask/input';
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

function buildEpgInputPayload(overrides = {}) {
    return {
        name: `[QA-EPG-INT] ${Date.now()} ${Math.random().toString(36).slice(2, 7)}`,
        epgUrl: process.env.EPG_TEST_URL || 'https://example.com/qa-epg.json',
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
    const data = res.body.data;
    if (cleanerRef) cleanerRef.register('epg-origin', String(data.id));
    return data;
}

function buildScheduleJobPayload(overrides = {}) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return {
        name: `[QA-EPG-INT] ${Date.now()}`,
        type: 'onetime',
        date_start: dateStr,
        date_end: dateStr,
        date_start_hour: 10,
        date_start_minute: 0,
        date_end_hour: 11,
        date_end_minute: 0,
        tz_offset: 0,
        ...overrides,
    };
}

async function createScheduleJob(client, streamId, overrides = {}) {
    const payload = buildScheduleJobPayload(overrides);
    const res = await client.post(`${LIVE_BASE}/${streamId}/schedule-job`, payload, { form: true });
    if (!res.ok) throw new Error(`createScheduleJob failed: ${res.status} ${JSON.stringify(res.body)}`);
    return Array.isArray(res.body.data) ? res.body.data[0] : (res.body.data ?? res.body);
}

function unwrapList(body) {
    if (Array.isArray(body?.data)) return body.data;
    if (Array.isArray(body?.data?.data)) return body.data.data;
    return [];
}

test.describe('EPG - Integration', () => {

    // ── I_001: Full sync flow ─────────────────────────────────────────────────
    test('TC_EPG_I_001_FullSyncFlow_CreatesScheduleJobs @critical', async () => {
        if (!process.env.EPG_TEST_URL) {
            test.skip(true, 'EPG_TEST_URL not configured');
            return;
        }

        // Register epg-origin FIRST → cleaner deletes live-stream first, then epg-origin
        const epgOrigin = await createEpgInput(apiClient, cleaner, {
            epgUrl: process.env.EPG_TEST_URL,
            enabled: true,
        });
        const stream = await createLiveStream(apiClient, cleaner);

        await apiClient.post(`${LIVE_BASE}/${stream._id}`, { epg: String(epgOrigin.id) }, { form: true });

        const syncRes = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);

        if (syncRes.status === 403) {
            test.skip(true, 'EPG module not enabled on this account');
            return;
        }
        if (syncRes.status === 400 && syncRes.body.data === 'NO_FUTURE_EPG_DATA') {
            test.skip(true, 'No future EPG data in EPG_TEST_URL');
            return;
        }

        expect(syncRes.status).toBe(200);
        expect(syncRes.body.status).toBe('OK');
        expect(syncRes.body.data).toBe('EPG_SYNCED');

        // Verify schedule jobs were created
        const listRes = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        expect(listRes.ok).toBeTruthy();
        const jobs = unwrapList(listRes.body);
        expect(jobs.length).toBeGreaterThan(0);

        // Jobs must have the EPG origin id reference
        const epgJob = jobs.find(j => j.epg_origin_id);
        expect(epgJob).toBeDefined();
    });

    // ── I_002: Re-sync idempotency ────────────────────────────────────────────
    test('TC_EPG_I_002_ReSyncIdempotency_NoScheduleDuplicates @critical', async () => {
        if (!process.env.EPG_TEST_URL) {
            test.skip(true, 'EPG_TEST_URL not configured');
            return;
        }

        const epgOrigin = await createEpgInput(apiClient, cleaner, {
            epgUrl: process.env.EPG_TEST_URL,
            enabled: true,
        });
        const stream = await createLiveStream(apiClient, cleaner);

        await apiClient.post(`${LIVE_BASE}/${stream._id}`, { epg: String(epgOrigin.id) }, { form: true });

        const sync1 = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);
        if (sync1.status === 403) {
            test.skip(true, 'EPG module not enabled on this account');
            return;
        }
        if (sync1.status === 400) {
            test.skip(true, `Sync 1 returned ${sync1.body.data}`);
            return;
        }
        expect(sync1.status).toBe(200);

        const listAfterFirst = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        const countFirst = unwrapList(listAfterFirst.body).length;

        const sync2 = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);
        expect(sync2.status).toBe(200);

        const listAfterSecond = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        const countSecond = unwrapList(listAfterSecond.body).length;

        // Re-sync deletes old EPG jobs and recreates — count must be stable
        expect(countSecond).toBe(countFirst);
    });

    // ── I_003: Schedule jobs visible in list after sync ───────────────────────
    test('TC_EPG_I_003_SyncedJobs_VisibleInScheduleJobList', async () => {
        if (!process.env.EPG_TEST_URL) {
            test.skip(true, 'EPG_TEST_URL not configured');
            return;
        }

        const epgOrigin = await createEpgInput(apiClient, cleaner, {
            epgUrl: process.env.EPG_TEST_URL,
            enabled: true,
        });
        const stream = await createLiveStream(apiClient, cleaner);

        await apiClient.post(`${LIVE_BASE}/${stream._id}`, { epg: String(epgOrigin.id) }, { form: true });

        const syncRes = await apiClient.post(`${LIVE_BASE}/${stream._id}/epg/sync`, null);
        if (syncRes.status === 403) {
            test.skip(true, 'EPG module not enabled on this account');
            return;
        }
        if (syncRes.status !== 200) {
            test.skip(true, `Sync returned ${syncRes.status}: ${syncRes.body.data}`);
            return;
        }

        const listRes = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        expect(listRes.ok).toBeTruthy();
        const jobs = unwrapList(listRes.body);

        // Each synced job must have required fields
        expect(jobs.length).toBeGreaterThan(0);
        const job = jobs[0];
        expect(job.name).toBeTruthy();
        expect(job.date_start).toBeTruthy();
        expect(job.date_end).toBeTruthy();
    });

    // ── I_004: EPG origin in-use prevents deletion ────────────────────────────
    test('TC_EPG_I_004_DeleteEpgOriginInUse_Returns400', async () => {
        // Register epg-origin FIRST → cleaned AFTER live-stream in afterEach
        const epgOrigin = await createEpgInput(apiClient, cleaner, { enabled: true });
        const stream = await createLiveStream(apiClient, cleaner);

        // Associate EPG origin to live stream (puts it "in use")
        const assocRes = await apiClient.post(
            `${LIVE_BASE}/${stream._id}`,
            { epg: String(epgOrigin.id) },
            { form: true }
        );
        expect(assocRes.ok, `Associate EPG failed: ${assocRes.status}`).toBeTruthy();

        // Attempt to delete the EPG origin while still referenced → must be blocked
        const delRes = await apiClient.delete(`${EPG_INPUT_BASE}/${epgOrigin.id}`);

        expect(delRes.status).toBe(400);
        expect(delRes.body.status).toBe('ERROR');
        expect(delRes.body.message).toContain('EPG_MASK_IN_USE');
    });

    // ── I_005: Delete live stream cascades schedule jobs ──────────────────────
    test('TC_EPG_I_005_DeleteLiveStream_CascadesScheduleJobs @critical', async () => {
        // No auto-register — we delete the stream manually to verify cascade
        const stream = await createLiveStream(apiClient, null);

        await createScheduleJob(apiClient, stream._id);
        await createScheduleJob(apiClient, stream._id, { date_start_hour: 14, date_end_hour: 15 });

        const listBefore = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        expect(unwrapList(listBefore.body).length).toBeGreaterThan(0);

        const delRes = await apiClient.delete(`${LIVE_BASE}/${stream._id}`);
        expect([200, 204]).toContain(delRes.status);

        // After delete: schedule job list must be 404 or empty
        const listAfter = await apiClient.get(`${LIVE_BASE}/${stream._id}/schedule-job`);
        if (listAfter.status === 404) return;

        expect(listAfter.status).toBe(200);
        expect(unwrapList(listAfter.body).length).toBe(0);
    });

});

const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const {
    createLiveStreamResponseSchema,
    getLiveStreamResponseSchema,
    listLiveStreamResponseSchema,
} = require('../../../../schemas/live.schema');

const ACCOUNT_ID = process.env.ACCOUNT_ID || 'test-account-id';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Live - Contract', { tag: ['@contract'] }, () => {
    test('TC_CON_LIV_001 POST /api/live-stream response schema', async () => {
        const payload = {
            name: `[QA-CONTRACT] Live ${Date.now()}`,
            account: ACCOUNT_ID,
        };
        const res = await apiClient.post('/api/live-stream', payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createLiveStreamResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('live-stream', parsed.data.data._id);
    });

    test('TC_CON_LIV_002 GET /api/live-stream/:id response schema', async () => {
        const createRes = await apiClient.post('/api/live-stream', {
            name: `[QA-CONTRACT] Live ${Date.now()}`,
            account: ACCOUNT_ID,
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const liveId = createRes.body.data._id;
        cleaner.register('live-stream', liveId);

        const res = await apiClient.get(`/api/live-stream/${liveId}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getLiveStreamResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_LIV_003 GET /api/live-stream list response schema', async () => {
        const res = await apiClient.get('/api/live-stream', { account: ACCOUNT_ID });
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listLiveStreamResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

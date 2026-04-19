const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const {
    createMediaResponseSchema,
    getMediaResponseSchema,
    listMediaResponseSchema,
} = require('../../../../schemas/media.schema');

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

test.describe('Media - Contract', () => {
    test('TC_CON_MED_001 POST /api/media response schema', async () => {
        const payload = {
            title: `[QA-CONTRACT] Media ${Date.now()}`,
            account: ACCOUNT_ID,
        };
        const res = await apiClient.post('/api/media', payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createMediaResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('media', parsed.data.data._id);
    });

    test('TC_CON_MED_002 GET /api/media/:id response schema', async () => {
        const createRes = await apiClient.post('/api/media', {
            title: `[QA-CONTRACT] Media ${Date.now()}`,
            account: ACCOUNT_ID,
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const mediaId = createRes.body.data._id;
        cleaner.register('media', mediaId);

        const res = await apiClient.get(`/api/media/${mediaId}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getMediaResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_MED_003 GET /api/media list response schema', async () => {
        const res = await apiClient.get('/api/media', { account: ACCOUNT_ID });
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listMediaResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

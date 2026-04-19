const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const {
    createAdResponseSchema,
    getAdResponseSchema,
    listAdResponseSchema,
} = require('../../../../schemas/ad.schema');

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

test.describe('Ad - Contract', { tag: ['@contract'] }, () => {
    test('TC_CON_AD_001 POST /api/ad response schema', async () => {
        const payload = {
            name: `[QA-CONTRACT] Ad ${Date.now()}`,
            account: ACCOUNT_ID,
            type: 'schedule',
        };
        const res = await apiClient.post('/api/ad/new', payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createAdResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('ad', parsed.data.data._id);
    });

    test('TC_CON_AD_002 GET /api/ad/:id response schema', async () => {
        const createRes = await apiClient.post('/api/ad/new', {
            name: `[QA-CONTRACT] Ad ${Date.now()}`,
            account: ACCOUNT_ID,
            type: 'schedule',
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const adId = createRes.body.data._id;
        cleaner.register('ad', adId);

        const res = await apiClient.get(`/api/ad/${adId}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getAdResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_AD_003 GET /api/ad list response schema', async () => {
        const res = await apiClient.get('/api/ad', { account: ACCOUNT_ID });
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listAdResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

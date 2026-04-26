const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const { showSchema } = require('../../../../schemas/show.schema');

const ACCOUNT_ID = process.env.ACCOUNT_ID || 'test-account-id';

// Show API: POST returns array [show], GET by ID returns object directly (no {status,data} wrapper)
function extractShow(body) {
    const raw = body?.data ?? body;
    return Array.isArray(raw) ? raw[0] : raw;
}

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Show - Contract', () => {
    test('TC_CON_SHW_001 POST /api/show response schema', async () => {
        const payload = {
            title: `[QA-CONTRACT] Show ${Date.now()}`,
            type: 'tvshow',
        };
        const res = await apiClient.post('/api/show/', payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const show = extractShow(res.body);
        const parsed = showSchema.safeParse(show);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('show', show._id);
    });

    test('TC_CON_SHW_002 GET /api/show/:id response schema', async () => {
        const createRes = await apiClient.post('/api/show/', {
            title: `[QA-CONTRACT] Show ${Date.now()}`,
            type: 'podcast',
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const show = extractShow(createRes.body);
        cleaner.register('show', show._id);

        const res = await apiClient.get(`/api/show/${show._id}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const fetched = extractShow(res.body);
        const parsed = showSchema.safeParse(fetched);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

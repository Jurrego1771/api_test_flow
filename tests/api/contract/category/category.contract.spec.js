const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const {
    createCategoryResponseSchema,
    getCategoryResponseSchema,
    listCategoryResponseSchema,
} = require('../../../../schemas/category.schema');

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

test.describe('Category - Contract', () => {
    test('TC_CON_CAT_001 POST /api/category response schema', async () => {
        const payload = {
            name: `[QA-CONTRACT] Category ${Date.now()}`,
            account: ACCOUNT_ID,
        };
        const res = await apiClient.post('/api/category', payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createCategoryResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('category', parsed.data.data._id);
    });

    test('TC_CON_CAT_002 GET /api/category/:id response schema', async () => {
        const createRes = await apiClient.post('/api/category', {
            name: `[QA-CONTRACT] Category ${Date.now()}`,
            account: ACCOUNT_ID,
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const categoryId = createRes.body.data._id;
        cleaner.register('category', categoryId);

        const res = await apiClient.get(`/api/category/${categoryId}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getCategoryResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_CAT_003 GET /api/category list response schema', async () => {
        const res = await apiClient.get('/api/category', { account: ACCOUNT_ID });
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listCategoryResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

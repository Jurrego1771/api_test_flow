const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const {
    createAccessRestrictionResponseSchema,
    getAccessRestrictionResponseSchema,
    listAccessRestrictionResponseSchema,
} = require('../../../../schemas/access_restriction.schema');

// Real route: /api/settings/advanced-access-restrictions
// POST/DELETE require MIDDLEWARE.AUTH (session), not API token — TC_CON_AR_001/002 are skipped
const AR_BASE = '/api/settings/advanced-access-restrictions';

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

test.describe('Access Restriction - Contract', { tag: ['@contract'] }, () => {
    test.skip('TC_CON_AR_001 POST /api/settings/advanced-access-restrictions response schema', async () => {
        // POST requires session auth (MIDDLEWARE.AUTH), not API token — needs browser session to run
        const payload = {
            name: `[QA-CONTRACT] AR ${Date.now()}`,
            account: ACCOUNT_ID,
        };
        const res = await apiClient.post(AR_BASE, payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createAccessRestrictionResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('accessRestriction', parsed.data.data._id);
    });

    test.skip('TC_CON_AR_002 GET /api/settings/advanced-access-restrictions/:id response schema', async () => {
        // Depends on POST create which requires session auth
        const createRes = await apiClient.post(AR_BASE, {
            name: `[QA-CONTRACT] AR ${Date.now()}`,
            account: ACCOUNT_ID,
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const arId = createRes.body.data._id;
        cleaner.register('accessRestriction', arId);

        const res = await apiClient.get(`${AR_BASE}/${arId}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getAccessRestrictionResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_AR_003 GET /api/settings/advanced-access-restrictions list response schema', async () => {
        const res = await apiClient.get(AR_BASE, { account: ACCOUNT_ID });
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listAccessRestrictionResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

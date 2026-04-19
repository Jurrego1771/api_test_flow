const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');

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

function getShowFromBody(body) {
    const raw = body?.data ?? body;
    return Array.isArray(raw) ? raw[0] : raw;
}

async function createShow(client, attrs = {}) {
    const payload = {
        title: `[QA-AUTO] Show ${Date.now()}`,
        type: 'tvshow',
        account: ACCOUNT_ID,
        ...attrs,
    };
    const res = await client.post('/api/show', payload, { form: true });
    if (!res.ok) throw new Error(`createShow failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getShowFromBody(res.body);
}

test.describe('Show - Smoke', () => {
    test('TC_SHW_001_POST_CreateMinimal', async () => {
        // Intent: happy path de creación de show con campos mínimos.
        const payload = {
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Show ${Date.now()}`,
            type: 'tvshow',
        };
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(created).toHaveProperty('_id');
        expect(created.title).toBe(payload.title);
        expect(created.type).toBe('tvshow');

        cleaner.register('show', created._id);
    });

    test('TC_SHW_010_GET_ExistingShowDetail', async () => {
        // Intent: validar que GET por ID retorna show con campos correctos.
        const show = await createShow(apiClient, { type: 'tvshow' });
        cleaner.register('show', show._id);

        const res = await apiClient.get(`/api/show/${show._id}`);

        expect(res.ok).toBeTruthy();
        const fetched = getShowFromBody(res.body);
        expect(fetched._id).toBe(show._id);
        expect(fetched.title).toBe(show.title);
    });

    test('TC_SHW_NEG_010_GET_NonExistentShow', async () => {
        // Intent: validar que ID inexistente retorna error esperado.
        const res = await apiClient.get('/api/show/507f1f77bcf86cd799439011');
        expect([404, 500]).toContain(res.status);
    });

    test('TC_SHW_050_DELETE_Success', async () => {
        // Intent: validar eliminación exitosa de show.
        const show = await createShow(apiClient, { type: 'radioshow' });

        const res = await apiClient.delete(`/api/show/${show._id}`);
        expect(res.ok).toBeTruthy();
        expect(res.status).toBe(200);
    });

    test('TC_SHW_NEG_002_POST_MissingTitle', async () => {
        // Intent: validar que title es campo obligatorio.
        const res = await apiClient.post('/api/show', {
            account: ACCOUNT_ID,
            type: 'tvshow',
        }, { form: true });
        expect([400, 422]).toContain(res.status);
    });
});

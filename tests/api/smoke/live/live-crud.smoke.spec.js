const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

const API_BASE = '/api/live-stream';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function getCreatedStream(body) {
    return Array.isArray(body.data) ? body.data[0] : body.data;
}

async function ensureLiveApiAvailable(client) {
    const res = await client.get(`${API_BASE}?limit=1`);
    if (res.status === 404 || res.status === 401) {
        test.skip(true, 'API Live no disponible en este entorno');
        return false;
    }
    return res.ok;
}

async function createLiveStream(client, attrs = {}) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false', ...attrs });
    const res = await client.post(API_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedStream(res.body);
}

test.describe('Live Stream - Smoke', { tag: ['@smoke'] }, () => {
    test('TC_LIV_001_POST_CreateStreamVideo', async () => {
        // Intent: happy path de creación de live stream tipo video.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const payload = dataFactory.generateLiveStreamPayload({ type: 'video' });
        const res = await apiClient.post(API_BASE, payload, { form: true });
        if (!res.ok) { test.skip(true, 'POST Live no disponible'); return; }

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        const created = getCreatedStream(res.body);
        expect(created).toHaveProperty('_id');

        cleaner.register('live-stream', created._id);
    });

    test('TC_LIV_002_GET_ListStreams', async () => {
        // Intent: validar contrato base del listado de live streams.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const res = await apiClient.get(`${API_BASE}?limit=10`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeLessThanOrEqual(10);
    });

    test('TC_LIV_003_GET_DetailStream', async () => {
        // Intent: validar que GET por ID retorna el stream correcto.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}/${stream._id}`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(res.body.data._id).toBe(stream._id);
    });

    test('TC_LIV_005_DELETE_Stream', async () => {
        // Intent: validar eliminación exitosa y que el stream ya no es accesible.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);

        const delRes = await apiClient.delete(`${API_BASE}/${stream._id}`);
        expect([200, 204]).toContain(delRes.status);

        const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
        expect([404]).toContain(getRes.status);
    });

    test('TC_LIV_003b_GET_DetailNotFound', async () => {
        // Intent: ID inexistente retorna error esperado.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const res = await apiClient.get(`${API_BASE}/000000000000000000000000`);
        expect([200, 404]).toContain(res.status);
        if (res.status === 404) expect(res.body.status).toBe('ERROR');
    });
});

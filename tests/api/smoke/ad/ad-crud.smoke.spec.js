const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createAd(client, overrides = {}) {
    const payload = {
        name: `qa_ad_${Date.now()}`,
        type: 'vast',
        is_enabled: 'false',
        preroll_skip_at: 0,
        min_media_time_length: 0,
        ...overrides,
    };
    const res = await client.post('/api/ad/new', payload, { form: true });
    if (!res.ok) throw new Error(`createAd failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    return Array.isArray(raw) ? raw[0] : raw;
}

test.describe('Ad - Creación', () => {
    test('Crear Ad mínimo (name, type, flags)', async () => {
        // Intent: validar creación exitosa de Ad y contrato de respuesta.
        const ad = await createAd(apiClient);
        cleaner.register('ad', ad._id);

        expect(ad).toHaveProperty('_id');
        expect(ad).toHaveProperty('name');
        expect(['vast', 'vmap', 'googleima', 'local', 'ad-insertion', 'adswizz']).toContain(ad.type);
        expect(ad).toHaveProperty('is_enabled');
        expect(ad).toHaveProperty('preroll_skip_at');
        expect(ad).toHaveProperty('min_media_time_length');
        expect(ad).toHaveProperty('schedule');
        expect(ad).toHaveProperty('adswizz');
        expect(ad).toHaveProperty('insertion');
        expect(ad).toHaveProperty('categories');
        expect(ad).toHaveProperty('tags');
        expect(ad).toHaveProperty('referers');
    });
});

test.describe('Ad - GET', () => {
    test('Obtener Ad por ID (200)', async () => {
        // Intent: validar que GET por ID retorna el recurso correcto.
        const ad = await createAd(apiClient, { name: `qa_ad_get_${Date.now()}` });
        cleaner.register('ad', ad._id);

        const res = await apiClient.get(`/api/ad/${ad._id}`);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(res.body.data._id).toBe(ad._id);
    });

    test('ID inexistente devuelve 404', async () => {
        // Intent: validar que ID inexistente retorna NOT_FOUND.
        const res = await apiClient.get('/api/ad/5ee2704ea666e81cf291a085');

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('NOT_FOUND');
    });
});

test.describe('Ad - Update', () => {
    test('Actualizar Ad existente (200)', async () => {
        // Intent: validar actualización parcial y persistencia de cambios.
        const ad = await createAd(apiClient, { name: `qa_ad_update_${Date.now()}` });
        cleaner.register('ad', ad._id);

        const updatePayload = {
            name: `${ad.name}_updated`,
            is_enabled: 'true',
            preroll_skip_at: 5,
            min_media_time_length: 0,
        };
        const res = await apiClient.post(`/api/ad/${ad._id}`, updatePayload, { form: true });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(res.body.data._id).toBe(ad._id);
        expect(res.body.data.name).toBe(updatePayload.name);
        expect(res.body.data.is_enabled).toBeTruthy();
    });

    test('min_media_time_length negativo se normaliza o devuelve 400', async () => {
        const ad = await createAd(apiClient, { name: `qa_ad_update_${Date.now()}` });
        cleaner.register('ad', ad._id);

        const res = await apiClient.post(`/api/ad/${ad._id}`, { min_media_time_length: -1 }, { form: true });

        if (res.status === 400) {
            expect(res.body.status).toBe('ERROR');
        } else {
            expect(res.status).toBe(200);
            expect(res.body.data.min_media_time_length).toBeGreaterThanOrEqual(0);
        }
    });

    test('ID inexistente devuelve 404', async () => {
        const res = await apiClient.post('/api/ad/5ee2704ea666e81cf291a085', { name: 'should_not_exist' }, { form: true });

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('NOT_FOUND');
    });
});

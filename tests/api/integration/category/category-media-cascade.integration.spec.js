const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createCategory(client, overrides = {}) {
    const payload = dataFactory.generateCategoryPayload(overrides);
    const res = await client.post('/api/category', payload, { form: true });
    if (!res.ok) throw new Error(`createCategory failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    return Array.isArray(raw) ? raw[0] : raw;
}

async function createMedia(client) {
    const res = await client.post('/api/media', dataFactory.generateMediaPayload(), { form: true });
    if (!res.ok) throw new Error(`createMedia failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    return Array.isArray(raw) ? raw[0] : raw;
}

// categories en media pueden venir como string[] o {_id}[] — normaliza a string[]
function mediaCategoryIds(media) {
    const cats = media?.categories ?? [];
    return cats.map((c) => (typeof c === 'string' ? c : c?._id ?? c?.category ?? c)).map(String);
}

test.describe('Category — Media assignment + cascade cleanup Integration', () => {
    test('TC_CAT_INT_001_POST_AssignMedia_BulkHappyPath @critical', async () => {
        // CAT-RISK-004: asignación masiva de categoría a múltiples medias
        const cat = await createCategory(apiClient);
        cleaner.register('category', cat._id);

        const m1 = await createMedia(apiClient);
        cleaner.register('media', m1._id);
        const m2 = await createMedia(apiClient);
        cleaner.register('media', m2._id);

        // body JSON para que media_id viaje como array (backend: typeof === 'object')
        const res = await apiClient.post(`/api/category/${cat._id}/media`, { media_id: [m1._id, m2._id] });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        // data = count de medias modificadas (al menos una; el valor exacto depende del timing del cursor)
        expect(typeof res.body.data).toBe('number');
        expect(res.body.data).toBeGreaterThanOrEqual(1);

        // Verificación real: ambas medias terminan con la categoría asignada (poll por lag de escritura)
        for (const id of [m1._id, m2._id]) {
            await expect.poll(async () => {
                const getRes = await apiClient.get(`/api/media/${id}`);
                return mediaCategoryIds(getRes.body.data);
            }, { timeout: 8000, intervals: [500, 1000, 2000] }).toContain(String(cat._id));
        }
    });

    test('TC_CAT_INT_002_DELETE_Category_PullsRefFromMedia @critical', async () => {
        // CAT-RISK-003: borrar categoría debe limpiar la referencia en Media (hook post('remove') → $pull)
        const cat = await createCategory(apiClient);
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        // Asigna y confirma (poll por lag de escritura)
        const assignRes = await apiClient.post(`/api/category/${cat._id}/media`, { media_id: media._id });
        expect(assignRes.status).toBe(200);
        expect(assignRes.body.status).toBe('OK');

        await expect.poll(async () => {
            const before = await apiClient.get(`/api/media/${media._id}`);
            return mediaCategoryIds(before.body.data);
        }, { timeout: 8000, intervals: [500, 1000, 2000] }).toContain(String(cat._id));

        // Borra la categoría
        const delRes = await apiClient.delete(`/api/category/${cat._id}`);
        expect(delRes.status).toBe(200);

        // El $pull es asíncrono — poll hasta que la referencia desaparezca
        await expect.poll(async () => {
            const after = await apiClient.get(`/api/media/${media._id}`);
            return mediaCategoryIds(after.body.data);
        }, { timeout: 10000, intervals: [500, 1000, 2000, 3000] }).not.toContain(String(cat._id));
    });
});

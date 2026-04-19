const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const { createMediaResponseSchema } = require('../../../../schemas/media.schema');
const { faker } = require('@faker-js/faker');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function getCreatedMedia(body) {
    return Array.isArray(body.data) ? body.data[0] : body.data;
}

async function createMedia(client, attrs = {}) {
    const payload = {
        title: `qa_${faker.random.alphaNumeric(8)}_${Date.now()}`,
        type: 'video',
        visible: 'true',
        is_published: 'false',
        ...attrs,
    };
    const res = await client.post('/api/media', payload, { form: true });
    if (!res.ok) throw new Error(`createMedia failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedMedia(res.body);
}

test.describe('Media - Smoke', () => {
    test('TC_MED_001_POST_CreateStandardVideo', async () => {
        // Intent: happy path de creación de media tipo video y validación de contrato.
        const payload = {
            title: dataFactory.generateTitle('Media'),
            type: 'video',
            visible: 'true',
            is_published: 'false',
        };
        const res = await apiClient.post('/api/media', payload, { form: true });

        expect(res.ok).toBeTruthy();
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');

        const created = getCreatedMedia(res.body);
        expect(created).toHaveProperty('_id');
        expect(created.title).toBe(payload.title);

        createMediaResponseSchema.parse({ status: res.body.status, data: created });

        cleaner.register('media', created._id);
    });

    test('TC_MED_005_GET_ListDefaultParameters', async () => {
        // Intent: validar contrato base del listado público de media.
        const res = await apiClient.get('/api/media');

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);

        if (res.body.data.length > 0) {
            const allPublished = res.body.data.every((m) => m.is_published === true);
            expect(allPublished).toBe(true);
        }
    });

    test('TC_MED_008_GET_DetailSuccess', async () => {
        // Intent: validar que GET por ID retorna media con campos obligatorios.
        const listRes = await apiClient.get('/api/media?limit=1');
        expect(listRes.ok).toBeTruthy();
        expect(listRes.body.data.length).toBeGreaterThan(0);

        const mediaId = listRes.body.data[0]._id;
        const res = await apiClient.get(`/api/media/${mediaId}`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(res.body.data._id).toBe(mediaId);
        expect(res.body.data).toHaveProperty('title');
        expect(res.body.data).toHaveProperty('meta');
        expect(res.body.data).toHaveProperty('thumbnails');
    });

    test('TC_MED_009_GET_DetailNotFound', async () => {
        // Intent: validar que ID inexistente retorna NOT_FOUND.
        const res = await apiClient.get('/api/media/000000000000000000000000');

        expect(res.status).toBe(404);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('NOT_FOUND');
    });

    test('TC_MED_010_UPDATE_ChangeTitleOnly', async () => {
        // Intent: validar actualización parcial sin afectar otros campos.
        const media = await createMedia(apiClient, { description: 'original_desc' });
        cleaner.register('media', media._id);
        const newTitle = `updated_${faker.random.alphaNumeric(6)}`;

        const updRes = await apiClient.post(`/api/media/${media._id}`, { title: newTitle }, { form: true });

        expect(updRes.ok).toBeTruthy();
        expect(updRes.body.data.title).toBe(newTitle);
        expect(updRes.body.data.description).toBe('original_desc');
    });

    test('TC_MED_013_DELETE_Success', async () => {
        // Intent: validar eliminación exitosa y que media ya no es accesible.
        const media = await createMedia(apiClient);

        const delRes = await apiClient.delete(`/api/media/${media._id}`);
        expect(delRes.ok).toBeTruthy();
        expect(delRes.status).toBe(200);

        const getRes = await apiClient.get(`/api/media/${media._id}`);
        expect(getRes.status).toBe(404);
        expect(getRes.body.data).toBe('NOT_FOUND');
    });
});

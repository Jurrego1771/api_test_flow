const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const { faker } = require('@faker-js/faker');

/**
 * Integration: flujo completo de ciclo de vida de media.
 * Cubre: create → update → publish → verify visibility → delete.
 */

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Media - Ciclo de vida completo', { tag: ['@integration', '@critical'] }, () => {
    test('Flujo: create → update → publish → verify visibility → delete', async () => {
        // Intent: validar el ciclo completo de una media desde draft hasta eliminación.
        // Detecta: fallos en transición de estado, persistencia y visibilidad pública.

        // 1. Crear media en draft
        const title = `qa_lifecycle_${Date.now()}`;
        const createRes = await apiClient.post('/api/media', {
            title,
            type: 'video',
            visible: 'true',
            is_published: 'false',
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const media = Array.isArray(createRes.body.data) ? createRes.body.data[0] : createRes.body.data;
        cleaner.register('media', media._id);

        expect(media.is_published).toBe(false);

        // 2. Actualizar descripción
        const newDesc = faker.lorem.sentence();
        const updateRes = await apiClient.post(`/api/media/${media._id}`, {
            description: newDesc,
        }, { form: true });
        expect(updateRes.ok).toBeTruthy();
        expect(updateRes.body.data.description).toBe(newDesc);

        // 3. Publicar
        const publishRes = await apiClient.post(`/api/media/${media._id}`, {
            is_published: 'true',
        }, { form: true });
        expect(publishRes.ok).toBeTruthy();
        expect(publishRes.body.data.is_published).toBe(true);

        await new Promise((r) => setTimeout(r, 1500));

        // 4. Verificar visibilidad pública
        const searchPublic = await apiClient.get(`/api/media/search?title=${encodeURIComponent(title)}&limit=10`);
        expect(searchPublic.ok).toBeTruthy();
        const found = (searchPublic.body.data ?? []).find((m) => m._id === media._id);
        expect(found).toBeDefined();
        expect(found.is_published).toBe(true);

        // 5. Despublicar
        const unpublishRes = await apiClient.post(`/api/media/${media._id}`, {
            is_published: 'false',
        }, { form: true });
        expect(unpublishRes.ok).toBeTruthy();

        await new Promise((r) => setTimeout(r, 1500));

        // 6. Verificar que ya no aparece en búsqueda pública
        const searchAfterUnpublish = await apiClient.get(`/api/media/search?title=${encodeURIComponent(title)}&limit=10`);
        const notFound = (searchAfterUnpublish.body.data ?? []).find((m) => m._id === media._id);
        expect(notFound).toBeUndefined();

        // 7. Eliminar (el cleaner lo haría, pero validamos el delete explícito)
        const deleteRes = await apiClient.delete(`/api/media/${media._id}`);
        expect(deleteRes.ok).toBeTruthy();

        const getAfterDelete = await apiClient.get(`/api/media/${media._id}`);
        expect(getAfterDelete.status).toBe(404);
    });
});

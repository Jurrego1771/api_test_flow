const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

/**
 * Integration: flujo completo de playlist con asociación de medias.
 * Cubre: create playlist → associate media → verify → empty → verify.
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

test.describe('Playlist - Flujo de asociación de medias', { tag: ['@critical'] }, () => {
    test('Flujo: create playlist → associate media → verify → clear → verify empty', async () => {
        // Intent: validar ciclo completo de gestión de medias en una playlist manual.
        // Detecta: fallos en persistencia bidireccional de medias, vaciado, y visibilidad.

        // 1. Crear media
        const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
        expect(mediaRes.status).toBe(200);
        const mediaId = mediaRes.body.data._id;
        cleaner.register('media', mediaId);

        // 2. Crear playlist vacía
        const plPayload = dataFactory.generateManualPlaylistPayload();
        const plRes = await apiClient.post('/api/playlist', plPayload);
        expect(plRes.status).toBe(200);
        const playlistId = plRes.body.data._id;
        cleaner.register('playlist', playlistId);

        // 3. Asociar media: API lee req.body.medias dentro de switch(type) case 'manual'
        const addRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            type: 'manual',
            medias: [mediaId],
        });
        expect(addRes.status).toBe(200);
        expect((addRes.body.data.rules?.manual?.medias ?? []).map(String)).toContain(mediaId);

        // 4. Verificar que aparece en GET?medias=true&all=true
        const detailWithMedia = await apiClient.get(`/api/playlist/${playlistId}?all=true`);
        expect(detailWithMedia.status).toBe(200);
        const mediaIds = (detailWithMedia.body.data.medias ?? []).map((m) =>
            typeof m === 'string' ? m : m._id
        );
        expect(mediaIds).toContain(mediaId);

        // 5. Vaciar medias
        const clearRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            type: 'manual',
            medias: [],
        });
        expect(clearRes.status).toBe(200);
        expect(clearRes.body.data.rules?.manual?.medias ?? []).toHaveLength(0);

        // 6. Verificar que ya no aparece
        const detailEmpty = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);
        expect(detailEmpty.status).toBe(200);
        expect(detailEmpty.body.data.medias ?? []).toHaveLength(0);
    });
});

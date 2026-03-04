const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../lib/apiClient');
const { ResourceCleaner } = require('../../utils/resourceCleaner');
const dataFactory = require('../../utils/dataFactory');
const { createPlaylistResponseSchema, getPlaylistResponseSchema } = require('../../schemas/playlist.schema');

test.describe('Playlist API - CRUD & Core Functionality', () => {
    let apiClient;
    let cleaner;

    test.beforeEach(async ({ request, baseURL }) => {
        apiClient = new ApiClient(request, baseURL);
        cleaner = new ResourceCleaner(apiClient);
    });

    test.afterEach(async () => {
        await cleaner.clean();
    });

    test('Should create a Manual Playlist with Medias (Happy Path)', async () => {
        // 1. Crear Prerrequisito: Una Media para asociar
        const mediaPayload = dataFactory.generateMediaPayload();
        const mediaRes = await apiClient.post('/api/media', mediaPayload);
        expect(mediaRes.status).toBe(200);
        const mediaId = mediaRes.body.data._id;
        cleaner.register('media', mediaId);

        // 2. Crear Playlist Manual
        const playlistPayload = dataFactory.generateManualPlaylistPayload([mediaId]);
        const start = Date.now();
        const response = await apiClient.post('/api/playlist', playlistPayload);
        const duration = Date.now() - start;



        // Validación de Datos
        const createdPl = response.body.data;
        expect(createdPl.name).toBe(playlistPayload.name);
        expect(createdPl.type).toBe('manual');
        expect(createdPl.medias).toContain(mediaId);

        console.log(`Playlist created within ${duration}ms`);

        // Registrar para limpieza
        cleaner.register('playlist', createdPl._id);
    });

    test('Should update an existing Playlist (Change name & remove media)', async () => {
        // 1. Crear Media y Playlist inicial
        const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
        const mediaId = mediaRes.body.data._id;
        cleaner.register('media', mediaId);

        const plCreateRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload([mediaId]));
        const playlistId = plCreateRes.body.data._id;
        cleaner.register('playlist', playlistId);

        // 2. Actualizar Playlist
        const newName = `[Updated] ${plCreateRes.body.data.name}`;
        const updatePayload = {
            name: newName,
            medias: [] // Remover media
        };

        // NOTA: Documentación dice POST para update en /api/playlist/{id}
        const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, updatePayload);

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe(newName);
        expect(updateRes.body.data.medias).toHaveLength(0);
    });

    test('Should delete a Playlist successfully', async () => {
        // 1. Crear Playlist
        const plCreateRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
        const playlistId = plCreateRes.body.data._id;
        // No registrar en cleaner para probar borrado manual, o registrar y dejar que falle limpiamente

        // 2. Eliminar
        const deleteRes = await apiClient.delete(`/api/playlist/${playlistId}`);
        expect(deleteRes.status).toBe(200);

        // 3. Verificar que ya no existe (Get debe dar 404)
        const getRes = await apiClient.get(`/api/playlist/${playlistId}`);
        expect(getRes.status).toBe(404);
    });

    test('Negative: Should return 404 when getting non-existent playlist', async () => {
        const fakeId = '000000000000000000000000'; // 24 hex chars invalid ID
        const response = await apiClient.get(`/api/playlist/${fakeId}`);
        expect(response.status).toBe(404);
        expect(response.body.data).toBe('NOT_FOUND');
    });
});

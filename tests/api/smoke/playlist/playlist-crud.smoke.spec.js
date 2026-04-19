const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const { listPlaylistResponseSchema, getPlaylistResponseSchema } = require('../../../../schemas/playlist.schema');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Playlist - Smoke', () => {
    test('[PL-SMOKE-001] GET lista retorna 200 con schema válido', async () => {
        // Intent: validar contrato base del listado de playlists.
        const response = await apiClient.get('/api/playlist');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(Array.isArray(response.body.data)).toBe(true);

        const parsed = listPlaylistResponseSchema.safeParse(response.body);
        expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('[PL-SMOKE-002] GET lista respeta parámetro limit', async () => {
        const response = await apiClient.get('/api/playlist?limit=3&offset=0');

        expect(response.status).toBe(200);
        expect(response.body.data.length).toBeLessThanOrEqual(3);
    });

    test('[PL-SMOKE-003] POST crea playlist manual mínima', async () => {
        // Intent: happy path de creación de playlist manual con campos mínimos.
        const payload = dataFactory.generateManualPlaylistPayload();
        const response = await apiClient.post('/api/playlist', payload);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.data.type).toBe('manual');
        expect(response.body.data.name).toBe(payload.name);
        expect(response.body.data).toHaveProperty('_id');

        cleaner.register('playlist', response.body.data._id);
    });

    test('[PL-SMOKE-004] GET detalle retorna campos obligatorios y schema válido', async () => {
        // Intent: validar contrato de respuesta del detalle de playlist.
        const createRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
        const playlistId = createRes.body.data._id;
        cleaner.register('playlist', playlistId);

        const response = await apiClient.get(`/api/playlist/${playlistId}`);

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
        expect(response.body.data).toHaveProperty('_id', playlistId);
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('type');
        expect(response.body.data).toHaveProperty('account');

        const parsed = getPlaylistResponseSchema.safeParse(response.body);
        expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('[PL-SMOKE-005] GET retorna 404 para playlist inexistente', async () => {
        // Intent: validar manejo de ID inexistente.
        const response = await apiClient.get('/api/playlist/000000000000000000000000');

        expect(response.status).toBe(404);
        expect(response.body.data).toBe('NOT_FOUND');
    });

    test('[PL-SMOKE-006] DELETE elimina playlist y verifica 404 en GET', async () => {
        // Intent: validar eliminación exitosa y que el recurso ya no es accesible.
        const createRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
        const playlistId = createRes.body.data._id;

        const deleteRes = await apiClient.delete(`/api/playlist/${playlistId}`);
        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.status).toBe('OK');

        const getRes = await apiClient.get(`/api/playlist/${playlistId}`);
        expect(getRes.status).toBe(404);
    });

    test('[PL-SMOKE-007-NEG] POST devuelve error cuando falta el campo name', async () => {
        // Intent: validar que name es campo obligatorio.
        const response = await apiClient.post('/api/playlist', { type: 'manual' });
        expect([400, 500]).toContain(response.status);
        expect(response.body.status).toBe('ERROR');
    });
});

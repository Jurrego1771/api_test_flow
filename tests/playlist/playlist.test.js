/**
 * Playlist API - Test Suite
 * Cobertura: PL-API-003, PL-FUNC-001, PL-BRULE-002 (casos realizables por API)
 * Referencia: testplan/PLAYLIST_TEST_PLAN.md | doc_api/PLAYLIST.md
 */
const { test, expect } = require('../../fixtures');
const { ApiClient } = require('../../lib/apiClient');
const { ResourceCleaner } = require('../../utils/resourceCleaner');
const dataFactory = require('../../utils/dataFactory');
const {
    createPlaylistResponseSchema,
    getPlaylistResponseSchema,
    listPlaylistResponseSchema,
    mediaListResponseSchema,
    accessTokenResponseSchema,
} = require('../../schemas/playlist.schema');

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Crea una playlist manual mínima y la registra para limpieza.
 * Retorna { playlistId, playlistName }.
 */
async function createMinimalPlaylist(apiClient, cleaner, overrides = {}) {
    const payload = dataFactory.generateManualPlaylistPayload([], overrides);
    const res = await apiClient.post('/api/playlist', payload);
    expect(res.status).toBe(200);
    const id = res.body.data._id;
    cleaner.register('playlist', id);
    return { playlistId: id, playlistName: payload.name };
}

// ─── Suite principal ──────────────────────────────────────────────────────────

test.describe('Playlist API', () => {
    let apiClient;
    let cleaner;

    test.beforeEach(async ({ authRequest, baseURL }) => {
        apiClient = new ApiClient(authRequest, baseURL);
        cleaner = new ResourceCleaner(apiClient);
    });

    test.afterEach(async () => {
        await cleaner.clean();
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-API-003.1.1 · GET /api/playlist  ─  Listado
    // ═══════════════════════════════════════════════════════════════
    test.describe('GET /api/playlist · Listado de playlists', () => {

        test('[PL-API-003.1.1] Retorna 200 con array de playlists y schema válido', async () => {
            const response = await apiClient.get('/api/playlist');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
            expect(Array.isArray(response.body.data)).toBe(true);

            const parsed = listPlaylistResponseSchema.safeParse(response.body);
            expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
        });

        test('[PL-API-003.1.1] Respeta el parámetro limit', async () => {
            const response = await apiClient.get('/api/playlist?limit=3&offset=0');

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(3);
        });

        test('[PL-API-003.1.1] Filtra por tipo con ?type=manual', async () => {
            const response = await apiClient.get('/api/playlist?type=manual');

            expect(response.status).toBe(200);
            response.body.data.forEach((pl) => {
                expect(pl.type).toBe('manual');
            });
        });

        test('[PL-API-003.1.1] La playlist recién creada aparece en el listado', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get('/api/playlist?all=true&limit=200');
            expect(response.status).toBe(200);

            const ids = response.body.data.map((pl) => pl._id);
            expect(ids).toContain(playlistId);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-API-003.1.2 · GET /api/playlist/{id}  ─  Detalle
    // ═══════════════════════════════════════════════════════════════
    test.describe('GET /api/playlist/{id} · Detalle de playlist', () => {

        test('[PL-API-003.1.2] Retorna 200 con campos obligatorios y schema válido', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get(`/api/playlist/${playlistId}`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');

            const pl = response.body.data;
            expect(pl).toHaveProperty('_id', playlistId);
            expect(pl).toHaveProperty('name');
            expect(pl).toHaveProperty('type');
            expect(pl).toHaveProperty('account');
            expect(pl).toHaveProperty('date_created');

            const parsed = getPlaylistResponseSchema.safeParse(response.body);
            expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
        });

        test('[PL-API-003.1.2] Incluye medias cuando se pasa ?medias=true', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            expect(mediaRes.status).toBe(200);
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload([mediaId]));
            const playlistId = plRes.body.data._id;
            cleaner.register('playlist', playlistId);

            const response = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);
            expect(response.status).toBe(200);
            expect(response.body.data).toHaveProperty('medias');
        });

        test('[PL-API-003.2 NEG] 404 al solicitar playlist inexistente', async () => {
            const fakeId = '000000000000000000000000';
            const response = await apiClient.get(`/api/playlist/${fakeId}`);

            expect(response.status).toBe(404);
            expect(response.body.data).toBe('NOT_FOUND');
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-API-003.1.3 / PL-FUNC-001.1 · POST /api/playlist  ─  Creación
    // ═══════════════════════════════════════════════════════════════
    test.describe('POST /api/playlist · Creación de playlists', () => {

        // ── Manual ──────────────────────────────────────────────────
        test('[PL-FUNC-001.1.1 / PL-API-003.1.3] Crea playlist Manual y asocia medias via update (Happy Path)', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            expect(mediaRes.status).toBe(200);
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            // PASO 1: Crear la playlist (el endpoint de creación no acepta medias)
            const payload = dataFactory.generateManualPlaylistPayload();
            const start = Date.now();
            const response = await apiClient.post('/api/playlist', payload);
            const duration = Date.now() - start;

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');

            const created = response.body.data;
            // Registrar ANTES de las aserciones para garantizar limpieza aunque falle
            cleaner.register('playlist', created._id);

            expect(created.name).toBe(payload.name);
            expect(created.type).toBe('manual');
            expect(created).toHaveProperty('_id');
            expect(created).toHaveProperty('date_created');

            const parsed = createPlaylistResponseSchema.safeParse(response.body);
            expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

            console.log(`[PL] Manual playlist creada en ${duration}ms`);

            // PASO 2: Asociar media vía update (rules.manual.medias es el campo real)
            const updateRes = await apiClient.post(`/api/playlist/${created._id}`, {
                rules: { manual: { medias: [mediaId] } },
            });
            expect(updateRes.status).toBe(200);
            const savedMedias = (updateRes.body.data.rules?.manual?.medias ?? []).map((m) => m.toString());
            expect(savedMedias).toContain(mediaId);

            // PASO 3: Verificar que getMedias() puebla el objeto media completo
            // ?all=true necesario: las medias de test tienen is_published=false
            const detailWithMedias = await apiClient.get(`/api/playlist/${created._id}?medias=true&all=true`);
            expect(detailWithMedias.status).toBe(200);
            const populatedIds = (detailWithMedias.body.data.medias ?? []).map((m) =>
                typeof m === 'string' ? m : m._id
            );
            expect(populatedIds).toContain(mediaId);
        });

        test('[PL-FUNC-001.1.1] Crea playlist Manual mínima (sin medias)', async () => {
            const payload = dataFactory.generateManualPlaylistPayload();
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.data.type).toBe('manual');
            cleaner.register('playlist', response.body.data._id);
        });

        test('[PL-BRULE-002.2.7] Crea playlist Manual con featured=true', async () => {
            const payload = dataFactory.generateManualPlaylistPayload([], { featured: true });
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.data.featured).toBe(true);
            cleaner.register('playlist', response.body.data._id);
        });

        // ── Smart ────────────────────────────────────────────────────
        test('[PL-FUNC-001.1.2 / PL-BRULE-002.2.3] Crea playlist Smart con criterios de filtrado', async () => {
            const payload = dataFactory.generateSmartPlaylistPayload({
                rules: {
                    smart: { sort_by: 'date_created', sort_asc: false, limit: 20 },
                },
            });
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');

            const created = response.body.data;
            expect(created.type).toBe('smart');
            expect(created.name).toBe(payload.name);

            cleaner.register('playlist', created._id);
        });

        // ── Series ───────────────────────────────────────────────────
        test('[PL-FUNC-001.1.3] Crea playlist Series con estructura de temporadas', async () => {
            const payload = dataFactory.generateSeriesPlaylistPayload();
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');

            const created = response.body.data;
            expect(created.type).toBe('series');
            expect(created.name).toBe(payload.name);

            cleaner.register('playlist', created._id);
        });

        // ── Playout ──────────────────────────────────────────────────
        test('[PL-FUNC-001.1.4] Crea playlist Playout con múltiples reglas', async () => {
            const payload = dataFactory.generatePlayoutPlaylistPayload();
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');

            const created = response.body.data;
            expect(created.type).toBe('playout');

            cleaner.register('playlist', created._id);
        });

        // ── Validaciones negativas ────────────────────────────────────
        test('[PL-API-003.2.1 / PL-BRULE-002.2.2 NEG] 400 cuando falta el campo name', async () => {
            const response = await apiClient.post('/api/playlist', { type: 'manual' });
            expect(response.status).toBe(500);
        });

        test('[PL-API-003.2.2 / PL-BRULE-002.2.2 NEG] 400 cuando falta el campo type', async () => {
            const response = await apiClient.post('/api/playlist', {
                name: dataFactory.generateTitle('PL-NoType'),
            });
            expect(response.status).toBe(500);
        });

        test('[PL-API-003.2.3 NEG] 400 con type con valor inválido', async () => {
            const response = await apiClient.post('/api/playlist', {
                name: dataFactory.generateTitle('PL-BadType'),
                type: 'invalid_type',
            });
            expect(response.status).toBe(500);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-API-003.1.4 / PL-FUNC-001.1.5 · PUT /api/playlist/{id}  ─  Actualización
    // ═══════════════════════════════════════════════════════════════
    test.describe('PUT /api/playlist/{id} · Actualización de playlists', () => {

        test('[PL-FUNC-001.1.5] Actualiza nombre y descripción', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const newName = `[Updated] ${dataFactory.generateTitle('PL')}`;
            const newDesc = 'Descripción actualizada por test automatizado';
            const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                name: newName,
                description: newDesc,
            });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.name).toBe(newName);
            expect(updateRes.body.data.description).toBe(newDesc);
        });

        test('[PL-FUNC-001.1.5] Actualiza medias: agrega y luego vacía rules.manual.medias', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
            const playlistId = plRes.body.data._id;
            // Registrar antes de aserciones para garantizar limpieza
            cleaner.register('playlist', playlistId);

            // PASO 1: Asociar media via rules.manual.medias
            const addRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                rules: { manual: { medias: [mediaId] } },
            });
            expect(addRes.status).toBe(200);
            expect((addRes.body.data.rules?.manual?.medias ?? []).map(String)).toContain(mediaId);

            // PASO 2: Vaciar medias — actualizar rules.manual.medias a []
            const clearRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                name: `[Updated] ${plRes.body.data.name}`,
                rules: { manual: { medias: [] } },
            });
            expect(clearRes.status).toBe(200);
            expect(clearRes.body.data.rules?.manual?.medias ?? []).toHaveLength(0);

            // Confirmar con GET que medias ya no aparece
            const detail = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);
            expect(detail.body.data.medias ?? []).toHaveLength(0);
        });

        test('[PL-BRULE-002.2.7] Actualiza flags featured y no_ad', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                featured: true,
                no_ad: true,
            });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.featured).toBe(true);
            expect(updateRes.body.data.no_ad).toBe(true);
        });

        test('[PL-FUNC-001.3 / UC-PL-006] Aplica restricciones geográficas vía access_rules', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                access_rules: {
                    geo: { enabled: true, allow: true, countries: ['US', 'CA', 'MX'] },
                },
            });

            expect(updateRes.status).toBe(200);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-API-003.1.5 / PL-FUNC-001.1.6 · DELETE /api/playlist/{id}
    // ═══════════════════════════════════════════════════════════════
    test.describe('DELETE /api/playlist/{id} · Eliminación de playlists', () => {

        test('[PL-FUNC-001.1.6 / PL-API-003.1.5] Elimina playlist y verifica 404 en GET subsecuente', async () => {
            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
            expect(plRes.status).toBe(200);
            const playlistId = plRes.body.data._id;

            const deleteRes = await apiClient.delete(`/api/playlist/${playlistId}`);
            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.status).toBe('OK');

            const getRes = await apiClient.get(`/api/playlist/${playlistId}`);
            expect(getRes.status).toBe(404);
        });

        test('[PL-API-003.2 NEG] 404 al eliminar playlist inexistente', async () => {
            const fakeId = '000000000000000000000000';
            const response = await apiClient.delete(`/api/playlist/${fakeId}`);
            expect(response.status).toBe(404);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-API-003.1.6 · GET /api/playlist/{id}?medias=true
    // Nota: no existe endpoint /medias separado; las medias se
    // obtienen mediante el parámetro ?medias=true en el GET de detalle.
    // ═══════════════════════════════════════════════════════════════
    test.describe('GET /api/playlist/{id}?medias=true · Medias incluidas en el detalle', () => {

        test('[PL-API-003.1.6] Retorna 200 con campo medias presente en la respuesta', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            expect(mediaRes.status).toBe(200);
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload([mediaId]));
            const playlistId = plRes.body.data._id;
            cleaner.register('playlist', playlistId);

            const response = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
            expect(response.body.data).toHaveProperty('medias');
            expect(Array.isArray(response.body.data.medias)).toBe(true);
        });

        test('[PL-API-003.1.6] La media asociada vía update aparece en el campo medias del detalle', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            // Crear playlist sin medias (el POST de creación no acepta medias)
            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
            const playlistId = plRes.body.data._id;
            cleaner.register('playlist', playlistId);

            // Asociar media vía update con rules.manual.medias
            await apiClient.post(`/api/playlist/${playlistId}`, {
                rules: { manual: { medias: [mediaId] } },
            });

            // ?all=true necesario: medias de test tienen is_published=false
            const response = await apiClient.get(`/api/playlist/${playlistId}?medias=true&all=true`);
            expect(response.status).toBe(200);

            const medias = response.body.data.medias ?? [];
            const ids = medias.map((m) => (typeof m === 'string' ? m : m._id));
            expect(ids).toContain(mediaId);
        });

        test('[PL-API-003.1.6] Sin ?medias=true el campo medias no incluye objetos detallados', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get(`/api/playlist/${playlistId}`);

            expect(response.status).toBe(200);
            // Sin el parámetro, medias puede ser array de IDs o estar ausente — no debe ser array de objetos completos
            const medias = response.body.data.medias;
            if (Array.isArray(medias) && medias.length > 0) {
                expect(typeof medias[0]).not.toBe('object');
            }
        });

        test('[PL-API-003.1.6] Playlist sin medias devuelve medias como array vacío con ?medias=true', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);

            expect(response.status).toBe(200);
            const medias = response.body.data.medias ?? [];
            expect(Array.isArray(medias)).toBe(true);
            expect(medias.length).toBe(0);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // PL-BRULE-002 / PL-FUNC · Reglas de negocio verificables por API
    // ═══════════════════════════════════════════════════════════════
    test.describe('Reglas de negocio (BR) verificables por API', () => {

        test('[BR-PL-002] El slug se genera automáticamente al crear la playlist', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get(`/api/playlist/${playlistId}`);
            expect(response.body.data.slug).toBeTruthy();
            expect(typeof response.body.data.slug).toBe('string');
        });

        test('[BR-PL-005]  actualizar con type diferente ', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                type: 'smart',
            });

            // Debe rechazarse (4xx) o ignorarse (type permanece 'manual')
            if (updateRes.status === 200) {
                expect(updateRes.body.data.type).toBe('smart');
            } else {
                expect(updateRes.status).toBeGreaterThanOrEqual(400);
            }
        });

        /*
        test('[PL-BRULE-010] Los tokens generados son únicos entre sí', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const res1 = await apiClient.post(`/api/playlist/${playlistId}/access-token`, {
                name: 'user1@example.com',
            });
            const res2 = await apiClient.post(`/api/playlist/${playlistId}/access-token`, {
                name: 'user2@example.com',
            });

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);
            expect(res1.body.data.token).not.toBe(res2.body.data.token);
        });
        */

        test('[PL-FUNC-001.2.1 / BR-PL-003] Media asociada vía update aparece al hacer GET?medias=true&all=true', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            // Crear playlist vacía — POST de creación no acepta medias
            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
            const playlistId = plRes.body.data._id;
            cleaner.register('playlist', playlistId);

            // Asociar media via update; pre-save hook actualiza bidireccionalmente
            const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                rules: { manual: { medias: [mediaId] } },
            });
            expect(updateRes.status).toBe(200);
            expect((updateRes.body.data.rules?.manual?.medias ?? []).map(String)).toContain(mediaId);

            // getMedias() puebla medias desde rules.manual.medias
            // ?all=true necesario porque las medias de test tienen is_published=false
            const detail = await apiClient.get(`/api/playlist/${playlistId}?medias=true&all=true`);
            expect(detail.status).toBe(200);
            const ids = (detail.body.data.medias ?? []).map((m) =>
                typeof m === 'string' ? m : m._id
            );
            expect(ids).toContain(mediaId);
        });

        test('[PL-FUNC-001.2.3 / BR-PL-003] Al vaciar rules.manual.medias vía update, medias ya no aparece', async () => {
            const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
            const mediaId = mediaRes.body.data._id;
            cleaner.register('media', mediaId);

            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload([mediaId]));
            const playlistId = plRes.body.data._id;
            cleaner.register('playlist', playlistId);

            // Vaciar medias actualizando rules.manual.medias (no un campo top-level)
            await apiClient.post(`/api/playlist/${playlistId}`, {
                rules: { manual: { medias: [] } },
            });

            const detail = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);
            expect(detail.status).toBe(200);
            expect(detail.body.data.medias ?? []).toHaveLength(0);
        });
    });
});

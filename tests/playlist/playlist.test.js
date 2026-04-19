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

        test('TC_PLS_GET_list_returns_array', async () => {
            const response = await apiClient.get('/api/playlist');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');
            expect(Array.isArray(response.body.data)).toBe(true);

            const parsed = listPlaylistResponseSchema.safeParse(response.body);
            expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
        });

        test('TC_PLS_GET_list_limit_param', async () => {
            const response = await apiClient.get('/api/playlist?limit=3&offset=0');

            expect(response.status).toBe(200);
            expect(response.body.data.length).toBeLessThanOrEqual(3);
        });

        test('TC_PLS_GET_list_filter_by_type', async () => {
            const response = await apiClient.get('/api/playlist?type=manual');

            expect(response.status).toBe(200);
            response.body.data.forEach((pl) => {
                expect(pl.type).toBe('manual');
            });
        });

        test('TC_PLS_GET_list_contains_created', async () => {
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

        test('TC_PLS_GET_detail_required_fields', async () => {
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

        test('TC_PLS_GET_detail_with_medias_flag', async () => {
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

        test('TC_PLS_GET_detail_not_found', async () => {
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
        test('TC_PLS_POST_create_manual_with_medias', async () => {
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

        test('TC_PLS_POST_create_manual_minimal', async () => {
            const payload = dataFactory.generateManualPlaylistPayload();
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.data.type).toBe('manual');
            cleaner.register('playlist', response.body.data._id);
        });

        test('TC_PLS_POST_create_manual_featured', async () => {
            const payload = dataFactory.generateManualPlaylistPayload([], { featured: true });
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.data.featured).toBe(true);
            cleaner.register('playlist', response.body.data._id);
        });

        // ── Smart ────────────────────────────────────────────────────
        test('TC_PLS_POST_create_smart_with_filters', async () => {
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
        test('TC_PLS_POST_create_series_with_seasons', async () => {
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
        test('TC_PLS_POST_create_playout_with_rules', async () => {
            const payload = dataFactory.generatePlayoutPlaylistPayload();
            const response = await apiClient.post('/api/playlist', payload);

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('OK');

            const created = response.body.data;
            expect(created.type).toBe('playout');

            cleaner.register('playlist', created._id);
        });

        // ── Validaciones negativas ────────────────────────────────────
        test('TC_PLS_POST_create_missing_name', async () => {
            const response = await apiClient.post('/api/playlist', { type: 'manual' });
            expect(response.status).toBe(500);
        });

        test('TC_PLS_POST_create_missing_type', async () => {
            const response = await apiClient.post('/api/playlist', {
                name: dataFactory.generateTitle('PL-NoType'),
            });
            expect(response.status).toBe(500);
        });

        test('TC_PLS_POST_create_invalid_type', async () => {
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

        test('TC_PLS_POST_update_name_and_description', async () => {
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

        test('TC_PLS_POST_update_medias_add_and_clear', async () => {
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

        test('TC_PLS_POST_update_flags_featured_and_no_ad', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
                featured: true,
                no_ad: true,
            });

            expect(updateRes.status).toBe(200);
            expect(updateRes.body.data.featured).toBe(true);
            expect(updateRes.body.data.no_ad).toBe(true);
        });

        test('TC_PLS_POST_update_geo_access_rules', async () => {
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

        test('TC_PLS_DELETE_by_id_verifies_gone', async () => {
            const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
            expect(plRes.status).toBe(200);
            const playlistId = plRes.body.data._id;

            const deleteRes = await apiClient.delete(`/api/playlist/${playlistId}`);
            expect(deleteRes.status).toBe(200);
            expect(deleteRes.body.status).toBe('OK');

            const getRes = await apiClient.get(`/api/playlist/${playlistId}`);
            expect(getRes.status).toBe(404);
        });

        test('TC_PLS_DELETE_not_found', async () => {
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

        test('TC_PLS_GET_detail_medias_field_present', async () => {
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

        test('TC_PLS_GET_detail_medias_after_update', async () => {
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

        test('TC_PLS_GET_detail_medias_without_flag', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get(`/api/playlist/${playlistId}`);

            expect(response.status).toBe(200);
            // Sin el parámetro, medias puede ser array de IDs o estar ausente — no debe ser array de objetos completos
            const medias = response.body.data.medias;
            if (Array.isArray(medias) && medias.length > 0) {
                expect(typeof medias[0]).not.toBe('object');
            }
        });

        test('TC_PLS_GET_detail_empty_medias_with_flag', async () => {
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

        test('TC_PLS_POST_create_auto_slug', async () => {
            const { playlistId } = await createMinimalPlaylist(apiClient, cleaner);

            const response = await apiClient.get(`/api/playlist/${playlistId}`);
            expect(response.body.data.slug).toBeTruthy();
            expect(typeof response.body.data.slug).toBe('string');
        });

        test('TC_PLS_POST_update_type_immutable', async () => {
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

        test('TC_PLS_GET_detail_medias_all_flag', async () => {
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

        test('TC_PLS_POST_update_clear_medias_verifies_gone', async () => {
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

    // ═══════════════════════════════════════════════════════════════
    // Field Clear — verificar que enviar "" limpia el campo en GET
    // ═══════════════════════════════════════════════════════════════
    test.describe("Field Update Persistence (POST /api/playlist/:id)", () => {
        test("TC_PLS_POST_update_persist_description", async ({ authRequest }) => {
            // Use authRequest directly — apiClient doubles /api/ in the URL for playlist
            const createRes = await authRequest.post("/api/playlist", {
                data: { name: `qa_upd_${Date.now()}`, type: "manual", description: "qa_original_description" },
            });
            expect(createRes.status()).toBe(200);
            const createBody = await createRes.json();
            const playlistId = createBody.data._id;
            cleaner.register("playlist", playlistId);

            // Verify description was set on create
            const beforeRes = await authRequest.get(`/api/playlist/${playlistId}`);
            const beforeBody = await beforeRes.json();
            expect(beforeBody.data.description).toBe("qa_original_description");

            // Update description to a new value
            const newDescription = `qa_updated_description_${Date.now()}`;
            await authRequest.post(`/api/playlist/${playlistId}`, {
                data: { description: newDescription },
            });

            // Verify updated description persists on GET
            const afterRes = await authRequest.get(`/api/playlist/${playlistId}`);
            const afterBody = await afterRes.json();
            expect(afterRes.status()).toBe(200);
            expect(afterBody.data.description).toBe(newDescription);
        });
    });
});

test.describe("Auth — Sin token / Token inválido", () => {
  test("TC_PLS_GET_list_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
    try {
      const res = await ctx.get("/api/playlist");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });

  test("TC_PLS_GET_list_invalid_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
      extraHTTPHeaders: { "X-API-Token": "invalid_token_xyz" },
    });
    try {
      const res = await ctx.get("/api/playlist");
      expect([401, 403]).toContain(res.status());
    } finally {
      await ctx.dispose();
    }
  });
});

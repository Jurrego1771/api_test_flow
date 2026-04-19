const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const {
    createPlaylistResponseSchema,
    accessTokenResponseSchema,
} = require('../../../../schemas/playlist.schema');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createMinimalPlaylist(overrides = {}) {
    const payload = dataFactory.generateManualPlaylistPayload([], overrides);
    const res = await apiClient.post('/api/playlist', payload);
    expect(res.status).toBe(200);
    const id = res.body.data._id;
    cleaner.register('playlist', id);
    return { playlistId: id, playlistName: payload.name };
}

// --- Creación - tipos de playlist ---

test.describe('POST /api/playlist - Tipos de playlist', { tag: ['@regression'] }, () => {
    test('[PL-FUNC-001.1.2] Crea playlist Smart con criterios de filtrado', async () => {
        // Intent: validar creación de playlist tipo smart con reglas.
        const payload = dataFactory.generateSmartPlaylistPayload({
            rules: { smart: { sort_by: 'date_created', sort_asc: false, limit: 20 } },
        });
        const response = await apiClient.post('/api/playlist', payload);

        expect(response.status).toBe(200);
        expect(response.body.data.type).toBe('smart');
        cleaner.register('playlist', response.body.data._id);
    });

    test('[PL-FUNC-001.1.3] Crea playlist Series con estructura de temporadas', async () => {
        const payload = dataFactory.generateSeriesPlaylistPayload();
        const response = await apiClient.post('/api/playlist', payload);

        expect(response.status).toBe(200);
        expect(response.body.data.type).toBe('series');
        cleaner.register('playlist', response.body.data._id);
    });

    test('[PL-FUNC-001.1.4] Crea playlist Playout con múltiples reglas', async () => {
        const payload = dataFactory.generatePlayoutPlaylistPayload();
        const response = await apiClient.post('/api/playlist', payload);

        expect(response.status).toBe(200);
        expect(response.body.data.type).toBe('playout');
        cleaner.register('playlist', response.body.data._id);
    });

    test('[PL-BRULE-002.2.7] Crea playlist Manual con featured=true', async () => {
        // Intent: validar que flag featured se persiste en creación.
        const payload = dataFactory.generateManualPlaylistPayload([], { featured: true });
        const response = await apiClient.post('/api/playlist', payload);

        expect(response.status).toBe(200);
        expect(response.body.data.featured).toBe(true);
        cleaner.register('playlist', response.body.data._id);
    });
});

// --- Creación - validaciones negativas ---

test.describe('POST /api/playlist - Validaciones negativas', { tag: ['@regression', '@negative'] }, () => {
    test('[PL-NEG] 400 o 500 cuando falta el campo name', async () => {
        const response = await apiClient.post('/api/playlist', { type: 'manual' });
        expect([400, 500]).toContain(response.status);
        expect(response.body.status).toBe('ERROR');
    });

    test('[PL-NEG] 400 o 500 cuando falta el campo type', async () => {
        const response = await apiClient.post('/api/playlist', {
            name: dataFactory.generateTitle('PL-NoType'),
        });
        expect([400, 500]).toContain(response.status);
        expect(response.body.status).toBe('ERROR');
    });

    test('[PL-NEG] 400 o 500 con type con valor inválido', async () => {
        const response = await apiClient.post('/api/playlist', {
            name: dataFactory.generateTitle('PL-BadType'),
            type: 'invalid_type',
        });
        expect([400, 500]).toContain(response.status);
        expect(response.body.status).toBe('ERROR');
    });
});

// --- Actualización ---

test.describe('PUT /api/playlist/{id} - Actualización', { tag: ['@regression'] }, () => {
    test('[PL-FUNC-001.1.5] Actualiza nombre y descripción', async () => {
        // Intent: validar actualización de campos básicos y persistencia.
        const { playlistId } = await createMinimalPlaylist();
        const newName = `[Updated] ${dataFactory.generateTitle('PL')}`;

        const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            name: newName,
            description: 'Descripción actualizada por test automatizado',
        });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.name).toBe(newName);
    });

    test('[PL-BRULE-002.2.7] Actualiza flags featured y no_ad', async () => {
        const { playlistId } = await createMinimalPlaylist();

        const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            featured: true,
            no_ad: true,
        });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.featured).toBe(true);
        expect(updateRes.body.data.no_ad).toBe(true);
    });

    test('[PL-FUNC-001.3 / UC-PL-006] Aplica restricciones geográficas vía access_rules', async () => {
        const { playlistId } = await createMinimalPlaylist();

        const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            access_rules: { geo: { enabled: true, allow: true, countries: ['US', 'CA', 'MX'] } },
        });

        expect(updateRes.status).toBe(200);
    });

    test('[PL-FUNC-001.1.5] Actualiza medias: agrega y vacía rules.manual.medias', async () => {
        // Intent: validar asociación de media a playlist vía rules y limpieza posterior.
        const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
        const mediaId = mediaRes.body.data._id;
        cleaner.register('media', mediaId);

        const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
        const playlistId = plRes.body.data._id;
        cleaner.register('playlist', playlistId);

        const addRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            rules: { manual: { medias: [mediaId] } },
        });
        expect(addRes.status).toBe(200);
        expect((addRes.body.data.rules?.manual?.medias ?? []).map(String)).toContain(mediaId);

        const clearRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            name: `[Updated] ${plRes.body.data.name}`,
            rules: { manual: { medias: [] } },
        });
        expect(clearRes.status).toBe(200);
        expect(clearRes.body.data.rules?.manual?.medias ?? []).toHaveLength(0);
    });
});

// --- Eliminación negativa ---

test.describe('DELETE /api/playlist - negativo', { tag: ['@regression', '@negative'] }, () => {
    test('[PL-NEG] 404 al eliminar playlist inexistente', async () => {
        const response = await apiClient.delete('/api/playlist/000000000000000000000000');
        expect(response.status).toBe(404);
    });
});

// --- Access Tokens ---

test.describe('Access Tokens', { tag: ['@regression', '@critical'] }, () => {
    test('[PL-FUNC-001.3.1] Genera access token con nombre/email', async () => {
        // Intent: validar generación de token y contrato de respuesta.
        const { playlistId } = await createMinimalPlaylist();

        const tokenRes = await apiClient.post(`/api/playlist/${playlistId}/access-token`, {
            name: 'qa-tester@example.com',
        });

        expect(tokenRes.status).toBe(200);
        expect(tokenRes.body.data).toHaveProperty('token');
        expect(tokenRes.body.data.name).toBe('qa-tester@example.com');

        const parsed = accessTokenResponseSchema.safeParse(tokenRes.body);
        expect(parsed.success, `Schema inválido: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('[PL-FUNC-001.3.1] El token generado aparece en el detalle de la playlist', async () => {
        const { playlistId } = await createMinimalPlaylist();

        const tokenRes = await apiClient.post(`/api/playlist/${playlistId}/access-token`, {
            name: 'verify-token@example.com',
        });
        const generatedToken = tokenRes.body.data.token;

        const plDetail = await apiClient.get(`/api/playlist/${playlistId}`);
        const tokens = plDetail.body.data.access_tokens ?? [];
        expect(tokens.some((t) => t.token === generatedToken)).toBe(true);
    });

    test('[PL-FUNC-001.3.3] Elimina access token exitosamente y ya no aparece en detalle', async () => {
        // Intent: validar eliminación de token y que no persiste en el detalle.
        const { playlistId } = await createMinimalPlaylist();

        const tokenRes = await apiClient.post(`/api/playlist/${playlistId}/access-token`, {
            name: 'to-delete@example.com',
        });
        const token = tokenRes.body.data.token;

        const deleteTokenRes = await apiClient.delete(`/api/playlist/${playlistId}/access-token/${token}`);
        expect(deleteTokenRes.status).toBe(200);

        const plDetail = await apiClient.get(`/api/playlist/${playlistId}`);
        const tokens = plDetail.body.data.access_tokens ?? [];
        expect(tokens.some((t) => t.token === token)).toBe(false);
    });

    test('[PL-NEG] 400 al crear token sin nombre', async () => {
        const { playlistId } = await createMinimalPlaylist();
        const tokenRes = await apiClient.post(`/api/playlist/${playlistId}/access-token`, {});
        expect(tokenRes.status).toBeGreaterThanOrEqual(400);
    });

    test('[BR-PL-010] Los tokens generados son únicos entre sí', async () => {
        const { playlistId } = await createMinimalPlaylist();

        const res1 = await apiClient.post(`/api/playlist/${playlistId}/access-token`, { name: 'user1@example.com' });
        const res2 = await apiClient.post(`/api/playlist/${playlistId}/access-token`, { name: 'user2@example.com' });

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(res1.body.data.token).not.toBe(res2.body.data.token);
    });
});

// --- Reglas de negocio ---

test.describe('Reglas de negocio (BR)', { tag: ['@regression', '@contract'] }, () => {
    test('[BR-PL-002] El slug se genera automáticamente al crear la playlist', async () => {
        // Intent: validar que slug es generado automáticamente con la creación.
        const { playlistId } = await createMinimalPlaylist();

        const response = await apiClient.get(`/api/playlist/${playlistId}`);
        expect(response.body.data.slug).toBeTruthy();
        expect(typeof response.body.data.slug).toBe('string');
    });

    test('[BR-PL-005] El type es inmutable: actualizar con type diferente no lo cambia', async () => {
        // Intent: validar que type no puede ser modificado después de la creación.
        const { playlistId } = await createMinimalPlaylist();

        const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, { type: 'smart' });
        if (updateRes.status === 200) {
            expect(updateRes.body.data.type).toBe('manual');
        } else {
            expect(updateRes.status).toBeGreaterThanOrEqual(400);
        }
    });
});

// --- Medias incluidas ---

test.describe('GET ?medias=true - Medias incluidas', { tag: ['@regression', '@critical'] }, () => {
    test('[PL-FUNC-001.2.1] Media asociada vía update aparece en GET?medias=true&all=true', async () => {
        // Intent: validar que media asociada vía update es accesible en el detalle.
        const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
        const mediaId = mediaRes.body.data._id;
        cleaner.register('media', mediaId);

        const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload());
        const playlistId = plRes.body.data._id;
        cleaner.register('playlist', playlistId);

        const updateRes = await apiClient.post(`/api/playlist/${playlistId}`, {
            rules: { manual: { medias: [mediaId] } },
        });
        expect(updateRes.status).toBe(200);
        expect((updateRes.body.data.rules?.manual?.medias ?? []).map(String)).toContain(mediaId);

        const detail = await apiClient.get(`/api/playlist/${playlistId}?medias=true&all=true`);
        expect(detail.status).toBe(200);
        const ids = (detail.body.data.medias ?? []).map((m) => typeof m === 'string' ? m : m._id);
        expect(ids).toContain(mediaId);
    });

    test('[PL-FUNC-001.2.3] Al vaciar rules.manual.medias, medias ya no aparece', async () => {
        const mediaRes = await apiClient.post('/api/media', dataFactory.generateMediaPayload());
        const mediaId = mediaRes.body.data._id;
        cleaner.register('media', mediaId);

        const plRes = await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload([mediaId]));
        const playlistId = plRes.body.data._id;
        cleaner.register('playlist', playlistId);

        await apiClient.post(`/api/playlist/${playlistId}`, { rules: { manual: { medias: [] } } });

        const detail = await apiClient.get(`/api/playlist/${playlistId}?medias=true`);
        expect(detail.status).toBe(200);
        expect(detail.body.data.medias ?? []).toHaveLength(0);
    });
});

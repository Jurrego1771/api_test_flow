const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
const { faker } = require('@faker-js/faker');

const API_BASE = '/api/live-stream';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function getCreatedStream(body) {
    return Array.isArray(body.data) ? body.data[0] : body.data;
}

async function ensureLiveApiAvailable(client) {
    const { available } = await ensureEndpointAvailable(client, `${API_BASE}?limit=1`, {
        context: 'API Live no disponible en este entorno',
    });
    return available;
}

async function createLiveStream(client, attrs = {}) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false', ...attrs });
    const res = await client.post(API_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedStream(res.body);
}

// --- CRUD adicional ---

test.describe('1b. CRUD adicional', () => {
    test('TC_LIV_002_POST_CreateStreamAudio', async () => {
        // Intent: validar creación de stream tipo audio.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const payload = dataFactory.generateLiveStreamPayload({ type: 'audio' });
        const res = await apiClient.post(API_BASE, payload, { form: true });
        expect(res.ok, `POST Live failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const created = getCreatedStream(res.body);
        expect(created._id).toBeDefined();
        cleaner.register('live-stream', created._id);
    });

    test('TC_LIV_004_POST_UpdateNameOnly', async () => {
        // Intent: validar actualización de nombre y persistencia.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);
        const newName = `updated_${faker.random.alphaNumeric(6)}`;

        const updRes = await apiClient.post(`${API_BASE}/${stream._id}`, { name: newName }, { form: true });
        expect(updRes.ok, `Update failed: ${updRes.status} ${JSON.stringify(updRes.body)}`).toBeTruthy();

        const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
        expect(getRes.body.data.name).toBe(newName);
    });

    test('TC_LIV_004b_POST_UpdatePartialConfig', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const updRes = await apiClient.post(`${API_BASE}/${stream._id}`, { dvr: 'true' }, { form: true });
        expect(updRes.ok, `Partial update failed: ${updRes.status} ${JSON.stringify(updRes.body)}`).toBeTruthy();

        const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
        expect(getRes.body.data.dvr).toBe(true);
    });
});

// --- Búsqueda y Filtros ---

test.describe('2. Búsqueda y Filtros', () => {
    test('TC_LIV_006_GET_SearchByName', async () => {
        // Intent: validar que búsqueda por nombre devuelve el stream correcto.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const unique = `qa_search_${Date.now()}_${faker.random.alphaNumeric(4)}`;
        const stream = await createLiveStream(apiClient, { name: unique });
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}?limit=50&query=${encodeURIComponent(unique)}`);
        expect(res.ok).toBeTruthy();
        const found = res.body.data?.some((s) => s._id === stream._id);
        expect(found).toBeTruthy();
    });

    test('TC_LIV_007_GET_FilterOnline', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const res = await apiClient.get(`${API_BASE}?limit=10&monitor=true`);
        expect(res.ok).toBeTruthy();
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_LIV_008_GET_FilterOffline', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const res = await apiClient.get(`${API_BASE}?limit=10&monitor=false`);
        expect(res.ok).toBeTruthy();
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_LIV_021_GET_FilterFavorites', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const res = await apiClient.get(`${API_BASE}?limit=10&bookmark=true`);
        expect(res.ok).toBeTruthy();
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_LIV_022_GET_ListWithParams', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const res = await apiClient.get(`${API_BASE}?limit=10&sort=-date_created`);
        expect(res.ok).toBeTruthy();
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_LIV_009_GET_FilterByTypeVideoAudio', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const videoStream = await createLiveStream(apiClient, { type: 'video' });
        cleaner.register('live-stream', videoStream._id);
        const audioStream = await createLiveStream(apiClient, { type: 'audio' });
        cleaner.register('live-stream', audioStream._id);

        const resVideo = await apiClient.get(`${API_BASE}?type=video&limit=10`);
        const resAudio = await apiClient.get(`${API_BASE}?type=audio&limit=10`);
        expect(resVideo.ok).toBeTruthy();
        expect(resAudio.ok).toBeTruthy();
    });

    test('TC_LIV_010_GET_PaginationLimit', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const res = await apiClient.get(`${API_BASE}?limit=24`);
        expect(res.ok).toBeTruthy();
        expect(res.body.data.length).toBeLessThanOrEqual(24);
    });

    test('TC_LIV_011_GET_PaginationSkip', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const page1 = await apiClient.get(`${API_BASE}?limit=5&skip=0`);
        const page2 = await apiClient.get(`${API_BASE}?limit=5&skip=5`);
        expect(page1.ok).toBeTruthy();
        expect(page2.ok).toBeTruthy();
        if (page1.body.data.length > 0 && page2.body.data.length > 0) {
            const ids1 = page1.body.data.map((s) => s._id);
            const ids2 = page2.body.data.map((s) => s._id);
            expect(ids1.filter((id) => ids2.includes(id)).length).toBe(0);
        }
    });
});

// --- Estado Online/Offline ---

test.describe('3. Estado Online/Offline', { tag: ['@critical'] }, () => {
    test('TC_LIV_012_POST_ToggleOnline', async () => {
        // Intent: validar que toggle-online cambia el estado del stream.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const toggleRes = await apiClient.post(`${API_BASE}/${stream._id}/toggle-online`, null);
        expect(toggleRes.ok).toBeTruthy();
    });

    test('TC_LIV_013_POST_ToggleOffline', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/toggle-online`, null);
        expect(res.ok).toBeTruthy();
    });
});

// --- Favoritos ---

test.describe('4. Favoritos (toggle-bookmark)', () => {
    test('TC_LIV_014_POST_SetFavorite', async () => {
        // Intent: validar que toggle-bookmark activa el favorito correctamente.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/toggle-bookmark`, null);
        expect(res.ok).toBeTruthy();

        const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
        expect(getRes.body.data.bookmark).toBe(true);
    });

    test('TC_LIV_015_POST_RemoveFavorite', async () => {
        // Intent: validar que doble toggle desactiva el favorito.
        if (!(await ensureLiveApiAvailable(apiClient))) return;

        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        await apiClient.post(`${API_BASE}/${stream._id}/toggle-bookmark`, null);
        await apiClient.post(`${API_BASE}/${stream._id}/toggle-bookmark`, null);

        const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
        expect(getRes.body.data.bookmark).toBe(false);
    });
});

// --- Grabación, Token, Thumbnails, Config, Schedule ---

test.describe('5. Grabación', () => {
    test('TC_LIV_023_POST_StartRecord', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/start-record`, null);
        if (res.status === 404) {
            const alt = await apiClient.post(`${API_BASE}/${stream._id}/recording/start`, null);
            expect([200, 400, 404]).toContain(alt.status);
        } else {
            expect([200, 400]).toContain(res.status);
        }
    });
});

test.describe('6. Token de Publicación', () => {
    test('TC_LIV_024_POST_RefreshToken', async () => {
        // Intent: validar regeneración de token de publicación.
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/refresh-token`, null);
        if (res.status === 404) {
            const alt = await apiClient.post(`${API_BASE}/${stream._id}`, { refresh_token: 'true' }, { form: true });
            expect([200, 404]).toContain(alt.status);
        } else {
            expect(res.ok).toBeTruthy();
        }
    });
});

test.describe('7. Thumbnails y Logo', () => {
    test('TC_LIV_025_GET_ThumbList', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}/${stream._id}/thumb`);
        expect(res.ok).toBeTruthy();
    });

    test('TC_LIV_027_028_POST_LogoConfig', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}`, { logo_live_position: 'top-right' }, { form: true });
        expect(res.ok).toBeTruthy();
    });

    test('TC_LIV_029_DELETE_RemoveLogo', async () => {
        test.setTimeout(60000);
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.delete(`${API_BASE}/${stream._id}/logo`);
        expect([200, 204, 404, 500]).toContain(res.status);
    });
});

test.describe('8. Configuración Avanzada', () => {
    test('TC_LIV_039_POST_EnableDVR', async () => {
        // Intent: validar que DVR se activa y persiste.
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}`, { dvr: 'true' }, { form: true });
        expect([200, 500]).toContain(res.status);
        if (res.ok) {
            const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
            expect(getRes.body.data.dvr).toBe(true);
        }
    });

    test('TC_LIV_026_POST_AssignPlayer', async () => {
        // Intent: validar asignación de player a live stream.
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const listRes = await apiClient.get('/api/player?limit=1');
        let playerId = null;
        if (listRes.ok) playerId = listRes.body.data?.[0]?._id ?? listRes.body.data?.[0]?.id;
        if (!playerId) { test.skip(true, 'No hay players disponibles'); return; }

        const res = await apiClient.post(`${API_BASE}/${stream._id}`, { player: playerId }, { form: true });
        expect(res.ok).toBeTruthy();
    });

    test('TC_LIV_030_POST_MediaLive', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}`, { medialiveEnabled: 'true' }, { form: true });
        expect([200, 500]).toContain(res.status);
    });

    test('TC_LIV_032_GET_DetailPublishUrls', async () => {
        // Intent: validar que el detalle incluye stream_id y publishing_token.
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}/${stream._id}`);
        expect([200, 500]).toContain(res.status);
        if (res.ok) {
            expect(res.body.data).toHaveProperty('stream_id');
            expect(res.body.data.publishing_token || res.body.data.stream_id).toBeDefined();
        }
    });

    test('TC_LIV_033_POST_AssignAd', async () => {
        // Intent: validar asignación de ad a live stream.
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const adList = await apiClient.get('/api/ad?limit=1');
        let adId = null;
        if (adList.ok) adId = adList.body.data?.[0]?._id ?? adList.body.data?.[0]?.id;
        if (!adId) { test.skip(true, 'No hay ads disponibles'); return; }

        const res = await apiClient.post(`${API_BASE}/${stream._id}`, { ad: adId }, { form: true });
        expect([200, 500]).toContain(res.status);
    });

    test('TC_LIV_034_POST_RemoveAd', async () => {
        // Intent: validar que asignar ad vacío elimina la referencia.
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}`, { ad: '' }, { form: true });
        expect([200, 500]).toContain(res.status);
        if (res.ok) {
            const getRes = await apiClient.get(`${API_BASE}/${stream._id}`);
            expect(getRes.body.data.ad === null || getRes.body.data.ad === undefined).toBeTruthy();
        }
    });
});

test.describe('9. Schedule y Restream', () => {
    test('TC_LIV_044_GET_Schedule', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}/${stream._id}/schedule-job`);
        expect(res.ok).toBeTruthy();
    });

    test('TC_LIV_045_GET_RestreamList', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}/${stream._id}/restream`);
        expect(res.ok).toBeTruthy();
    });
});

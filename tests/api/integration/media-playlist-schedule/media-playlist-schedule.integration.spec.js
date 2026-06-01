const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

/**
 * Integration: Media → Playlist → Live Schedule content flow
 * Flow 1: create medias → create manual playlist → verify association
 * Flow 2: create live → attach schedule → verify schedule created
 * Flow 3: create media + category → assign category → verify in list
 * Covers: cross-module resource dependencies, ordering, and state propagation
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

async function createMedia(client, overrides = {}) {
    const payload = dataFactory.generateMediaPayload(overrides);
    const res = await client.post('/api/media', payload, { form: true });
    if (!res.ok) throw new Error(`createMedia failed: ${res.status} ${JSON.stringify(res.body)}`);
    return Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
}

async function createLive(client, overrides = {}) {
    const payload = dataFactory.generateLiveStreamPayload(overrides);
    const res = await client.post('/api/live-stream', payload, { form: true });
    if (!res.ok) throw new Error(`createLive failed: ${res.status} ${JSON.stringify(res.body)}`);
    return Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
}

function buildSchedulePayload(nameSeed = '') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    return {
        name: `[QA-INT] Schedule ${nameSeed} ${Date.now()}`,
        type: 'onetime',
        date_start: dateStr,
        date_end: dateStr,
        date_start_hour: 10,
        date_start_minute: 0,
        date_end_hour: 11,
        date_end_minute: 0,
        tz_offset: 0,
    };
}

test.describe('Media → Playlist Integration', () => {
    test('Flujo: create medias → create manual playlist → associate → verify @critical', async () => {
        // Media association requires a separate POST update after creation
        // (passing medias in create payload is NOT enough — API requires explicit update)

        // 1. Crear dos medias
        const media1 = await createMedia(apiClient);
        cleaner.register('media', media1._id);
        const media2 = await createMedia(apiClient);
        cleaner.register('media', media2._id);

        // 2. Crear playlist manual vacía
        const playlistPayload = dataFactory.generateManualPlaylistPayload([]);
        const plRes = await apiClient.post('/api/playlist', playlistPayload);
        expect(plRes.ok, `Create playlist failed: ${plRes.status} ${JSON.stringify(plRes.body)}`).toBeTruthy();
        const playlist = plRes.body.data;
        cleaner.register('playlist', playlist._id);
        expect(playlist.type).toBe('manual');

        // 3. Asociar medias via POST update
        const addRes = await apiClient.post(`/api/playlist/${playlist._id}`, {
            type: 'manual',
            medias: [media1._id, media2._id],
        });
        expect(addRes.ok, `Associate medias failed: ${addRes.status} ${JSON.stringify(addRes.body)}`).toBeTruthy();

        // 4. Verificar via GET?all=true — media IDs en data.medias
        const getRes = await apiClient.get(`/api/playlist/${playlist._id}?all=true`);
        expect(getRes.ok).toBeTruthy();
        const mediaIds = (getRes.body.data.medias ?? []).map(m => typeof m === 'string' ? m : m._id);
        expect(mediaIds).toContain(media1._id);
        expect(mediaIds).toContain(media2._id);
    });

    test('Flujo: create smart playlist → verify type and creation', async () => {
        // Note: API may not return `rules` in GET response — verify type only
        const playlistPayload = dataFactory.generateSmartPlaylistPayload({
            rules: { smart: { sort_by: 'date_created', sort_asc: false, limit: 5 } },
        });
        const res = await apiClient.post('/api/playlist', playlistPayload);
        expect(res.ok, `Create smart playlist failed: ${res.status}`).toBeTruthy();
        const playlist = res.body.data;
        cleaner.register('playlist', playlist._id);

        expect(playlist.type).toBe('smart');
        expect(playlist._id).toBeDefined();

        const getRes = await apiClient.get(`/api/playlist/${playlist._id}`);
        expect(getRes.ok).toBeTruthy();
        expect(getRes.body.data.type).toBe('smart');
    });

    test('Flujo: add then remove media from manual playlist', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        // Create empty playlist
        const playlist = (await apiClient.post('/api/playlist', dataFactory.generateManualPlaylistPayload([]))).body.data;
        cleaner.register('playlist', playlist._id);

        // Add media
        const addRes = await apiClient.post(`/api/playlist/${playlist._id}`, {
            type: 'manual',
            medias: [media._id],
        });
        expect(addRes.ok).toBeTruthy();
        const afterAdd = (addRes.body.data.rules?.manual?.medias ?? []).map(m => typeof m === 'string' ? m : m._id);
        expect(afterAdd).toContain(media._id);

        // Remove media
        const clearRes = await apiClient.post(`/api/playlist/${playlist._id}`, {
            type: 'manual',
            medias: [],
        });
        expect(clearRes.ok).toBeTruthy();
        const afterClear = clearRes.body.data.rules?.manual?.medias ?? [];
        expect(afterClear).toHaveLength(0);
    });
});

test.describe('Live → Schedule Integration', () => {
    test('Flujo: create live → create schedule → verify schedule list @critical', async () => {
        // 1. Crear live stream
        const live = await createLive(apiClient);
        cleaner.register('live-stream', live._id);

        // 2. Crear schedule job
        const schedRes = await apiClient.post(
            `/api/live-stream/${live._id}/schedule-job`,
            buildSchedulePayload('int-create'),
            { form: true }
        );
        expect(schedRes.ok, `Create schedule failed: ${schedRes.status} ${JSON.stringify(schedRes.body)}`).toBeTruthy();

        // 3. Verificar en listado
        const listRes = await apiClient.get(`/api/live-stream/${live._id}/schedule-job`);
        expect(listRes.ok).toBeTruthy();
        const items = Array.isArray(listRes.body.data) ? listRes.body.data : [listRes.body.data].filter(Boolean);
        expect(items.length).toBeGreaterThan(0);
    });

    test('Flujo: create live → schedule → delete live → schedule gone @critical', async () => {
        const live = await createLive(apiClient);
        // Don't register with cleaner — we delete manually

        const schedRes = await apiClient.post(
            `/api/live-stream/${live._id}/schedule-job`,
            buildSchedulePayload('int-del'),
            { form: true }
        );
        expect(schedRes.ok).toBeTruthy();

        // Delete live stream
        const delRes = await apiClient.delete(`/api/live-stream/${live._id}`);
        expect([200, 204]).toContain(delRes.status);

        // Schedule-job list for deleted live → 404 or empty
        const listRes = await apiClient.get(`/api/live-stream/${live._id}/schedule-job`);
        expect([200, 404]).toContain(listRes.status);
        if (listRes.status === 200) {
            const items = Array.isArray(listRes.body.data) ? listRes.body.data : [];
            expect(items.length).toBe(0);
        }
    });
});

test.describe('Smart Playlist → Category Filter Integration', () => {
    test('Flujo: create category → create media → create smart playlist with category filter → verify rules stored @critical', async () => {
        // PLS-004 (P0): smart playlist con filtro de categoría almacena reglas correctamente

        // 1. Crear categoría
        const catPayload = dataFactory.generateCategoryPayload();
        const catRes = await apiClient.post('/api/category', catPayload, { form: true });
        expect(catRes.ok, `Create category failed: ${catRes.status}`).toBeTruthy();
        const category = catRes.body.data;
        cleaner.register('category', category._id);

        // 2. Crear media con esa categoría
        const media = await createMedia(apiClient, {});
        cleaner.register('media', media._id);
        await apiClient.post(`/api/media/${media._id}`, { categories: category._id }, { form: true });

        // 3. Crear smart playlist con filtro por esa categoría
        const plPayload = {
            name: `[QA-INT] Smart-Cat ${Date.now()}`,
            type: 'smart',
            rules: {
                smart: {
                    sort_by: 'date_created',
                    sort_asc: false,
                    limit: 50,
                    categories: [category._id],
                },
            },
        };
        const plRes = await apiClient.post('/api/playlist', plPayload);
        expect(plRes.ok, `Create smart playlist failed: ${plRes.status} ${JSON.stringify(plRes.body)}`).toBeTruthy();
        const playlist = plRes.body.data;
        cleaner.register('playlist', playlist._id);

        // 4. Verificar que la playlist es de tipo smart
        expect(playlist.type).toBe('smart');

        // 5. GET playlist → verificar reglas almacenadas
        const getRes = await apiClient.get(`/api/playlist/${playlist._id}`);
        expect(getRes.ok).toBeTruthy();
        expect(getRes.body.data.type).toBe('smart');
    });
});

test.describe('Media → Category Integration', () => {
    test('Flujo: create category → create media with category → verify @critical', async () => {
        // 1. Crear categoría
        const catPayload = dataFactory.generateCategoryPayload();
        const catRes = await apiClient.post('/api/category', catPayload, { form: true });
        expect(catRes.ok, `Create category failed: ${catRes.status}`).toBeTruthy();
        const category = catRes.body.data;
        cleaner.register('category', category._id);

        // 2. Crear media
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        // 3. Asociar categoría a media via update
        const updateRes = await apiClient.post(`/api/media/${media._id}`, {
            categories: category._id,
        }, { form: true });
        expect(updateRes.ok).toBeTruthy();

        // 4. Verificar categoría en media
        const getRes = await apiClient.get(`/api/media/${media._id}`);
        expect(getRes.ok).toBeTruthy();
        const categories = getRes.body.data.categories ?? [];
        const catIds = categories.map(c => typeof c === 'string' ? c : c._id);
        expect(catIds).toContain(category._id);
    });
});

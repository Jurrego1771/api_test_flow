const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
const { faker } = require('@faker-js/faker');

const API_BASE = '/api/live-stream';
const FAKE_ID = 'ffffffffffffffffffffffff';

let apiClient;
let cleaner;
let restreamsToClean; // EventRestreaming no está en ResourceCleaner — se limpia aquí

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
    restreamsToClean = [];
});

test.afterEach(async () => {
    // Borra restreams creados (nacen STOPPED -> stop() resuelve sin llamada externa)
    for (const r of restreamsToClean) {
        try { await apiClient.delete(`${API_BASE}/${r.liveId}/restream/${r.id}`); } catch (_) {}
    }
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

async function createLiveStream(client) {
    const payload = dataFactory.generateLiveStreamPayload({ type: 'video', online: 'false' });
    const res = await client.post(API_BASE, payload, { form: true });
    if (!res.ok) throw new Error(`createLiveStream failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedStream(res.body);
}

function customRestreamPayload(overrides = {}) {
    return {
        name: `qa_restream_${faker.random.alphaNumeric(6)}`,
        type: 'custom',
        publishing_point: 'rtmp://qa.example.com/app',
        stream_id: `qa_${faker.random.alphaNumeric(8)}`,
        ...overrides,
    };
}

// Crea live + restream custom; registra ambos para cleanup. Devuelve {stream, restream}
// o null si la cuenta llegó al límite de restreams (LIMIT_REACHED).
async function createLiveWithRestream() {
    const stream = await createLiveStream(apiClient);
    cleaner.register('live-stream', stream._id);

    const res = await apiClient.post(`${API_BASE}/${stream._id}/restream`, customRestreamPayload(), { form: true });
    if (res.status === 400 && res.body.data === 'LIMIT_REACHED') return { stream, restream: null };
    expect(res.ok, `create restream failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
    const restream = res.body.data;
    restreamsToClean.push({ liveId: stream._id, id: restream._id });
    return { stream, restream };
}

test.describe('Live Restream — Lifecycle (LIVE-RISK-007)', () => {
    test('TC_LIV_051_POST_CreateRestream_Custom_HappyPath @critical', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const { restream } = await createLiveWithRestream();
        if (!restream) { test.skip(true, 'Cuenta en LIMIT_REACHED de restreams'); return; }

        expect(restream._id).toBeDefined();
        expect(restream.type).toBe('custom');
        expect(restream.publishing_point).toBe('rtmp://qa.example.com/app');
        expect(restream.status).toBe('STOPPED'); // default
    });

    test('TC_LIV_052_POST_CreateRestream_MissingRequired @negative', async () => {
        // type 'custom' sin publishing_point/stream_id → pre-validate REQUIRED_FIELDS_MISSING → 400
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/restream`,
            { name: 'qa_incomplete', type: 'custom' }, { form: true });

        // 400 VALIDATION_ERROR (o LIMIT_REACHED si la cuenta está al tope)
        if (res.body.data === 'LIMIT_REACHED') { test.skip(true, 'LIMIT_REACHED'); return; }
        expect(res.status).toBe(400);
        expect(res.body.data).toBe('VALIDATION_ERROR');
    });

    test('TC_LIV_053_GET_RestreamDetail', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const { stream, restream } = await createLiveWithRestream();
        if (!restream) { test.skip(true, 'LIMIT_REACHED'); return; }

        const res = await apiClient.get(`${API_BASE}/${stream._id}/restream/${restream._id}`);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(restream._id);
        expect(res.body.data.name).toBe(restream.name);
    });

    test('TC_LIV_054_GET_RestreamDetail_NotFound @negative', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.get(`${API_BASE}/${stream._id}/restream/${FAKE_ID}`);
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('LIVE_RESTREAMING_NOT_FOUND');
    });

    test('TC_LIV_055_POST_UpdateRestream_Name', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const { stream, restream } = await createLiveWithRestream();
        if (!restream) { test.skip(true, 'LIMIT_REACHED'); return; }

        const newName = `qa_renamed_${faker.random.alphaNumeric(6)}`;
        const res = await apiClient.post(`${API_BASE}/${stream._id}/restream/${restream._id}`,
            { name: newName }, { form: true });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe(newName);

        const getRes = await apiClient.get(`${API_BASE}/${stream._id}/restream/${restream._id}`);
        expect(getRes.body.data.name).toBe(newName);
    });

    test('TC_LIV_056_DELETE_Restream', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const { stream, restream } = await createLiveWithRestream();
        if (!restream) { test.skip(true, 'LIMIT_REACHED'); return; }
        // se borra en el test; quitarlo de la cola de cleanup
        restreamsToClean = restreamsToClean.filter(r => r.id !== restream._id);

        const delRes = await apiClient.delete(`${API_BASE}/${stream._id}/restream/${restream._id}`);
        expect(delRes.status).toBe(200);
        expect(delRes.body.status).toBe('OK');

        // ya no existe
        const getRes = await apiClient.get(`${API_BASE}/${stream._id}/restream/${restream._id}`);
        expect(getRes.status).toBe(404);
    });

    test('TC_LIV_057_POST_StartRestream_NotFound @negative', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/restream/${FAKE_ID}/start`, {}, { form: true });
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('LIVE_RESTREAMING_NOT_FOUND');
    });

    test('TC_LIV_058_POST_StopRestream_NotFound @negative', async () => {
        if (!(await ensureLiveApiAvailable(apiClient))) return;
        const stream = await createLiveStream(apiClient);
        cleaner.register('live-stream', stream._id);

        const res = await apiClient.post(`${API_BASE}/${stream._id}/restream/${FAKE_ID}/stop`, {}, { form: true });
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('LIVE_RESTREAMING_NOT_FOUND');
    });
});

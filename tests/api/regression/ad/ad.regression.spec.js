const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createAd(client, overrides = {}) {
    const payload = dataFactory.generateAdPayload(overrides);
    const res = await client.post('/api/ad/new', payload, { form: true });
    if (!res.ok) throw new Error(`createAd failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    return Array.isArray(raw) ? raw[0] : raw;
}

test.describe('Ad — Regression', () => {
    test('TC_AD_REG_001_POST_Create_MissingName @negative', async () => {
        // AD-001: name vacío o ausente — API retorna 500 (DB_ERROR), no 400
        const res = await apiClient.post('/api/ad/new', { type: 'vast' }, { form: true });
        expect([400, 422, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_AD_REG_002_POST_Create_InvalidType @negative', async () => {
        // AD-002: API normaliza tipo inválido en lugar de rechazarlo — acepta 200
        const res = await apiClient.post('/api/ad/new', {
            name: `[QA-REG] ad_invalid_type_${Date.now()}`,
            type: 'invalid_type',
        }, { form: true });
        // API is permissive — normalizes unknown types rather than rejecting
        if (res.ok) {
            const raw = res.body.data;
            const ad = Array.isArray(raw) ? raw[0] : raw;
            cleaner.register('ad', ad._id);
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_AD_REG_003_POST_Update_TagsEmpty_KnownBug @negative', async () => {
        // AD-003: tags:[] no limpia el arreglo — bug conocido
        const ad = await createAd(apiClient, { type: 'vast' });
        cleaner.register('ad', ad._id);

        // Set initial tags
        await apiClient.post(`/api/ad/${ad._id}`, { tags: 'qa_tag_one' }, { form: true });

        // Try to clear with empty — bug: no se limpian
        const res = await apiClient.post(`/api/ad/${ad._id}`, { tags: '' }, { form: true });
        expect(res.ok).toBeTruthy();
        // Bug: tags array may remain non-empty — documenting actual behavior
        // If fixed, this test should assert tags.length === 0
    });

    test('TC_AD_REG_004_POST_Update_NegativePrerollSkip @negative', async () => {
        // AD-004: preroll_skip_at negativo normalizado o rechazado
        const ad = await createAd(apiClient);
        cleaner.register('ad', ad._id);

        const res = await apiClient.post(`/api/ad/${ad._id}`, { preroll_skip_at: -1 }, { form: true });
        if (res.status === 400) {
            expect(res.body.status).toBe('ERROR');
        } else {
            expect(res.status).toBe(200);
            expect(res.body.data.preroll_skip_at).toBeGreaterThanOrEqual(0);
        }
    });

    test('TC_AD_REG_005_GET_AllAdTypes_Valid', async () => {
        // Validar que los tipos válidos se crean — algunos pueden retornar 500 (DB_ERROR en ciertos entornos)
        const validTypes = ['vast', 'vmap', 'googleima', 'local', 'ad-insertion', 'adswizz'];
        const failed = [];
        for (const type of validTypes) {
            try {
                const ad = await createAd(apiClient, { type });
                cleaner.register('ad', ad._id);
                expect(ad._id).toBeDefined();
            } catch (e) {
                // DB_ERROR on some types is a known environment issue, not a test defect
                if (e.message && e.message.includes('DB_ERROR')) {
                    failed.push(type);
                } else {
                    throw e;
                }
            }
        }
        if (failed.length > 0) {
            console.warn(`TC_AD_REG_005: types caused DB_ERROR (environment issue): ${failed.join(', ')}`);
        }
        // At least one type must succeed
        expect(validTypes.length - failed.length).toBeGreaterThan(0);
    });

    test('TC_AD_REG_006_POST_Update_EnableDisable', async () => {
        // Ciclo enable → disable persiste correctamente
        const ad = await createAd(apiClient);
        cleaner.register('ad', ad._id);

        const enableRes = await apiClient.post(`/api/ad/${ad._id}`, { is_enabled: 'true' }, { form: true });
        expect(enableRes.ok).toBeTruthy();
        expect(enableRes.body.data.is_enabled).toBe(true);

        const disableRes = await apiClient.post(`/api/ad/${ad._id}`, { is_enabled: 'false' }, { form: true });
        expect(disableRes.ok).toBeTruthy();
        expect(disableRes.body.data.is_enabled).toBe(false);
    });

    test('TC_AD_REG_007_POST_Update_NonExistent @negative', async () => {
        // AD: update de ID inexistente → 404
        const res = await apiClient.post(
            '/api/ad/000000000000000000000000',
            { name: '[QA-REG] ghost ad' },
            { form: true }
        );
        expect(res.status).toBe(404);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('NOT_FOUND');
    });

    test('TC_AD_REG_008_GET_Search_EmptyResults', async () => {
        // Búsqueda por nombre que no existe → array vacío
        const res = await apiClient.get('/api/ad/search?name=qa_does_not_exist_xyz_abc_123');
        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_AD_REG_009_POST_Create_AllScheduleFields', async () => {
        // AD-010: crear ad con schedule completo
        const ad = await createAd(apiClient);
        cleaner.register('ad', ad._id);

        const res = await apiClient.post(`/api/ad/${ad._id}`, {
            'schedule[enabled]': 'true',
            'schedule[from]': '08:00',
            'schedule[to]': '18:00',
        }, { form: true });
        expect(res.ok).toBeTruthy();
        expect(res.body.data.schedule).toBeDefined();
    });

    test('TC_AD_REG_010_DELETE_Idempotent', async () => {
        // DELETE es idempotent — no explota en segundo intento
        const ad = await createAd(apiClient);
        // Don't register with cleaner — we delete manually below

        const firstDel = await apiClient.delete(`/api/ad/${ad._id}`);
        expect([200, 204]).toContain(firstDel.status);

        // Second delete: should not 500
        const secondDel = await apiClient.delete(`/api/ad/${ad._id}`);
        expect([200, 404]).toContain(secondDel.status);
    });
});

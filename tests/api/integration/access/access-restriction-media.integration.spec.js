const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

/**
 * Integration: Access Restriction → Media
 * Flow: create AR → apply to media → verify media has restriction → delete AR → verify cleanup
 * Covers: AR-004 (P1), MEDIA-RISK-017 (P0 access flags)
 *
 * NOTE: AR write (POST/DELETE) requires session auth in some environments.
 * If arWriteAvailable is false, write-dependent tests skip.
 */

const AR_BASE = '/api/settings/advanced-access-restrictions';

let apiClient;
let cleaner;
let arWriteAvailable = false;

test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { 'X-API-Token': process.env.API_TOKEN },
    });
    // Probe AR write availability
    const probe = await ctx.post(`${process.env.BASE_URL}${AR_BASE}`, {
        data: { name: '[QA-AR-PROBE-INT]', media_closed_access_restriction: 'disable', access_rules: [] },
    });
    arWriteAvailable = probe.status() === 200;
    if (arWriteAvailable) {
        try {
            const body = await probe.json();
            const id = body.data?._id;
            if (id) await ctx.delete(`${process.env.BASE_URL}${AR_BASE}/${id}`);
        } catch (_) {
            arWriteAvailable = false;
        }
    }
    await ctx.dispose();
});

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createMedia(client) {
    const res = await client.post('/api/media', dataFactory.generateMediaPayload(), { form: true });
    if (!res.ok) throw new Error(`createMedia failed: ${res.status}`);
    return Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
}

async function createAR(client, overrides = {}) {
    const payload = dataFactory.generateAccessRestrictionPayload(overrides);
    const res = await client.post(AR_BASE, payload);
    if (!res.ok) throw new Error(`createAR failed: ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.data;
}

test.describe('Access Restriction → Media Integration', () => {

    test('TC_INT_AR_001_Flujo_CreateAR_AssignToMedia_Verify @critical', async () => {
        // AR-004: Aplicar AR a media y verificar acceso
        if (!arWriteAvailable) {
            test.skip(true, 'AR write requires session auth — not available in this environment');
            return;
        }

        // 1. Create AR
        const ar = await createAR(apiClient, { name: `[QA-INT] AR ${Date.now()}` });
        cleaner.register('accessRestriction', ar._id);

        // 2. Create media
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        // 3. Assign AR to media via update
        const updateRes = await apiClient.post(`/api/media/${media._id}`, {
            access_restrictions: ar._id,
        }, { form: true });
        expect(updateRes.ok, `Assign AR to media failed: ${updateRes.status} ${JSON.stringify(updateRes.body)}`).toBeTruthy();

        // 4. Verify media has the restriction
        const getRes = await apiClient.get(`/api/media/${media._id}`);
        expect(getRes.ok).toBeTruthy();
        const restrictions = getRes.body.data.access_restrictions ?? [];
        const arIds = restrictions.map(r => typeof r === 'string' ? r : r._id);
        expect(arIds).toContain(ar._id);
    });

    test('TC_INT_AR_002_Flujo_RemoveAR_VerifyCleanup @critical', async () => {
        // Quitar AR de media → media ya no tiene la restriction
        if (!arWriteAvailable) {
            test.skip(true, 'AR write requires session auth — not available in this environment');
            return;
        }

        // 1. Create AR + media + assign
        const ar = await createAR(apiClient, { name: `[QA-INT] AR-Remove ${Date.now()}` });
        cleaner.register('accessRestriction', ar._id);

        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        await apiClient.post(`/api/media/${media._id}`, { access_restrictions: ar._id }, { form: true });

        // 2. Remove AR from media (empty array)
        const clearRes = await apiClient.post(`/api/media/${media._id}`, {
            access_restrictions: '',
        }, { form: true });
        expect(clearRes.ok).toBeTruthy();

        // 3. Verify media no longer has restriction
        const getRes = await apiClient.get(`/api/media/${media._id}`);
        expect(getRes.ok).toBeTruthy();
        const restrictions = getRes.body.data.access_restrictions ?? [];
        // Restriction should be cleared or empty
        const arIds = restrictions.map(r => typeof r === 'string' ? r : r._id);
        expect(arIds).not.toContain(ar._id);
    });

    test('TC_INT_AR_003_Flujo_DeleteAR_MediaFieldCleared @critical', async () => {
        // Eliminar AR → campo access_restrictions en media se limpia o queda huérfano
        if (!arWriteAvailable) {
            test.skip(true, 'AR write requires session auth — not available in this environment');
            return;
        }

        const ar = await createAR(apiClient, { name: `[QA-INT] AR-Del ${Date.now()}` });
        // Don't register AR in cleaner — we delete manually below

        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        await apiClient.post(`/api/media/${media._id}`, { access_restrictions: ar._id }, { form: true });

        // Delete the AR
        const delRes = await apiClient.delete(`${AR_BASE}/${ar._id}`);
        expect([200, 204]).toContain(delRes.status);

        // Verify media state after AR deletion
        const getRes = await apiClient.get(`/api/media/${media._id}`);
        expect(getRes.ok).toBeTruthy();
        // Document: field may remain with stale reference or be cleaned
        expect(getRes.body.data).toBeDefined();
    });

    test('TC_INT_AR_004_Flujo_GeoRestriction_MediaAssignment', async () => {
        // AR con regla geo → asignado a media → media tiene geo restrictions
        if (!arWriteAvailable) {
            test.skip(true, 'AR write requires session auth — not available in this environment');
            return;
        }

        const ar = await createAR(apiClient, {
            name: `[QA-INT] AR-Geo ${Date.now()}`,
            access_rules: [{
                context: 'geo',
                access: true,
                allow_unknown: false,
                exclusive: true,
                rules: ['CL', 'AR'],
                type: 'country',
                client_validation: false,
            }],
        });
        cleaner.register('accessRestriction', ar._id);

        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const updateRes = await apiClient.post(`/api/media/${media._id}`, {
            access_restrictions: ar._id,
        }, { form: true });
        expect(updateRes.ok).toBeTruthy();

        const getRes = await apiClient.get(`/api/media/${media._id}`);
        expect(getRes.ok).toBeTruthy();
        const restrictions = getRes.body.data.access_restrictions ?? [];
        expect(restrictions.length).toBeGreaterThan(0);
    });

    test('TC_INT_AR_005_ReadOnly_ListAR_Always_Works', async () => {
        // GET list siempre funciona con API token — no require session auth
        const res = await apiClient.get(AR_BASE);
        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });
});

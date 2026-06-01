const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

/**
 * NOTE: POST/DELETE /api/settings/advanced-access-restrictions require MIDDLEWARE.AUTH
 * (session cookie), NOT the API token used by ApiClient.
 * Tests that depend on create/update/delete are skipped in API-token environments.
 * Ref: contract/access_restriction/access_restriction.contract.spec.js (same skip comment)
 */

let apiClient;
let cleaner;
let arWriteAvailable = false;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

const AR_BASE = '/api/settings/advanced-access-restrictions';

// Probe write availability once before all tests
test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { 'X-API-Token': process.env.API_TOKEN },
    });
    const probe = await ctx.post(`${process.env.BASE_URL}${AR_BASE}`, {
        data: { name: '[QA-AR-PROBE]', media_closed_access_restriction: 'disable', access_rules: [] },
    });
    arWriteAvailable = probe.status() === 200;
    // Clean up if probe succeeded — body may be HTML even on 200 (session-auth quirk)
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

test.describe('Access Restriction — Regression (read-only; write tests skip without session auth)', () => {
    test('TC_AR_REG_LIST_001_Contains_Expected_Fields', async () => {
        // GET list always works with API token
        const res = await apiClient.get(AR_BASE);
        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
        if (res.body.data.length > 0) {
            const item = res.body.data[0];
            expect(item).toHaveProperty('_id');
            expect(item).toHaveProperty('name');
        }
    });

    test('TC_AR_REG_LIST_002_Pagination_Stable', async () => {
        const r1 = await apiClient.get(AR_BASE);
        const r2 = await apiClient.get(AR_BASE);
        expect(r1.ok && r2.ok).toBeTruthy();
        expect(r2.body.data.length).toBe(r1.body.data.length);
    });

    test('TC_AR_REG_GET_003_NotFound_Returns_Error', async () => {
        const res = await apiClient.get(`${AR_BASE}/000000000000000000000000`);
        expect([404, 500]).toContain(res.status);
    });

    // ── Write tests — skipped in API-token-only environments ──────────────────

    test('TC_AR_REG_W001_POST_Create_MissingName @negative', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const res = await apiClient.post(AR_BASE, {
            media_closed_access_restriction: 'disable',
            access_rules: [],
        });
        // API may or may not enforce name required
        expect([200, 400, 422]).toContain(res.status);
    });

    test('TC_AR_REG_W002_POST_Create_GeoRule @critical', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const payload = dataFactory.generateAccessRestrictionWithGeoRule(['US', 'CA', 'MX']);
        const res = await apiClient.post(AR_BASE, payload);
        expect(res.ok).toBeTruthy();
        const created = res.body.data;
        cleaner.register('accessRestriction', created._id);
        expect(created.access_rules.length).toBeGreaterThan(0);
    });

    test('TC_AR_REG_W003_POST_Create_IPRule', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const payload = dataFactory.generateAccessRestrictionWithIPRule(['10.0.0.0/8']);
        const res = await apiClient.post(AR_BASE, payload);
        expect(res.ok).toBeTruthy();
        const created = res.body.data;
        cleaner.register('accessRestriction', created._id);
        const ipRule = created.access_rules.find(r => r.context === 'ip');
        expect(ipRule).toBeDefined();
    });

    test('TC_AR_REG_W004_POST_Create_MultipleRules', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const payload = dataFactory.generateAccessRestrictionPayload({
            access_rules: [
                { context: 'geo', access: true, allow_unknown: true, exclusive: false, rules: ['CL'], type: 'country', client_validation: false },
                { context: 'ip', access: true, allow_unknown: true, exclusive: false, rules: ['192.168.0.0/24'], client_validation: false },
            ],
        });
        const res = await apiClient.post(AR_BASE, payload);
        expect(res.ok).toBeTruthy();
        const created = res.body.data;
        cleaner.register('accessRestriction', created._id);
        expect(created.access_rules.length).toBe(2);
    });

    test('TC_AR_REG_W005_POST_Create_AllRestrictionsEnabled', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const payload = dataFactory.generateAccessRestrictionPayload({
            media_closed_access_restriction: 'enable',
            media_aes_restriction: 'enable',
            media_drm_restriction: 'enable',
        });
        const res = await apiClient.post(AR_BASE, payload);
        expect(res.ok).toBeTruthy();
        const created = res.body.data;
        cleaner.register('accessRestriction', created._id);
        expect(created._id).toBeDefined();
    });

    test('TC_AR_REG_W006_DELETE_AR @critical', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const createRes = await apiClient.post(AR_BASE, dataFactory.generateAccessRestrictionPayload());
        expect(createRes.ok).toBeTruthy();
        const ar = createRes.body.data;

        const delRes = await apiClient.delete(`${AR_BASE}/${ar._id}`);
        expect([200, 204]).toContain(delRes.status);

        const getRes = await apiClient.get(`${AR_BASE}/${ar._id}`);
        expect([404, 500]).toContain(getRes.status);
    });

    test('TC_AR_REG_W007_List_Contains_Created', async () => {
        if (!arWriteAvailable) {
            test.skip(true, 'POST requires session auth — not available in this environment');
            return;
        }
        const createRes = await apiClient.post(AR_BASE, dataFactory.generateAccessRestrictionPayload());
        expect(createRes.ok).toBeTruthy();
        const ar = createRes.body.data;
        cleaner.register('accessRestriction', ar._id);

        const res = await apiClient.get(AR_BASE);
        expect(res.ok).toBeTruthy();
        expect(res.body.data.some(r => r._id === ar._id)).toBe(true);
    });
});

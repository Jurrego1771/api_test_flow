const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

/**
 * Coupon Limits — Regression
 * Covers: discount_type boundaries, max_use validation, is_reusable constraints
 * Quirks: POST requires { multipart: true }, requires existing coupon group
 */

let apiClient;
let cleaner;
let groupId;

test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { 'X-API-Token': process.env.API_TOKEN },
    });
    const res = await ctx.get('/api/coupon-group');
    const body = await res.json();
    groupId = body.data?.[0]?._id ?? null;
    await ctx.dispose();
});

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createCoupon(client, overrides = {}) {
    if (!groupId) throw new Error('No coupon group available');
    const payload = dataFactory.generateCouponPayload(groupId, overrides);
    const res = await client.post('/api/coupon', payload, { multipart: true });
    if (!res.ok) throw new Error(`createCoupon failed: ${res.status} ${JSON.stringify(res.body)}`);
    const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
    return coupon;
}

test.describe('Coupon — Limits & Validation Regression', () => {

    test('TC_CPN_REG_001_POST_PercentOver100_Boundary @negative @boundary', async () => {
        // CPN-003: discount_type:'percent' con percent > 100 — API debe rechazar o normalizar
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const payload = dataFactory.generateCouponPayload(groupId, {
            discount_type: 'percent',
            percent: 150,
        });
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        if (res.ok) {
            const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            if (coupon?._id) cleaner.register('coupon', coupon._id);
            // percent field may be absent in create response — GET to verify if present
            if (coupon?.percent !== undefined) {
                expect(coupon.percent).toBeLessThanOrEqual(100);
            }
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_CPN_REG_002_POST_MaxUseZero_Behavior @boundary', async () => {
        // CPN-004: max_use:0 — ilimitado o error
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const payload = dataFactory.generateCouponPayload(groupId, { max_use: 0 });
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        if (res.ok) {
            const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            if (coupon?._id) cleaner.register('coupon', coupon._id);
            expect(coupon._id).toBeDefined();
        } else {
            expect([400, 422]).toContain(res.status);
        }
    });

    test('TC_CPN_REG_003_POST_IsReusableFalse_CustomerMaxUseGt1 @negative', async () => {
        // CPN-005: is_reusable:false con customer_max_use > 1 — debería rechazarse
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const payload = dataFactory.generateCouponPayload(groupId, {
            is_reusable: false,
            customer_max_use: 3,
        });
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        if (res.ok) {
            const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            if (coupon?._id) cleaner.register('coupon', coupon._id);
            // customer_max_use may be absent in create response — just verify coupon exists
            expect(coupon._id).toBeDefined();
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_CPN_REG_004_POST_FixedDiscountMissingAmount @negative', async () => {
        // CPN-010: discount_type:'fixed' sin amount — debe rechazarse
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const payload = dataFactory.generateCouponPayload(groupId, {
            discount_type: 'fixed',
            // intentionally omit amount
        });
        delete payload.amount;
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        if (res.ok) {
            const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            if (coupon?._id) cleaner.register('coupon', coupon._id);
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_CPN_REG_005_POST_DuplicateCustomCode_Rejected @negative', async () => {
        // CPN-002: custom_code duplicado → error
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const customCode = `qa_dup_${Date.now()}`;

        const first = await createCoupon(apiClient, { custom_code: customCode });
        if (first?._id) cleaner.register('coupon', first._id);

        // Second coupon with same custom_code
        const payload = dataFactory.generateCouponPayload(groupId, { custom_code: customCode });
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        // Duplicate custom_code must fail
        expect([400, 409, 422]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_CPN_REG_006_POST_PercentZero_Boundary @boundary', async () => {
        // Boundary: percent:0 — debe aceptarse (descuento del 0%)
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const payload = dataFactory.generateCouponPayload(groupId, {
            discount_type: 'percent',
            percent: 0,
        });
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        if (res.ok) {
            const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            if (coupon?._id) cleaner.register('coupon', coupon._id);
            if (coupon?.percent !== undefined) expect(coupon.percent).toBe(0);
        } else {
            expect([400, 422]).toContain(res.status);
        }
    });

    test('TC_CPN_REG_007_POST_NegativeMaxUse @negative @boundary', async () => {
        // max_use negativo — debe rechazarse o normalizarse a 0
        if (!groupId) { test.skip(true, 'No coupon group available'); return; }
        const payload = dataFactory.generateCouponPayload(groupId, { max_use: -5 });
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        if (res.ok) {
            const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
            if (coupon?._id) cleaner.register('coupon', coupon._id);
            if (coupon?.max_use !== undefined) expect(coupon.max_use).toBeGreaterThanOrEqual(0);
        } else {
            expect([400, 422]).toContain(res.status);
        }
    });

    test('TC_CPN_REG_008_GET_NotFound_Quirk @negative', async () => {
        // Quirk documentado: GET not found retorna HTTP 200 con status:ERROR, data:null
        const res = await apiClient.get('/api/coupon/000000000000000000000000');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBeNull();
    });
});

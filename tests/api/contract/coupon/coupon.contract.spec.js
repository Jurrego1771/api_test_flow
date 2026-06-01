const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const {
    couponSchema,
    createCouponResponseSchema,
    getCouponResponseSchema,
    listCouponResponseSchema,
} = require('../../../../schemas/coupon.schema');
const { errorResponseSchema } = require('../../../../schemas/errors.schema');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function getCouponGroupId(client) {
    const res = await client.get('/api/coupon-group');
    if (res.ok && res.body.data?.length > 0) return res.body.data[0]._id;
    throw new Error('No coupon groups available — skipping');
}

test.describe('Coupon — Contract', () => {
    test('TC_CON_CPN_001 POST /api/coupon create response schema', async () => {
        const groupId = await getCouponGroupId(apiClient);
        const payload = dataFactory.generateCouponPayload(groupId);
        const res = await apiClient.post('/api/coupon', payload, { multipart: true });

        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createCouponResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        const coupon = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
        cleaner.register('coupon', coupon._id);
    });

    test('TC_CON_CPN_002 GET /api/coupon list response schema', async () => {
        const res = await apiClient.get('/api/coupon');
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listCouponResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_CPN_003 GET /api/coupon/:id response schema', async () => {
        const groupId = await getCouponGroupId(apiClient);
        const createRes = await apiClient.post(
            '/api/coupon',
            dataFactory.generateCouponPayload(groupId),
            { multipart: true }
        );
        expect(createRes.ok).toBeTruthy();
        const coupon = Array.isArray(createRes.body.data) ? createRes.body.data[0] : createRes.body.data;
        cleaner.register('coupon', coupon._id);

        const res = await apiClient.get(`/api/coupon/${coupon._id}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getCouponResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_CPN_004 GET /api/coupon/:id not found schema quirk @negative', async () => {
        // Quirk: GET not found retorna HTTP 200 con status: ERROR, data: null
        const res = await apiClient.get('/api/coupon/000000000000000000000000');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBeNull();

        const parsed = errorResponseSchema.safeParse(res.body);
        expect(parsed.success, `Error schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

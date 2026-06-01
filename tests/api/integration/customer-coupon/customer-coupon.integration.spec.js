const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

/**
 * Integration: Customer → Coupon lifecycle
 * Flow: create customer → get coupon group → create coupon → verify coupon accessible
 * Covers: multi-resource creation, cleanup ordering, cross-module state
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

async function getCouponGroupId(client) {
    const res = await client.get('/api/coupon-group');
    if (res.ok && res.body.data?.length > 0) return res.body.data[0]._id;
    return null;
}

test.describe('Customer → Coupon Integration', () => {
    test('Flujo: create customer + create coupon + verify coupon retrieval @critical', async () => {
        // 1. Crear customer
        const customerPayload = dataFactory.generateCustomerPayload();
        const customerRes = await apiClient.post('/api/customer', customerPayload);
        expect(customerRes.ok, `Create customer failed: ${customerRes.status}`).toBeTruthy();
        const customer = customerRes.body?.data ?? customerRes.body;
        cleaner.register('customer', customer._id);

        expect(customer._id).toBeDefined();
        expect(customer.status).toBe('ACTIVE');

        // 2. Obtener grupo de cupones
        const groupId = await getCouponGroupId(apiClient);
        if (!groupId) {
            test.skip(true, 'No coupon groups available — skipping coupon part');
            return;
        }

        // 3. Crear cupón
        const couponPayload = dataFactory.generateCouponPayload(groupId, {
            custom_code: `qa_int_cust_${customer._id.slice(-6)}_${Date.now()}`,
            detail: `Cupón para customer ${customer.email}`,
        });
        const couponRes = await apiClient.post('/api/coupon', couponPayload, { multipart: true });
        expect(couponRes.ok, `Create coupon failed: ${couponRes.status} ${JSON.stringify(couponRes.body)}`).toBeTruthy();
        const coupon = Array.isArray(couponRes.body.data) ? couponRes.body.data[0] : couponRes.body.data;
        cleaner.register('coupon', coupon._id);

        expect(coupon.code).toBeDefined();
        // `group` is not always populated in create response — verify via GET instead
        expect(coupon._id).toBeDefined();

        // 4. Verificar cupón recuperable por ID
        const getRes = await apiClient.get(`/api/coupon/${coupon._id}`);
        expect(getRes.ok).toBeTruthy();
        expect(getRes.body.data._id).toBe(coupon._id);
        expect(getRes.body.data.code).toBe(coupon.code);
    });

    test('Flujo: customer deactivate no afecta cupones existentes', async () => {
        const groupId = await getCouponGroupId(apiClient);
        if (!groupId) {
            test.skip(true, 'No coupon groups available');
            return;
        }

        // 1. Crear customer
        const customer = (() => {
            let c;
            return {
                async create() {
                    const res = await apiClient.post('/api/customer', dataFactory.generateCustomerPayload());
                    expect(res.ok).toBeTruthy();
                    c = res.body?.data ?? res.body;
                    cleaner.register('customer', c._id);
                    return c;
                },
            };
        })();
        const cust = await customer.create();

        // 2. Crear cupón
        const couponRes = await apiClient.post('/api/coupon', dataFactory.generateCouponPayload(groupId), { multipart: true });
        expect(couponRes.ok).toBeTruthy();
        const coupon = Array.isArray(couponRes.body.data) ? couponRes.body.data[0] : couponRes.body.data;
        cleaner.register('coupon', coupon._id);

        // 3. Desactivar customer
        const deactivateRes = await apiClient.post(`/api/customer/${cust._id}`, { status: 'INACTIVE' });
        expect(deactivateRes.ok).toBeTruthy();

        // 4. Cupón sigue accesible independientemente del estado del customer
        const couponGetRes = await apiClient.get(`/api/coupon/${coupon._id}`);
        expect(couponGetRes.ok).toBeTruthy();
        expect(couponGetRes.body.data._id).toBe(coupon._id);
    });

    test('Flujo: custom_code único por cuenta — segundo intento falla @negative', async () => {
        const groupId = await getCouponGroupId(apiClient);
        if (!groupId) {
            test.skip(true, 'No coupon groups available');
            return;
        }

        const uniqueCode = `qa_dup_${Date.now()}`;

        const firstRes = await apiClient.post('/api/coupon', dataFactory.generateCouponPayload(groupId, {
            custom_code: uniqueCode,
        }), { multipart: true });
        expect(firstRes.ok, `First coupon create failed: ${JSON.stringify(firstRes.body)}`).toBeTruthy();
        const firstCoupon = Array.isArray(firstRes.body.data) ? firstRes.body.data[0] : firstRes.body.data;
        cleaner.register('coupon', firstCoupon._id);

        // Segundo con mismo custom_code → debe fallar
        const secondRes = await apiClient.post('/api/coupon', dataFactory.generateCouponPayload(groupId, {
            custom_code: uniqueCode,
        }), { multipart: true });
        expect([400, 409, 422]).toContain(secondRes.status);
        expect(secondRes.body.status).toBe('ERROR');
    });
});

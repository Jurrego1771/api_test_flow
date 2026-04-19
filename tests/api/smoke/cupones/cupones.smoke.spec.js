const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');

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
    throw new Error('No coupon groups available');
}

async function createCoupon(client, groupId, overrides = {}) {
    const payload = {
        group: groupId,
        name: 'unico',
        is_reusable: 'true',
        custom_code: `test${Date.now()}`,
        discount_type: 'percent',
        max_use: '10',
        customer_max_use: '2',
        detail: 'Cupón de prueba automática',
        quantity: '100',
        percent: '4',
        payment_required: 'false',
        ...overrides,
    };
    const res = await client.post('/api/coupon', payload, { multipart: true });
    if (!res.ok) throw new Error(`createCoupon failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    const coupon = Array.isArray(raw) ? raw[0] : raw;
    coupon.custom_code = payload.custom_code;
    return coupon;
}

test.describe('Cupones - Smoke', () => {
    test('TC-001: GET lista básica retorna OK y array', async () => {
        // Intent: validar contrato base del listado de cupones.
        const res = await apiClient.get('/api/coupon');

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC-003: Validar estructura de datos del listado', async () => {
        const res = await apiClient.get('/api/coupon');

        expect(res.ok).toBeTruthy();
        if (res.body.data.length > 0) {
            const sample = res.body.data[0];
            expect(sample).toHaveProperty('_id');
            expect(sample).toHaveProperty('group');
            expect(sample).toHaveProperty('code');
            expect(sample).toHaveProperty('date_created');
        }
    });

    test('TC-010: Obtener cupón por ID', async () => {
        // Intent: validar GET por ID retorna el recurso correcto.
        const groupId = await getCouponGroupId(apiClient);
        const coupon = await createCoupon(apiClient, groupId);
        cleaner.register('coupon', coupon._id);

        const res = await apiClient.get(`/api/coupon/${coupon._id}`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(res.body.data._id).toBe(coupon._id);
        expect(res.body.data).toHaveProperty('code');
    });

    test('TC-006: Crear cupón no reutilizable', async () => {
        // Intent: happy path de creación de cupón.
        const groupId = await getCouponGroupId(apiClient);
        const coupon = await createCoupon(apiClient, groupId, {
            is_reusable: 'false',
            custom_code: `qa-smoke-${Date.now()}`,
            max_use: '1',
            customer_max_use: '1',
            quantity: '1',
            percent: '10',
        });
        cleaner.register('coupon', coupon._id);

        expect(coupon).toHaveProperty('code');
        expect(coupon).toHaveProperty('_id');
    });

    test('TC-013: Error para cupón inexistente', async () => {
        // Intent: validar que ID inexistente retorna ERROR con data null.
        const res = await apiClient.get('/api/coupon/000000000000000000000000');

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe(null);
    });

    test('TC-012: Crear y eliminar cupón', async () => {
        // Intent: validar flujo de creación y eliminación.
        const groupId = await getCouponGroupId(apiClient);
        const coupon = await createCoupon(apiClient, groupId, {
            is_reusable: 'false',
            custom_code: `qa-del-${Date.now()}`,
            max_use: '1',
            customer_max_use: '1',
            quantity: '1',
            percent: '5',
        });

        const delRes = await apiClient.delete(`/api/coupon/${coupon._id}`);
        expect(delRes.ok).toBeTruthy();
        expect(delRes.body.status).toBe('OK');
    });
});

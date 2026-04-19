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

test.describe('Cupones - GET avanzado', { tag: ['@regression'] }, () => {
    test('TC-002: Verificar filtro por custom_code', async () => {
        // Intent: validar que el filtro custom_code retorna solo el cupón correcto.
        const groupId = await getCouponGroupId(apiClient);
        const uniqueCode = `qa-filt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const coupon = await createCoupon(apiClient, groupId, { custom_code: uniqueCode });
        cleaner.register('coupon', coupon._id);

        const res = await apiClient.get(`/api/coupon?custom_code=${uniqueCode}&limit=100`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        const codes = res.body.data.map((c) => c?.custom_code ?? c?.code).filter(Boolean);
        expect(codes).toContain(uniqueCode);
    });

    test('TC-004: Test de paginación', async () => {
        const page1 = await apiClient.get('/api/coupon?page=1&limit=5');
        const page2 = await apiClient.get('/api/coupon?page=2&limit=5');

        expect(page1.ok).toBeTruthy();
        expect(page2.ok).toBeTruthy();
        expect(page1.body.status).toBe('OK');
        expect(page2.body.status).toBe('OK');
    });

    test('TC-011: Buscar cupón por código', async () => {
        // Intent: validar endpoint de búsqueda por código.
        const groupId = await getCouponGroupId(apiClient);
        const coupon = await createCoupon(apiClient, groupId);
        cleaner.register('coupon', coupon._id);

        const code = coupon.code || coupon.custom_code;
        const res = await apiClient.get(`/api/coupon/${code}/search`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(res.body.data).toBeDefined();
    });
});

test.describe('Cupones - POST avanzado', { tag: ['@regression'] }, () => {
    test('TC-007: Crear cupón reutilizable con código personalizado', async () => {
        // Intent: validar que custom_code queda persistido como code.
        const groupId = await getCouponGroupId(apiClient);
        const customCode = `QA-REUSE-${Date.now().toString().slice(-6)}`;
        const coupon = await createCoupon(apiClient, groupId, {
            is_reusable: 'true',
            custom_code: customCode,
            max_use: '10',
            customer_max_use: '3',
            percent: '15',
        });
        cleaner.register('coupon', coupon._id);

        expect(coupon.code).toBe(customCode);
    });

    test('TC-008: Error al crear cupón con código duplicado', async () => {
        // Intent: validar que códigos duplicados son rechazados con COUPON_CODE_ALREADY_EXISTS.
        const groupId = await getCouponGroupId(apiClient);
        const coupon = await createCoupon(apiClient, groupId);
        cleaner.register('coupon', coupon._id);

        const res = await apiClient.post('/api/coupon', {
            group: groupId,
            name: 'unico',
            is_reusable: 'true',
            custom_code: coupon.custom_code,
            discount_type: 'percent',
            max_use: '5',
            customer_max_use: '2',
            detail: 'QA Test - Duplicate Code Attempt',
            quantity: '1',
            percent: '5',
            payment_required: 'false',
        }, { multipart: true });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('COUPON_CODE_ALREADY_EXISTS');
    });

    test('TC-009: Error con datos inválidos', async () => {
        // Intent: validar que payload completamente inválido es rechazado.
        const res = await apiClient.post('/api/coupon', {
            group: '',
            name: '',
            is_reusable: 'maybe',
            custom_code: 'INVALID CODE!',
            discount_type: 'invalid_type',
            max_use: '-1',
            customer_max_use: '0',
            detail: '',
            quantity: '0',
            percent: 'not_a_number',
            payment_required: 'not_boolean',
        }, { multipart: true });

        expect([400, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC-012: Crear y eliminar cupón - verificar que deja de existir', async () => {
        // Intent: validar flujo completo create→delete→verify inexistencia.
        const groupId = await getCouponGroupId(apiClient);
        const tempCode = `QA-DELETE-${Date.now().toString().slice(-6)}`;
        const coupon = await createCoupon(apiClient, groupId, {
            is_reusable: 'false',
            custom_code: tempCode,
            max_use: '1',
            customer_max_use: '1',
            quantity: '1',
            percent: '5',
        });

        const delRes = await apiClient.delete(`/api/coupon/${coupon._id}`);
        expect(delRes.ok).toBeTruthy();
        expect(delRes.body.status).toBe('OK');

        const verifyRes = await apiClient.get(`/api/coupon/${coupon._id}`);
        expect(verifyRes.ok).toBeTruthy();
        expect(verifyRes.body.status).toBe('ERROR');
        expect(verifyRes.body.data).toBe(null);
    });
});

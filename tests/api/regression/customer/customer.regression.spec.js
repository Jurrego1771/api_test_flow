const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const { faker } = require('@faker-js/faker');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createCustomer(client, cleanerRef, overrides = {}) {
    const payload = dataFactory.generateCustomerPayload(overrides);
    const res = await client.post('/api/customer', payload);
    if (!res.ok) throw new Error(`createCustomer failed: ${res.status} ${JSON.stringify(res.body)}`);
    const customer = res.body?.data ?? res.body;
    cleanerRef.register('customer', customer._id);
    return { customer, payload };
}

test.describe('Customer — Regression', () => {
    test('TC_CUS_REG_001_POST_Create_WeakPassword', async () => {
        // CUS-003: contraseña débil — API puede aceptar o rechazar
        const res = await apiClient.post('/api/customer', {
            email: `qa_weak_${faker.random.alphaNumeric(8)}@example.com`,
            password: '123',
            first_name: 'qa_weak',
            last_name: 'qa_weak',
        });
        // Documenting actual behavior — no assertion on specific status
        if (res.ok) {
            const customer = res.body?.data ?? res.body;
            cleaner.register('customer', customer._id);
        }
        expect([200, 400]).toContain(res.status);
    });

    test('TC_CUS_REG_002_POST_Update_StatusCycle', async () => {
        // CUS-008: ciclo ACTIVE → INACTIVE → ACTIVE
        const { customer } = await createCustomer(apiClient, cleaner);

        const deactivateRes = await apiClient.post(`/api/customer/${customer._id}`, { status: 'INACTIVE' });
        expect(deactivateRes.ok).toBeTruthy();
        const deactivated = deactivateRes.body?.data ?? deactivateRes.body;
        expect(deactivated.status).toBe('INACTIVE');

        const reactivateRes = await apiClient.post(`/api/customer/${customer._id}`, { status: 'ACTIVE' });
        expect(reactivateRes.ok).toBeTruthy();
        const reactivated = reactivateRes.body?.data ?? reactivateRes.body;
        expect(reactivated.status).toBe('ACTIVE');
    });

    test('TC_CUS_REG_003_GET_Filter_Email_Exact', async () => {
        // CUS-012: filtro por email exacto vs parcial
        const { customer, payload } = await createCustomer(apiClient, cleaner);

        // Exact match
        const exactRes = await apiClient.get(`/api/customer?email=${encodeURIComponent(payload.email)}`);
        expect(exactRes.ok).toBeTruthy();
        expect(exactRes.body.data.some(c => c._id === customer._id)).toBe(true);

        // Partial match (first 5 chars) — behavior may vary
        const partialEmail = payload.email.slice(0, 5);
        const partialRes = await apiClient.get(`/api/customer?email=${encodeURIComponent(partialEmail)}`);
        expect(partialRes.ok).toBeTruthy();
        expect(Array.isArray(partialRes.body.data)).toBe(true);
    });

    test('TC_CUS_REG_004_POST_Create_NoToken @negative', async ({ playwright }) => {
        const ctx = await playwright.request.newContext({ baseURL: process.env.BASE_URL });
        try {
            const res = await ctx.post('/api/customer', {
                data: dataFactory.generateCustomerPayload(),
            });
            expect([401, 403]).toContain(res.status());
        } finally {
            await ctx.dispose();
        }
    });

    test('TC_CUS_REG_005_POST_Update_AllOptionalFields', async () => {
        // Actualizar campos opcionales persiste correctamente
        const { customer } = await createCustomer(apiClient, cleaner);

        const res = await apiClient.post(`/api/customer/${customer._id}`, {
            first_name: `qa_fn_${faker.random.alphaNumeric(6)}`,
            last_name: `qa_ln_${faker.random.alphaNumeric(6)}`,
            gender: 'MALE',
        });
        expect(res.ok).toBeTruthy();
        const updated = res.body?.data ?? res.body;
        expect(updated.gender).toBe('MALE');
    });

    test('TC_CUS_REG_006_GET_Pagination_Stable', async () => {
        // Paginación estable entre dos requests consecutivos
        const res1 = await apiClient.get('/api/customer?limit=5&skip=0');
        const res2 = await apiClient.get('/api/customer?limit=5&skip=0');
        expect(res1.ok).toBeTruthy();
        expect(res2.ok).toBeTruthy();
        expect(res2.body.data.length).toBe(res1.body.data.length);
    });

    test('TC_CUS_REG_007_POST_Create_SpecialCharsInName', async () => {
        // Nombres con caracteres especiales (acentos, ñ)
        const res = await apiClient.post('/api/customer', dataFactory.generateCustomerPayload({
            first_name: 'José',
            last_name: 'Muñoz',
        }));
        expect(res.ok).toBeTruthy();
        const customer = res.body?.data ?? res.body;
        cleaner.register('customer', customer._id);

        // Verify persistence
        const getRes = await apiClient.get(`/api/customer?id=${customer._id}`);
        expect(getRes.ok).toBeTruthy();
        expect(getRes.body.data[0].first_name).toBe('José');
    });
});

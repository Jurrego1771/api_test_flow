const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const { customerSchema, customerListResponseSchema } = require('../../../../schemas/customer.schema');
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

test.describe('Customer — Contract', () => {
    test('TC_CON_CUS_001 POST /api/customer response schema', async () => {
        const payload = dataFactory.generateCustomerPayload();
        const res = await apiClient.post('/api/customer', payload);

        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const customer = res.body?.data ?? res.body;
        cleaner.register('customer', customer._id);

        const parsed = customerSchema.safeParse(customer);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_CUS_002 GET /api/customer list response schema', async () => {
        const res = await apiClient.get('/api/customer');
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = customerListResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_CUS_003 GET /api/customer?id=:id response schema', async () => {
        const payload = dataFactory.generateCustomerPayload();
        const createRes = await apiClient.post('/api/customer', payload);
        expect(createRes.ok).toBeTruthy();
        const customer = createRes.body?.data ?? createRes.body;
        cleaner.register('customer', customer._id);

        const res = await apiClient.get(`/api/customer?id=${customer._id}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = customerListResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
        expect(res.body.data[0]._id).toBe(customer._id);
    });

    test('TC_CON_CUS_004 POST /api/customer duplicate email error schema @negative', async () => {
        const payload = dataFactory.generateCustomerPayload();
        const createRes = await apiClient.post('/api/customer', payload);
        expect(createRes.ok).toBeTruthy();
        const customer = createRes.body?.data ?? createRes.body;
        cleaner.register('customer', customer._id);

        const dupRes = await apiClient.post('/api/customer', payload);
        expect(dupRes.status).toBe(400);

        const parsed = errorResponseSchema.safeParse(dupRes.body);
        expect(parsed.success, `Error schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
        expect(dupRes.body.data).toBe('EMAIL_ALREADY_REGISTERED');
    });

    test('TC_CON_CUS_005 POST /api/customer/:id update response schema', async () => {
        const payload = dataFactory.generateCustomerPayload();
        const createRes = await apiClient.post('/api/customer', payload);
        expect(createRes.ok).toBeTruthy();
        const customer = createRes.body?.data ?? createRes.body;
        cleaner.register('customer', customer._id);

        const res = await apiClient.post(`/api/customer/${customer._id}`, {
            first_name: `qa_updated_${Date.now()}`,
        });
        expect(res.ok, `Update failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const updated = res.body?.data ?? res.body;
        const parsed = customerSchema.safeParse(updated);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

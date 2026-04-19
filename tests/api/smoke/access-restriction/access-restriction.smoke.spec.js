const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');

const AR_ENDPOINT = '/api/settings/advanced-access-restrictions';

let apiClient;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
});

test.describe('Access Restrictions - Smoke', { tag: ['@smoke'] }, () => {
    test('TC_AR_001_GET_ListAllRestrictions', async () => {
        // Intent: validar que el endpoint de listado retorna contrato base.
        const res = await apiClient.get(AR_ENDPOINT);

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('TC_AR_NEG_010_GET_NonExistentRestriction', async () => {
        // Intent: validar que ID inexistente retorna error esperado.
        const res = await apiClient.get(`${AR_ENDPOINT}/507f1f77bcf86cd799439011`);
        expect([404, 500]).toContain(res.status);
    });

    test('TC_AR_NEG_011_GET_InvalidIdFormat', async () => {
        const res = await apiClient.get(`${AR_ENDPOINT}/not-a-valid-id`);
        expect([400, 404, 500]).toContain(res.status);
    });
});

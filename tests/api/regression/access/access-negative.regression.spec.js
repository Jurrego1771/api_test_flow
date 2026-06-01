const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');

/**
 * Access Token — Negative Regression
 * Covers: IP validation boundaries, time_limit edge cases, max_profile invalid values
 * Complements: access-token.smoke.spec.js (which covers auth, type, missing id)
 */

const ISSUE_ENDPOINT = '/api/access/issue';

let apiClient;
let mediaId;

test.beforeAll(async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
        baseURL: process.env.BASE_URL,
        extraHTTPHeaders: { 'X-API-Token': process.env.API_TOKEN },
    });
    const res = await ctx.get('/api/media?limit=1&is_published=true');
    const body = await res.json();
    mediaId = body.data?.[0]?._id ?? null;
    await ctx.dispose();
});

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
});

test.describe('Access Token — Negative & Boundary Regression', () => {

    test('TC_ACC_REG_001_POST_InvalidIpFormat @negative', async () => {
        // ACC-RISK-002: IP en formato inválido debe rechazarse o ignorarse
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&ip=not.valid.ip`,
            {}
        );
        // API may accept (ignores ip param) or reject — must not 500
        expect([200, 400, 401]).toContain(res.status);
        expect(res.body.status).not.toBe(undefined);
    });

    test('TC_ACC_REG_002_POST_IpZeroZeroZeroZero @boundary', async () => {
        // Boundary: IP 0.0.0.0 — válido sintácticamente pero raro
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&ip=0.0.0.0`,
            {}
        );
        expect([200, 400]).toContain(res.status);
    });

    test('TC_ACC_REG_003_POST_TimeLimitZero @boundary', async () => {
        // Boundary: time_limit:0 — sin expiración o rechazado
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&time_limit=0`,
            {}
        );
        // 0 puede significar "sin límite" o ser inválido — documentar
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            expect(res.body.message).toBe('ACCESS_TOKEN_ISSUED');
        }
    });

    test('TC_ACC_REG_004_POST_TimeLimitNegative @negative @boundary', async () => {
        // time_limit negativo — debe rechazarse
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&time_limit=-300`,
            {}
        );
        // Negative time limit should either fail or be ignored
        expect([200, 400, 401]).toContain(res.status);
        expect(res.body.status).not.toBe(undefined);
    });

    test('TC_ACC_REG_005_POST_InvalidMaxProfile @negative', async () => {
        // max_profile con valor inválido — debe rechazarse o ignorarse
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&max_profile=99999p`,
            {}
        );
        expect([200, 400]).toContain(res.status);
        if (res.status === 200) {
            // Token issued but max_profile constraint may be silently ignored
            expect(res.body.message).toBe('ACCESS_TOKEN_ISSUED');
        }
    });

    test('TC_ACC_REG_006_POST_NonExistentMediaId @negative', async () => {
        // Token para media no existente → error
        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=000000000000000000000000&type=media`,
            {}
        );
        expect([400, 401, 404]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_ACC_REG_007_POST_VeryLongIpString @negative @boundary', async () => {
        // IP string muy largo — no debe producir 500
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const longIp = '1'.repeat(500);
        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&ip=${longIp}`,
            {}
        );
        expect(res.status).not.toBe(500);
        expect([200, 400, 401]).toContain(res.status);
    });

    test('TC_ACC_REG_008_POST_TypeLiveWithMediaId_Mismatch @negative', async () => {
        // type:live con ID de media → comportamiento definido
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=live`,
            {}
        );
        // May return error or issue a token — must not 500
        expect([200, 400, 401, 404]).toContain(res.status);
        expect(res.status).not.toBe(500);
    });

    test('TC_ACC_REG_009_POST_TimeLimitVeryLarge @boundary', async () => {
        // time_limit extremadamente grande — no debe producir 500
        if (!mediaId) { test.skip(true, 'No published media available'); return; }

        const res = await apiClient.post(
            `${ISSUE_ENDPOINT}?id=${mediaId}&type=media&time_limit=999999999`,
            {}
        );
        expect([200, 400]).toContain(res.status);
        expect(res.status).not.toBe(500);
    });
});

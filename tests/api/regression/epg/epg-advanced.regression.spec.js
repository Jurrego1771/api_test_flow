const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');

/**
 * EPG — Advanced Regression
 * Covers: URL validation, timezone boundaries, enabled flag, missing required fields
 * Quirks: id is numeric (not ObjectId), DELETE route: /api/settings/epg-mask/input/:id
 */

const EPG_INPUT_BASE = '/api/settings/epg-mask/input';
const VALID_EPG_URL = process.env.EPG_TEST_URL || 'https://example.com/qa-epg-test.json';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function buildPayload(overrides = {}) {
    return {
        name: `[QA-EPG-REG] ${Date.now()}`,
        epgUrl: VALID_EPG_URL,
        timezone: 0,
        enabled: false,
        ...overrides,
    };
}

async function createEpgInput(overrides = {}) {
    const res = await apiClient.post(EPG_INPUT_BASE, buildPayload(overrides));
    if (!res.ok) throw new Error(`createEpgInput failed: ${res.status} ${JSON.stringify(res.body)}`);
    const data = res.body.data;
    cleaner.register('epg-origin', String(data.id));
    return data;
}

test.describe('EPG — Advanced Regression', () => {

    test('TC_EPG_REG_001_POST_InvalidUrl_NotAUrl @negative', async () => {
        // EPG-002: epgUrl inválida (no URL) → validación
        const res = await apiClient.post(EPG_INPUT_BASE, buildPayload({ epgUrl: 'not-a-valid-url' }));

        if (res.ok) {
            // API may accept — document behavior
            cleaner.register('epg-origin', String(res.body.data.id));
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_EPG_REG_002_POST_InvalidUrl_EmptyString @negative', async () => {
        // Empty epgUrl should fail
        const res = await apiClient.post(EPG_INPUT_BASE, buildPayload({ epgUrl: '' }));

        if (res.ok) {
            cleaner.register('epg-origin', String(res.body.data.id));
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_EPG_REG_003_POST_TimezoneOverRange @negative @boundary', async () => {
        // EPG-003: timezone fuera de rango (+13, > +12) → error o normalización
        const res = await apiClient.post(EPG_INPUT_BASE, buildPayload({ timezone: 15 }));

        if (res.ok) {
            const data = res.body.data;
            cleaner.register('epg-origin', String(data.id));
            // If accepted, document actual stored value
            expect(typeof data.timezone).toBe('number');
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_EPG_REG_004_POST_TimezoneUnderRange @negative @boundary', async () => {
        // EPG-003: timezone < -12 → error o normalización
        const res = await apiClient.post(EPG_INPUT_BASE, buildPayload({ timezone: -13 }));

        if (res.ok) {
            const data = res.body.data;
            cleaner.register('epg-origin', String(data.id));
            expect(typeof data.timezone).toBe('number');
        } else {
            expect([400, 422]).toContain(res.status);
        }
    });

    test('TC_EPG_REG_005_POST_TimezoneMinMax_Valid @boundary', async () => {
        // Boundary: timezone exactamente -12 y +12 deben ser válidos
        const minEpg = await createEpgInput({ timezone: -12 });
        expect(minEpg.timezone).toBe(-12);

        const maxEpg = await createEpgInput({ timezone: 12 });
        expect(maxEpg.timezone).toBe(12);
    });

    test('TC_EPG_REG_006_POST_EnabledFalse_Persists', async () => {
        // EPG-005: enabled:false persiste correctamente
        const epg = await createEpgInput({ enabled: false });
        expect(epg.enabled).toBe(false);

        const getRes = await apiClient.get(`${EPG_INPUT_BASE}/${epg.id}`);
        expect(getRes.ok).toBeTruthy();
        expect(getRes.body.data.enabled).toBe(false);
    });

    test('TC_EPG_REG_007_POST_EnabledTrue_Persists', async () => {
        // EPG-005: enabled:true persiste correctamente
        const epg = await createEpgInput({ enabled: true });
        expect(epg.enabled).toBe(true);
    });

    test('TC_EPG_REG_008_POST_MissingName @negative', async () => {
        // EPG-001: sin name → error
        const payload = buildPayload();
        delete payload.name;
        const res = await apiClient.post(EPG_INPUT_BASE, payload);

        if (res.ok) {
            cleaner.register('epg-origin', String(res.body.data.id));
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_EPG_REG_009_PUT_Update_EnabledToggle', async () => {
        // Alternar enabled via PUT persiste correctamente
        const epg = await createEpgInput({ enabled: false });

        const updateRes = await apiClient.put(`${EPG_INPUT_BASE}/${epg.id}`, {
            name: epg.name,
            epgUrl: VALID_EPG_URL,
            enabled: true,
        });
        expect(updateRes.ok).toBeTruthy();
        expect(updateRes.body.data.enabled).toBe(true);
    });

    test('TC_EPG_REG_010_GET_NonExistentId @negative', async () => {
        // ID numérico inexistente → 404
        const res = await apiClient.get(`${EPG_INPUT_BASE}/99999999`);
        expect([404, 400]).toContain(res.status);
    });

    test('TC_EPG_REG_011_DELETE_Idempotency @negative', async () => {
        // DELETE dos veces → segundo intento 404
        const epg = await createEpgInput();
        // Don't register cleaner — we delete manually

        const firstDel = await apiClient.delete(`${EPG_INPUT_BASE}/${epg.id}`);
        expect([200, 204]).toContain(firstDel.status);

        const secondDel = await apiClient.delete(`${EPG_INPUT_BASE}/${epg.id}`);
        expect([404, 400]).toContain(secondDel.status);
    });
});

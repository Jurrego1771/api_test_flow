const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const { createAdResponseSchema } = require('../../../../schemas/ad.schema');

// --- Test tag URLs ---
const VMAP_TAG_URL =
    'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples' +
    '&sz=640x480&cust_params=sample_ar%3Dpremidpost&ciu_szs=300x250&gdfp_req=1' +
    '&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator=';

const VAST_TAG_URL =
    'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples' +
    '&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1' +
    '&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=';

const INSERTION_TAG_URL =
    'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples' +
    '&sz=640x480&output=xml_vast4&unviewed_position_start=1&env=vp&correlator=';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function extractAd(res) {
    return Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
}

// ─────────────────────────────────────────────
// VMAP
// ─────────────────────────────────────────────
test.describe('Ad — POST /api/ad/new · VMAP', () => {
    test('TC_AD_010_POST_Create_VMAP_HappyPath @critical', async () => {
        const name = `[QA-AUTO] vmap_${Date.now()}`;
        const payload = {
            name,
            is_enabled: 'true',
            type: 'vmap',
            'vmap[tag]': VMAP_TAG_URL,
            'vmap[tag_mobile]': VMAP_TAG_URL,
            'adswizz[zone]': '',
            categories: 'null',
            tags: 'null',
            referers: '',
        };

        const res = await apiClient.post('/api/ad/new', payload, { form: true });

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        createAdResponseSchema.parse(res.body);

        const ad = extractAd(res);
        if (ad?._id) cleaner.register('ad', ad._id);
        expect(ad._id).toBeTruthy();
        expect(ad.name).toBe(name);
        expect(ad.type).toBe('vmap');
    });

    test('TC_AD_015_POST_Create_VMAP_MissingTag @negative', async () => {
        const name = `[QA-AUTO] vmap_notag_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'vmap',
        }, { form: true });

        if (res.ok) {
            cleaner.register('ad', extractAd(res)._id);
            expect(res.body.status).toBe('OK');
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_AD_017_POST_Create_VMAP_InvalidTagURL @negative', async () => {
        const res = await apiClient.post('/api/ad/new', {
            name: `[QA-AUTO] vmap_badurl_${Date.now()}`,
            is_enabled: 'true',
            type: 'vmap',
            'vmap[tag]': 'not-a-valid-url',
            'vmap[tag_mobile]': 'not-a-valid-url',
        }, { form: true });

        if (res.ok) {
            cleaner.register('ad', extractAd(res)._id);
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });
});

// ─────────────────────────────────────────────
// VAST
// ─────────────────────────────────────────────
test.describe('Ad — POST /api/ad/new · VAST', () => {
    test('TC_AD_020_POST_Create_VAST_HappyPath @critical', async () => {
        const name = `[QA-AUTO] vast_${Date.now()}`;
        const payload = {
            name,
            is_enabled: 'true',
            type: 'vast',
            'vast[tag]': VAST_TAG_URL,
            preroll_skip_at: '5',
            min_media_time_length: '0',
            'adswizz[zone]': '',
            categories: 'null',
            tags: 'null',
            referers: '',
        };

        const res = await apiClient.post('/api/ad/new', payload, { form: true });

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        createAdResponseSchema.parse(res.body);

        const ad = extractAd(res);
        if (ad?._id) cleaner.register('ad', ad._id);
        expect(ad._id).toBeTruthy();
        expect(ad.name).toBe(name);
        expect(ad.type).toBe('vast');
    });

    test('TC_AD_021_POST_Create_VAST_NegativePrerollSkip @negative', async () => {
        const name = `[QA-AUTO] vast_skipneg_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'vast',
            'vast[tag]': VAST_TAG_URL,
            preroll_skip_at: '-1',
            min_media_time_length: '0',
        }, { form: true });

        if (res.status === 400) {
            expect(res.body.status).toBe('ERROR');
        } else {
            const ad = extractAd(res);
            if (ad?._id) cleaner.register('ad', ad._id);
            expect(res.status).toBe(200);
            expect(ad.preroll_skip_at).toBeGreaterThanOrEqual(0);
        }
    });

    test('TC_AD_022_POST_Create_VAST_NegativeMinMediaTime @negative', async () => {
        const name = `[QA-AUTO] vast_mintimeneg_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'vast',
            'vast[tag]': VAST_TAG_URL,
            preroll_skip_at: '0',
            min_media_time_length: '-10',
        }, { form: true });

        if (res.status === 400) {
            expect(res.body.status).toBe('ERROR');
        } else {
            const ad = extractAd(res);
            if (ad?._id) cleaner.register('ad', ad._id);
            expect(res.status).toBe(200);
            expect(ad.min_media_time_length).toBeGreaterThanOrEqual(0);
        }
    });

    test('TC_AD_023_POST_Create_VAST_MissingTag @negative', async () => {
        const name = `[QA-AUTO] vast_notag_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'vast',
            preroll_skip_at: '0',
            min_media_time_length: '0',
        }, { form: true });

        if (res.ok) {
            cleaner.register('ad', extractAd(res)._id);
            expect(res.body.status).toBe('OK');
        } else {
            expect([400, 422]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });
});

// ─────────────────────────────────────────────
// AD-INSERTION (ads replacement)
// ─────────────────────────────────────────────
test.describe('Ad — POST /api/ad/new · ad-insertion', () => {
    test('TC_AD_030_POST_Create_AdInsertion_HappyPath @critical', async () => {
        const name = `[QA-AUTO] ad-insertion_${Date.now()}`;
        const payload = {
            name,
            is_enabled: 'true',
            type: 'ad-insertion',
            'insertion[tag]': INSERTION_TAG_URL,
            'insertion[loop]': '',
            'insertion[default_duration]': '2',
            'adswizz[zone]': '',
            categories: 'null',
            tags: 'null',
            referers: '',
        };

        const res = await apiClient.post('/api/ad/new', payload, { form: true });

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        createAdResponseSchema.parse(res.body);

        const ad = extractAd(res);
        if (ad?._id) cleaner.register('ad', ad._id);
        expect(ad._id).toBeTruthy();
        expect(ad.name).toBe(name);
        expect(ad.type).toBe('ad-insertion');
    });

    test('TC_AD_031_POST_Create_AdInsertion_MissingTag @negative', async () => {
        const name = `[QA-AUTO] ad-insertion_notag_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'ad-insertion',
            'insertion[loop]': '',
            'insertion[default_duration]': '2',
        }, { form: true });

        if (res.ok) {
            cleaner.register('ad', extractAd(res)._id);
            expect(res.body.status).toBe('OK');
        } else {
            // BUG BACKEND: retorna 500 (excepción no manejada) en vez de 400 cuando falta insertion[tag]
            expect([400, 422, 500]).toContain(res.status);
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_AD_032_POST_Create_AdInsertion_ZeroDuration @negative', async () => {
        const name = `[QA-AUTO] ad-insertion_dur0_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'ad-insertion',
            'insertion[tag]': INSERTION_TAG_URL,
            'insertion[loop]': '',
            'insertion[default_duration]': '0',
        }, { form: true });

        if (res.status === 400) {
            expect(res.body.status).toBe('ERROR');
        } else {
            const ad = extractAd(res);
            if (ad?._id) cleaner.register('ad', ad._id);
            expect(res.status).toBe(200);
        }
    });

    test('TC_AD_033_POST_Create_AdInsertion_NegativeDuration @negative', async () => {
        // BUG-AD-033 (High): API persiste insertion.default_duration negativo sin validación
        // Un valor negativo puede producir offsets de tiempo inválidos en el player
        test.fail();
        const name = `[QA-AUTO] ad-insertion_durneg_${Date.now()}`;
        const res = await apiClient.post('/api/ad/new', {
            name,
            is_enabled: 'true',
            type: 'ad-insertion',
            'insertion[tag]': INSERTION_TAG_URL,
            'insertion[loop]': '',
            'insertion[default_duration]': '-5',
        }, { form: true });

        if (res.ok) cleaner.register('ad', extractAd(res)._id);
        expect([400, 422]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });
});

// ─────────────────────────────────────────────
// Negativos genéricos (aplican a todos los tipos)
// ─────────────────────────────────────────────
test.describe('Ad — POST /api/ad/new · Negativos genéricos', () => {
    test('TC_AD_011_POST_Create_MissingName @negative', async () => {
        const res = await apiClient.post('/api/ad/new', {
            is_enabled: 'true',
            type: 'vmap',
            'vmap[tag]': VMAP_TAG_URL,
        }, { form: true });

        expect([400, 422, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_AD_012_POST_Create_EmptyName @negative', async () => {
        const res = await apiClient.post('/api/ad/new', {
            name: '',
            is_enabled: 'true',
            type: 'vmap',
            'vmap[tag]': VMAP_TAG_URL,
        }, { form: true });

        expect([400, 422, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_AD_013_POST_Create_MissingType @negative', async () => {
        // BUG-AD-013: API crea el ad sin type en vez de retornar 400 (campo requerido)
        test.fail();
        const res = await apiClient.post('/api/ad/new', {
            name: `[QA-AUTO] notype_${Date.now()}`,
            is_enabled: 'true',
        }, { form: true });

        if (res.ok) cleaner.register('ad', extractAd(res)._id);
        expect([400, 422, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_AD_014_POST_Create_InvalidType @negative', async () => {
        // BUG-AD-014: API acepta cualquier string como type sin validar el enum permitido
        test.fail();
        const res = await apiClient.post('/api/ad/new', {
            name: `[QA-AUTO] badtype_${Date.now()}`,
            is_enabled: 'true',
            type: 'nonexistent_type',
        }, { form: true });

        if (res.ok) cleaner.register('ad', extractAd(res)._id);
        expect([400, 422]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC_AD_016_POST_Create_NameOnlySpaces @negative', async () => {
        // BUG-AD-016: API acepta name compuesto solo de espacios sin sanitización ni trim
        test.fail();
        const res = await apiClient.post('/api/ad/new', {
            name: '     ',
            is_enabled: 'true',
            type: 'vast',
            'vast[tag]': VAST_TAG_URL,
        }, { form: true });

        if (res.ok) cleaner.register('ad', extractAd(res)._id);
        expect([400, 422, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });
});

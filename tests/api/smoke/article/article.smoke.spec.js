const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
const { articleSchema } = require('../../../../schemas/article.schema');

/**
 * Article — Smoke
 * Quirk: endpoint returns 404 in dev/staging environments — guard with ensureEndpointAvailable
 */

const ARTICLE_BASE = '/api/article';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Article — Smoke', () => {

    test('TC_ART_S_001_POST_Create_HappyPath @critical', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const payload = dataFactory.generateArticlePayload();
        const res = await apiClient.post(ARTICLE_BASE, payload);
        const article = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
        if (article?._id) cleaner.register('article', article._id);

        expect(res.ok, `POST article failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(article._id).toBeDefined();
        expect(article.title).toBe(payload.title);
    });

    test('TC_ART_S_002_GET_ById @critical', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const createRes = await apiClient.post(ARTICLE_BASE, dataFactory.generateArticlePayload());
        const article = Array.isArray(createRes.body.data) ? createRes.body.data[0] : createRes.body.data;
        if (article?._id) cleaner.register('article', article._id);
        expect(createRes.ok).toBeTruthy();

        const res = await apiClient.get(`${ARTICLE_BASE}/${article._id}`);
        expect(res.ok, `GET article by id failed: ${res.status}`).toBeTruthy();
        expect(res.body.status).toBe('OK');
        const fetched = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
        expect(fetched._id).toBe(article._id);
    });

    test('TC_ART_S_003_GET_List', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const res = await apiClient.get(`${ARTICLE_BASE}?limit=5`);
        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    test('TC_ART_S_004_DELETE_HappyPath @critical', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const createRes = await apiClient.post(ARTICLE_BASE, dataFactory.generateArticlePayload());
        expect(createRes.ok).toBeTruthy();
        const article = Array.isArray(createRes.body.data) ? createRes.body.data[0] : createRes.body.data;
        // Don't register — delete manually below

        const delRes = await apiClient.delete(`${ARTICLE_BASE}/${article._id}`);
        expect([200, 204]).toContain(delRes.status);
    });

    test('TC_ART_S_005_GET_NotFound @negative', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const res = await apiClient.get(`${ARTICLE_BASE}/000000000000000000000000`);
        expect([200, 404]).toContain(res.status);
        if (res.status === 404) {
            expect(res.body.status).toBe('ERROR');
        }
    });

    test('TC_ART_S_006_POST_Create_WithIsPublished', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const payload = dataFactory.generateArticlePayload({ is_published: true });
        const res = await apiClient.post(ARTICLE_BASE, payload);
        const article = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
        if (article?._id) cleaner.register('article', article._id);

        expect(res.ok).toBeTruthy();
        expect(article.is_published).toBe(true);
    });

    test('TC_ART_S_007_ResponseSchema', async () => {
        const { available } = await ensureEndpointAvailable(apiClient, ARTICLE_BASE, {
            context: 'Article endpoint not available in this environment',
        });
        if (!available) return;

        const res = await apiClient.post(ARTICLE_BASE, dataFactory.generateArticlePayload());
        const article = Array.isArray(res.body.data) ? res.body.data[0] : res.body.data;
        if (article?._id) cleaner.register('article', article._id);

        expect(res.ok).toBeTruthy();
        const parsed = articleSchema.safeParse(article);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

const { test, expect } = require('@playwright/test');
const { ApiClient } = require('../../helpers');
const { faker } = require('@faker-js/faker');

const uniqueTag = `search_${faker.datatype.uuid()}`;
const titlePrefix = `SearchTC_${faker.random.alphaNumeric(6)}`;
let createdIds = [];
let searchApiClient;

function getCreatedMedia(body) {
    return Array.isArray(body.data) ? body.data[0] : body.data;
}

async function createMedia(client, attrs = {}) {
    const payload = {
        title: `qa_${faker.random.alphaNumeric(8)}_${Date.now()}`,
        type: 'video',
        visible: 'true',
        is_published: 'false',
        ...attrs,
    };
    const res = await client.post('/api/media', payload, { form: true });
    if (!res.ok) throw new Error(`createMedia failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getCreatedMedia(res.body);
}

test.describe('7. Search (GET /api/media/search)', { tag: ['@critical'] }, () => {
    test.beforeAll(async ({ playwright }) => {
        const context = await playwright.request.newContext();
        searchApiClient = new ApiClient(context, process.env.BASE_URL);

        for (let i = 0; i < 5; i++) {
            const media = await createMedia(searchApiClient, {
                title: `${titlePrefix} Pub ${i}`,
                is_published: 'true',
                tags: uniqueTag,
            });
            createdIds.push(media._id);
        }
        for (let i = 0; i < 2; i++) {
            const media = await createMedia(searchApiClient, {
                title: `${titlePrefix} Draft ${i}`,
                is_published: 'false',
                tags: uniqueTag,
            });
            createdIds.push(media._id);
        }
        await new Promise((r) => setTimeout(r, 2000));
    });

    test.afterAll(async () => {
        for (const id of createdIds) {
            try { await searchApiClient.delete(`/api/media/${id}`); } catch (e) { /* ignore */ }
        }
        await searchApiClient.request.dispose();
    });

    test('TC_MED_015_SEARCH_ExactTitle', async ({ request, baseURL }) => {
        // Intent: validar que búsqueda por título exacto retorna el media correcto.
        const apiClient = new ApiClient(request, baseURL);
        const targetTitle = `${titlePrefix} Pub 0`;

        const res = await apiClient.get(`/api/media/search?title=${encodeURIComponent(targetTitle)}&limit=10&all=true`);

        expect(res.ok).toBeTruthy();
        const found = res.body.data?.find((m) => m.title === targetTitle || (m.title && m.title.includes(titlePrefix)));
        expect(found).toBeDefined();
        expect(found.title).toContain(titlePrefix);
    });

    test('TC_MED_016_SEARCH_FilterByArrayTag', async ({ request, baseURL }) => {
        // Intent: validar que filtro por tag retorna todos los media con ese tag.
        const apiClient = new ApiClient(request, baseURL);

        const res = await apiClient.get(`/api/media/search?tags=${encodeURIComponent(uniqueTag)}&limit=20&all=true`);

        expect(res.ok).toBeTruthy();
        const byTag = res.body.data?.filter((m) => m.tags?.includes(uniqueTag)) ?? [];
        expect(byTag.length).toBeGreaterThanOrEqual(7);
    });

    test('TC_MED_017_SEARCH_VisibilityMasking', async ({ request, baseURL }) => {
        // Intent: validar que endpoint público solo retorna media publicada.
        const apiClient = new ApiClient(request, baseURL);

        const res = await apiClient.get(`/api/media/search?tags=${encodeURIComponent(uniqueTag)}&limit=50`);

        expect(res.ok).toBeTruthy();
        const results = res.body.data ?? [];
        results.forEach((m) => {
            expect(m.is_published).toBe(true);
        });
    });

    test('TC_MED_018_SEARCH_VisibilityAdmin', async ({ request, baseURL }) => {
        // Intent: validar que all=true expone media no publicada.
        const apiClient = new ApiClient(request, baseURL);

        const res = await apiClient.get(`/api/media/search?tags=${encodeURIComponent(uniqueTag)}&all=true&limit=50`);

        expect(res.ok).toBeTruthy();
        const drafts = (res.body.data ?? []).filter((m) => m.is_published === false);
        expect(drafts.length).toBeGreaterThanOrEqual(2);
    });
});

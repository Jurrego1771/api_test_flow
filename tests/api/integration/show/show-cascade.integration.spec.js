const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const { faker } = require('@faker-js/faker');
require('dotenv').config();

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Show — Cascade Delete Integration', () => {

    test('TC_SHW_INT_CASCADE_001_DELETE_Show_Removes_Seasons @critical', async () => {
        const showRes = await apiClient.post('/api/show', {
            title: `qa_cascade_${faker.random.alphaNumeric(8)}`,
            type: 'tvshow',
        });
        expect(showRes.status, 'Create show').toBe(200);
        const show = showRes.body;
        cleaner.register('show', show._id);

        const seasonRes = await apiClient.post(`/api/show/${show._id}/season`, {
            title: `qa_cascade_s_${faker.random.alphaNumeric(6)}`,
        });
        expect(seasonRes.status, 'Create season').toBe(200);
        const season = seasonRes.body?.data ?? seasonRes.body;
        cleaner.register('season', `${show._id}/${season._id}`);

        const deleteRes = await apiClient.delete(`/api/show/${show._id}`);
        expect(deleteRes.status, 'Delete show').toBe(200);

        // Season must be inaccessible after show cascade delete
        const seasonGetRes = await apiClient.get(`/api/show/${show._id}/season/${season._id}`);
        expect([404, 500]).toContain(seasonGetRes.status);
    });

    test('TC_SHW_INT_CASCADE_002_DELETE_Season_Removes_Episodes', async () => {
        const showRes = await apiClient.post('/api/show', {
            title: `qa_cascade_se_${faker.random.alphaNumeric(8)}`,
            type: 'tvshow',
        });
        expect(showRes.status).toBe(200);
        const show = showRes.body;
        cleaner.register('show', show._id);

        const seasonRes = await apiClient.post(`/api/show/${show._id}/season`, {
            title: `qa_cascade_s2_${faker.random.alphaNumeric(6)}`,
        });
        expect(seasonRes.status).toBe(200);
        const season = seasonRes.body?.data ?? seasonRes.body;
        cleaner.register('season', `${show._id}/${season._id}`);

        const mediaRes = await apiClient.get('/api/media?limit=10&sort=-date_created');
        const mediaList = mediaRes.body?.data ?? [];
        if (mediaList.length === 0) {
            test.skip(true, 'No media available for episode creation');
            return;
        }

        let episode = null;
        for (const m of mediaList) {
            const epRes = await apiClient.post(
                `/api/show/${show._id}/season/${season._id}/episode`,
                {
                    title: `qa_cascade_ep_${faker.random.alphaNumeric(6)}`,
                    content: [{ content_type: 'Media', type: 'full', value: m._id }],
                }
            );
            if (epRes.status === 200) {
                episode = epRes.body?.data ?? epRes.body;
                break;
            }
        }

        if (!episode) {
            test.skip(true, 'Could not create episode — all sampled media already linked');
            return;
        }

        const delSeasonRes = await apiClient.delete(`/api/show/${show._id}/season/${season._id}`);
        expect(delSeasonRes.status, 'Delete season').toBe(200);

        // Episode must be inaccessible after season cascade delete
        const epGetRes = await apiClient.get(
            `/api/show/${show._id}/season/${season._id}/episode/${episode._id}`
        );
        expect([404, 500]).toContain(epGetRes.status);
    });

    test('TC_SHW_INT_CASCADE_003_DELETE_Show_Multiple_Seasons_All_Gone @critical', async () => {
        const showRes = await apiClient.post('/api/show', {
            title: `qa_cascade_ms_${faker.random.alphaNumeric(8)}`,
            type: 'tvshow',
        });
        expect(showRes.status).toBe(200);
        const show = showRes.body;
        cleaner.register('show', show._id);

        const s1Res = await apiClient.post(`/api/show/${show._id}/season`, {
            title: `qa_s1_${faker.random.alphaNumeric(6)}`,
        });
        expect(s1Res.status).toBe(200);
        const season1 = s1Res.body?.data ?? s1Res.body;
        cleaner.register('season', `${show._id}/${season1._id}`);

        const s2Res = await apiClient.post(`/api/show/${show._id}/season`, {
            title: `qa_s2_${faker.random.alphaNumeric(6)}`,
        });
        expect(s2Res.status).toBe(200);
        const season2 = s2Res.body?.data ?? s2Res.body;
        cleaner.register('season', `${show._id}/${season2._id}`);

        const deleteRes = await apiClient.delete(`/api/show/${show._id}`);
        expect(deleteRes.status).toBe(200);

        // Both seasons must be inaccessible
        const [get1, get2] = await Promise.all([
            apiClient.get(`/api/show/${show._id}/season/${season1._id}`),
            apiClient.get(`/api/show/${show._id}/season/${season2._id}`),
        ]);
        expect([404, 500]).toContain(get1.status);
        expect([404, 500]).toContain(get2.status);
    });
});

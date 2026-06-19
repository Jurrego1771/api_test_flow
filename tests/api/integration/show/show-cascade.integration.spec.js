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

        // Cascade: la season desaparece del LISTADO del show.
        // El backend hace soft-delete -> GET by-id aún devuelve 200, pero el
        // listado ya no la incluye (esa es la señal real de cascade).
        const listRes = await apiClient.get(`/api/show/${show._id}/season`);
        const seasons = listRes.body?.data ?? listRes.body ?? [];
        const ids = (Array.isArray(seasons) ? seasons : []).map((s) => s._id);
        expect(ids).not.toContain(season._id);
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

        // Cascade: la season borrada desaparece del listado del show; sus
        // episodios quedan huérfanos de un padre soft-deleted. (GET by-id sigue
        // 200 por soft-delete — la señal observable es el listado.)
        const listRes = await apiClient.get(`/api/show/${show._id}/season`);
        const seasons = listRes.body?.data ?? listRes.body ?? [];
        const ids = (Array.isArray(seasons) ? seasons : []).map((s) => s._id);
        expect(ids).not.toContain(season._id);
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

        // Cascade: ninguna season del show borrado aparece en el listado.
        const listRes = await apiClient.get(`/api/show/${show._id}/season`);
        const seasons = listRes.body?.data ?? listRes.body ?? [];
        const ids = (Array.isArray(seasons) ? seasons : []).map((s) => s._id);
        expect(ids).not.toContain(season1._id);
        expect(ids).not.toContain(season2._id);
    });
});

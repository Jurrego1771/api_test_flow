const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const {
    createPlaylistResponseSchema,
    getPlaylistResponseSchema,
    listPlaylistResponseSchema,
} = require('../../../../schemas/playlist.schema');

const ACCOUNT_ID = process.env.ACCOUNT_ID || 'test-account-id';

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Playlist - Contract', () => {
    test('TC_CON_PL_001 POST /api/playlist response schema', async () => {
        const payload = {
            name: `[QA-CONTRACT] Playlist ${Date.now()}`,
            account: ACCOUNT_ID,
            type: 'manual',
        };
        const res = await apiClient.post('/api/playlist', payload, { form: true });
        expect(res.ok, `Create failed: ${res.status} ${JSON.stringify(res.body)}`).toBeTruthy();

        const parsed = createPlaylistResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);

        cleaner.register('playlist', parsed.data.data._id);
    });

    test('TC_CON_PL_002 GET /api/playlist/:id response schema', async () => {
        const createRes = await apiClient.post('/api/playlist', {
            name: `[QA-CONTRACT] Playlist ${Date.now()}`,
            account: ACCOUNT_ID,
            type: 'manual',
        }, { form: true });
        expect(createRes.ok).toBeTruthy();
        const playlistId = createRes.body.data._id;
        cleaner.register('playlist', playlistId);

        const res = await apiClient.get(`/api/playlist/${playlistId}`);
        expect(res.ok, `GET failed: ${res.status}`).toBeTruthy();

        const parsed = getPlaylistResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });

    test('TC_CON_PL_003 GET /api/playlist list response schema', async () => {
        const res = await apiClient.get('/api/playlist', { account: ACCOUNT_ID });
        expect(res.ok, `List failed: ${res.status}`).toBeTruthy();

        const parsed = listPlaylistResponseSchema.safeParse(res.body);
        expect(parsed.success, `Schema mismatch: ${JSON.stringify(parsed.error?.issues)}`).toBe(true);
    });
});

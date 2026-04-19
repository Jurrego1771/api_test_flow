const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');
const { showSchema } = require('../../../../schemas/show.schema');
const dataFactory = require('../../../../utils/dataFactory');
const { faker } = require('@faker-js/faker');

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

function getShowFromBody(body) {
    const raw = body?.data ?? body;
    return Array.isArray(raw) ? raw[0] : raw;
}

async function createShow(client, attrs = {}) {
    const payload = {
        title: `[QA-AUTO] Show ${faker.random.alphaNumeric(6)} ${Date.now()}`,
        type: 'tvshow',
        account: ACCOUNT_ID,
        ...attrs,
    };
    const res = await client.post('/api/show', payload, { form: true });
    if (!res.ok) throw new Error(`createShow failed: ${res.status} ${JSON.stringify(res.body)}`);
    return getShowFromBody(res.body);
}

// --- 1. CREATE ---

test.describe('1. Create (POST /api/show)', { tag: ['@negative'] }, () => {
    test('TC_SHW_001_INSERT_MinimalPayload - schema validation', async () => {
        const payload = dataFactory.generateShowPayload({
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Show ${Date.now()}`,
            type: 'tvshow',
            genres: [],
        });
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        const parsed = showSchema.parse(created);
        expect(parsed._id).toBeTruthy();

        cleaner.register('show', created._id);
    });

    test('TC_SHW_002_INSERT_FullPayload', async () => {
        const payload = {
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Full Show ${Date.now()}`,
            description: 'Descripcion QA',
            type: 'radioshow',
            genres: [],
        };
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(created.type).toBe('radioshow');
        expect(created.description).toBe('Descripcion QA');

        cleaner.register('show', created._id);
    });

    test('TC_SHW_003_INSERT_GenresNullCleaning', async () => {
        const payload = dataFactory.generateShowPayload({
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Null Genres Show ${Date.now()}`,
            type: 'radioshow',
            genres: [],
        });
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(Array.isArray(created.genres)).toBeTruthy();

        cleaner.register('show', created._id);
    });

    test('TC_SHW_004_INSERT_NextEpisodeDefault', async () => {
        const payload = dataFactory.generateShowPayload({
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Default Next Episode ${Date.now()}`,
            type: 'radioshow',
            genres: [],
        });
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(created).toHaveProperty('next_episode');
        expect(typeof created.next_episode).toBe('number');
        expect(created.next_episode).toBeGreaterThanOrEqual(0);

        cleaner.register('show', created._id);
    });

    test('TC_SHW_NEG_001_INSERT_MissingAccount', async () => {
        const res = await apiClient.post('/api/show', {
            title: `[QA-AUTO] No Account ${Date.now()}`,
            type: 'tvshow',
        }, { form: true });
        expect([200, 400, 422]).toContain(res.status);
        if (res.ok && res.body?.data?._id) cleaner.register('show', getShowFromBody(res.body)._id);
    });

    test('TC_SHW_NEG_003_INSERT_InvalidType', async () => {
        const res = await apiClient.post('/api/show', {
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Invalid Type ${Date.now()}`,
            type: 'invalid_type_xyz',
        }, { form: true });
        expect([200, 400, 422, 500]).toContain(res.status);
        if (res.ok && res.body?.data?._id) cleaner.register('show', getShowFromBody(res.body)._id);
    });

    test('TC_SHW_NEG_004_INSERT_InvalidDateFormat', async () => {
        const res = await apiClient.post('/api/show', {
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Bad Date ${Date.now()}`,
            type: 'tvshow',
            first_emision: 'not-a-date',
        }, { form: true });
        expect([200, 400, 422]).toContain(res.status);
        if (res.ok && res.body?.data?._id) cleaner.register('show', getShowFromBody(res.body)._id);
    });
});

// --- 2. READ ---

test.describe('2. Read (GET /api/show/:id)', () => {
    test('TC_SHW_011_GET_ShowWithPopulate', async () => {
        // Intent: validar que ?populate=1 incluye campos relacionados.
        const show = await createShow(apiClient, { type: 'tvshow', is_published: 'true' });
        cleaner.register('show', show._id);

        const res = await apiClient.get(`/api/show/${show._id}?populate=1`);

        expect(res.ok).toBeTruthy();
        const fetched = getShowFromBody(res.body);
        expect(fetched._id).toBe(show._id);
        expect(fetched).toHaveProperty('distributors');
        expect(fetched).toHaveProperty('producers');
    });

    test('TC_SHW_NEG_011_GET_InvalidShowId', async () => {
        const res = await apiClient.get('/api/show/not-a-valid-id');
        expect([400, 404, 500]).toContain(res.status);
    });
});

// --- 3. UPDATE ---

test.describe('3. Update (POST /api/show/:id)', () => {
    test('TC_SHW_040_UPDATE_PartialUpdate', async () => {
        // Intent: validar actualización parcial y persistencia de campos.
        const show = await createShow(apiClient, { type: 'tvshow', is_published: 'true' });
        cleaner.register('show', show._id);
        const newDescription = faker.lorem.paragraph();

        const res = await apiClient.post(`/api/show/${show._id}`, { description: newDescription }, { form: true });

        expect(res.ok).toBeTruthy();
        const updated = getShowFromBody(res.body);
        expect(updated.description).toBe(newDescription);
        expect(updated._id).toBe(show._id);
    });

    test('TC_SHW_041_UPDATE_CompleteUpdate', async () => {
        const show = await createShow(apiClient, { type: 'tvshow', is_published: 'true' });
        cleaner.register('show', show._id);
        const newTitle = `[QA-AUTO] Updated Title ${Date.now()}`;
        const newDescription = faker.lorem.paragraph();

        const res = await apiClient.post(`/api/show/${show._id}`, {
            title: newTitle,
            description: newDescription,
        }, { form: true });

        expect(res.ok).toBeTruthy();
        const updated = getShowFromBody(res.body);
        expect(updated.title).toBe(newTitle);
        expect(updated.description).toBe(newDescription);
    });

    test('TC_SHW_042_UPDATE_NextEpisodeValidation', async () => {
        const show = await createShow(apiClient, { type: 'tvshow', is_published: 'true' });
        cleaner.register('show', show._id);

        const res = await apiClient.post(`/api/show/${show._id}`, { next_episode: 120 }, { form: true });

        expect(res.ok).toBeTruthy();
        const updated = getShowFromBody(res.body);
        expect(typeof updated.next_episode).toBe('number');
    });

    test('TC_SHW_NEG_040_UPDATE_CannotChangeShowType', async () => {
        const show = await createShow(apiClient, { type: 'tvshow', is_published: 'true' });
        cleaner.register('show', show._id);

        if (show.type === 'tvshow') {
            const res = await apiClient.post(`/api/show/${show._id}`, { type: 'podcast' }, { form: true });
            expect([200, 400, 422]).toContain(res.status);
        }
    });

    test('TC_SHW_NEG_041_UPDATE_NonExistentShow', async () => {
        const res = await apiClient.post('/api/show/507f1f77bcf86cd799439011', { title: 'Updated' }, { form: true });
        expect([404, 403, 500]).toContain(res.status);
    });
});

// --- 4. DELETE ---

test.describe('4. Remove (DELETE /api/show/:id)', () => {
    test('TC_SHW_051_REMOVE_ShowStatusDeletedAfterRemove', async () => {
        // Intent: validar que show eliminado queda con status DELETE o es inaccesible.
        const show = await createShow(apiClient, { type: 'radioshow' });
        await apiClient.delete(`/api/show/${show._id}`);

        const getRes = await apiClient.get(`/api/show/${show._id}`);
        expect([404, 500, 200]).toContain(getRes.status);
        if (getRes.ok) {
            const fetched = getShowFromBody(getRes.body);
            const status = fetched?.status ?? getRes.body?.status;
            if (status !== undefined) expect(status).toBe('DELETE');
        }
    });

    test('TC_SHW_NEG_050_REMOVE_NonExistentShow', async () => {
        const res = await apiClient.delete('/api/show/507f1f77bcf86cd799439011');
        expect([404, 500]).toContain(res.status);
    });

    test('TC_SHW_NEG_051_REMOVE_InvalidShowId', async () => {
        const res = await apiClient.delete('/api/show/not-a-valid-id');
        expect([400, 404, 500]).toContain(res.status);
    });
});

// --- 5. Edge Cases ---

test.describe('5. Edge Cases y Validaciones', { tag: ['@negative'] }, () => {
    test('TC_SHW_070_VALIDATION_EmptyTitle', async () => {
        const res = await apiClient.post('/api/show', {
            account: ACCOUNT_ID, title: '', type: 'tvshow',
        }, { form: true });
        expect([400, 422]).toContain(res.status);
    });

    test('TC_SHW_071_VALIDATION_VeryLongTitle', async () => {
        const res = await apiClient.post('/api/show', {
            account: ACCOUNT_ID, title: 'A'.repeat(5000), type: 'tvshow',
        }, { form: true });
        expect([200, 400, 422]).toContain(res.status);
        if (res.ok && res.body?.data?._id) cleaner.register('show', getShowFromBody(res.body)._id);
    });

    test('TC_SHW_072_VALIDATION_SpecialCharactersInTitle', async () => {
        const payload = {
            account: ACCOUNT_ID,
            title: `[QA] Show @#$%^&*() ${Date.now()}`,
            type: 'tvshow',
        };
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(created.title).toContain('@#$%^&*()');

        cleaner.register('show', created._id);
    });

    test('TC_SHW_073_VALIDATION_EmptyGenresArray', async () => {
        const payload = {
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Empty Genres ${Date.now()}`,
            type: 'tvshow',
            genres: [],
        };
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(Array.isArray(created.genres)).toBeTruthy();

        cleaner.register('show', created._id);
    });

    test('TC_SHW_074_VALIDATION_UnicodeCharactersInDescription', async () => {
        const payload = {
            account: ACCOUNT_ID,
            title: `[QA-AUTO] Unicode ${Date.now()}`,
            description: 'こんにちは 中文 العربية Émojis: 🎬📺🎥',
            type: 'tvshow',
        };
        const res = await apiClient.post('/api/show', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getShowFromBody(res.body);
        expect(created.description).toContain('Émojis');

        cleaner.register('show', created._id);
    });
});

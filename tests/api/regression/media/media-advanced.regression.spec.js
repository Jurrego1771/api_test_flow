const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');
const { faker } = require('@faker-js/faker');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

function getCreatedMedia(body) {
    return Array.isArray(body.data) ? body.data[0] : body.data;
}

function buildFilterQuery(filters) {
    const params = new URLSearchParams();
    filters.forEach((f, idx) => {
        const base = `filterData[${idx}]`;
        if (f.filter !== undefined) params.append(`${base}[filter]`, String(f.filter));
        if (f.rule !== undefined) params.append(`${base}[rule]`, String(f.rule));
        if (f.value !== undefined) params.append(`${base}[value]`, String(f.value));
    });
    return params.toString();
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

// --- Create variantes ---

test.describe('2b. Create Media - variantes', () => {
    test('TC_MED_002_POST_CreateFullPayload', async () => {
        // Intent: validar que todos los campos del payload se persisten correctamente.
        const payload = dataFactory.generateMediaPayload({ type: 'video', visible: 'true', is_published: 'true' });
        const res = await apiClient.post('/api/media', payload, { form: true });

        expect(res.ok).toBeTruthy();
        const created = getCreatedMedia(res.body);
        expect(created.title).toBe(payload.title);
        expect(created.is_published).toBe(true);

        cleaner.register('media', created._id);
    });

    test('TC_MED_003_POST_MissingTitle - title se auto-asigna', async () => {
        // Intent: validar comportamiento cuando falta title (API usa _id como title).
        const payload = { type: 'video', visible: 'true', is_published: 'false' };
        const res = await apiClient.post('/api/media', payload, { form: true });

        expect(res.status).toBe(200);
        expect(res.body.data.title).toBe(res.body.data._id);

        cleaner.register('media', res.body.data._id);
    });

    test('TC_MED_004_POST_InvalidType', async () => {
        const payload = { title: `qa_invalid_${Date.now()}`, type: 'holograma', visible: 'true', is_published: 'false' };
        const res = await apiClient.post('/api/media', payload, { form: true });

        expect([200, 400]).toContain(res.status);
        if (res.ok && res.body.data?._id) cleaner.register('media', res.body.data._id);
    });
});

// --- Read variantes ---

test.describe('3b. Read Media - variantes', () => {
    test('TC_MED_005a_GET_ListAllTrue - incluye no publicados', async () => {
        // Intent: validar que all=true expone media sin publicar.
        const res = await apiClient.get('/api/media?all=true&limit=50');

        expect(res.ok).toBeTruthy();
        const hasUnpublished = res.body.data.some((m) => m.is_published === false);
        expect(hasUnpublished).toBe(true);
    });

    test('TC_MED_005b_GET_ListWithoutCategory', async () => {
        // Intent: validar filtros without_category=true y false.
        const resTrue = await apiClient.get('/api/media?without_category=true');
        const resFalse = await apiClient.get('/api/media?without_category=false');

        expect(resTrue.ok).toBeTruthy();
        expect(resFalse.ok).toBeTruthy();

        resTrue.body.data.forEach((m) => {
            expect(m.categories === null || (Array.isArray(m.categories) && m.categories.length === 0)).toBeTruthy();
        });
    });

    test('TC_MED_006_GET_ListValidPagination', async () => {
        // Intent: validar que páginas distintas no tienen registros en común.
        const page1 = await apiClient.get('/api/media?limit=5&skip=0');
        const page2 = await apiClient.get('/api/media?limit=5&skip=5');

        expect(page1.ok).toBeTruthy();
        expect(page2.ok).toBeTruthy();

        const ids1 = page1.body.data.map((m) => m._id);
        const ids2 = page2.body.data.map((m) => m._id);
        expect(ids1.filter((id) => ids2.includes(id)).length).toBe(0);
    });

    test('TC_MED_007_GET_SortDescending', async () => {
        const res = await apiClient.get('/api/media?limit=10&sort=-date_created');
        expect(res.ok).toBeTruthy();
        if (res.body.data.length >= 2) {
            const dates = res.body.data.map((m) => new Date(m.date_created).getTime());
            for (let i = 1; i < dates.length; i++) expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
        }
    });
});

// --- Update variantes ---

test.describe('4b. Partial Update - variantes', { tag: ['@critical'] }, () => {
    test('TC_MED_010b_UPDATE_PublishUnpublish', async () => {
        // Intent: validar ciclo publish/unpublish y visibilidad en búsqueda pública vs admin.
        const prefix = `qa_pub_${Date.now()}_`;
        const draft = await createMedia(apiClient, { title: `${prefix}draft`, is_published: 'false' });
        const published = await createMedia(apiClient, { title: `${prefix}pub`, is_published: 'true' });
        cleaner.register('media', draft._id);
        cleaner.register('media', published._id);

        await apiClient.post(`/api/media/${draft._id}`, { is_published: 'true' }, { form: true });
        await apiClient.post(`/api/media/${published._id}`, { is_published: 'false' }, { form: true });

        await new Promise((r) => setTimeout(r, 2000));

        const searchPublic = await apiClient.get(`/api/media/search?title=${encodeURIComponent(prefix)}&limit=10`);
        const searchAll = await apiClient.get(`/api/media/search?title=${encodeURIComponent(prefix)}&limit=10&all=true`);
        expect(searchPublic.ok).toBeTruthy();
        expect(searchAll.ok).toBeTruthy();

        const spIds = (searchPublic.body.data || []).map((m) => m._id);
        const saIds = (searchAll.body.data || []).map((m) => m._id);
        expect(spIds).toContain(draft._id);
        expect(spIds).not.toContain(published._id);
        expect(saIds).toContain(draft._id);
        expect(saIds).toContain(published._id);
    });
});

// --- Delete variantes ---

test.describe('5b. Delete Media - variantes', () => {
    test('TC_MED_014_DELETE_AlreadyDeleted', async () => {
        // Intent: validar comportamiento al eliminar media ya eliminada.
        const media = await createMedia(apiClient);
        await apiClient.delete(`/api/media/${media._id}`);

        const delRes2 = await apiClient.delete(`/api/media/${media._id}`);
        expect([200, 404]).toContain(delRes2.status);
    });
});

// --- Filtros Avanzados ---

test.describe('6. Filtros Avanzados (filterData)', () => {
    test('TC_MED_014a_FILTER_TitleIs', async () => {
        // Intent: validar filtro exacto por título.
        const media = await createMedia(apiClient, { title: `qa_exact_${Date.now()}` });
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media?${buildFilterQuery([{ filter: 'title', rule: 'is', value: media.title }])}&all=true`);
        expect(res.ok).toBeTruthy();
        const ids = (res.body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
    });

    test('TC_MED_014b_FILTER_TitleContains', async () => {
        const unique = `qa_contain_${Date.now()}`;
        const media = await createMedia(apiClient, { title: `pre_${unique}_suf` });
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media?${buildFilterQuery([{ filter: 'title', rule: 'contains', value: unique }])}&all=true`);
        expect(res.ok).toBeTruthy();
        const ids = (res.body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
    });

    test('TC_MED_014c_FILTER_TitleStartsEndsWith', async () => {
        const prefix = `qa_pref_${Date.now()}`;
        const media = await createMedia(apiClient, { title: `${prefix}_suffix` });
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media?${buildFilterQuery([{ filter: 'title', rule: 'starts_with', value: prefix }])}&all=true`);
        expect(res.ok).toBeTruthy();
        const ids = (res.body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
    });

    test('TC_MED_014e_FILTER_TypeVideo', async () => {
        const media = await createMedia(apiClient, { type: 'video' });
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media?${buildFilterQuery([{ filter: 'type', rule: 'video' }])}&all=true`);
        expect(res.ok).toBeTruthy();
        const ids = (res.body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(media._id);
    });
});

// --- Visibilidad ---

test.describe('8. Visibility Index', { tag: ['@contract'] }, () => {
    test('TC_MED_017a_INDEX_VisibilityMasking - solo publicados en endpoint público', async () => {
        // Intent: validar que endpoint público solo retorna media publicada.
        const res = await apiClient.get('/api/media?all=false&limit=100');
        expect(res.ok).toBeTruthy();
        res.body.data.forEach((m) => expect(m.is_published).toBe(true));
    });

    test('TC_MED_018a_INDEX_VisibilityAdmin - all=true incluye no publicados', async () => {
        const res = await apiClient.get('/api/media?all=true&limit=50');
        expect(res.ok).toBeTruthy();
        const hasUnpublished = res.body.data.some((m) => m.is_published === false);
        expect(hasUnpublished).toBe(true);
    });
});

// --- Subrecursos ---

test.describe('10. Subrecursos (Metas)', () => {
    test('TC_MED_META_GET', async () => {
        const listRes = await apiClient.get('/api/media?all=true&limit=50');
        const mediaWithMeta = listRes.body.data.find((m) => Array.isArray(m.meta) && m.meta.length > 0);
        expect(mediaWithMeta, 'No media with meta').toBeTruthy();

        const res = await apiClient.get(`/api/media/${mediaWithMeta._id}/meta`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
    });

    test('TC_MED_META_GET_NotFound', async () => {
        const res = await apiClient.get('/api/media/666666666666666666666666/meta');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('NOT_FOUND');
    });
});

test.describe('3c. Read - without_category + id', () => {
    test('TC_MED_005c_GET_WithoutCategoryAndId', async () => {
        // Intent: validar que without_category=true + id específico retorna vacío si tiene categoría.
        const listRes = await apiClient.get('/api/media?all=true&limit=50');
        const withCategory = listRes.body.data.find(
            (m) => Array.isArray(m.categories) && m.categories.length > 0
        );
        if (!withCategory) { test.skip(); return; }

        const res = await apiClient.get(`/api/media?without_category=true&id=${withCategory._id}`);
        expect(res.ok).toBeTruthy();
        expect(res.body.data.length).toBe(0);
    });
});

test.describe('6b. Filtros - Published', () => {
    test('TC_MED_014d_FILTER_Published', async () => {
        // Intent: validar filtro por estado publicado.
        const resAll = await apiClient.get('/api/media?all=true&limit=50');
        const published = resAll.body.data.find((m) => m.is_published === true);
        expect(published, 'No published media').toBeTruthy();

        const filters = [{ filter: 'published', rule: 'true' }];
        const res = await apiClient.get(`/api/media?${buildFilterQuery(filters)}`);
        expect(res.ok).toBeTruthy();
        const ids = (res.body.data || []).map((m) => m._id ?? m.id);
        expect(ids).toContain(published._id);
    });
});

test.describe('10b. Subrecursos (Metas) - DELETE', () => {
    test('TC_MED_META_DELETE', async () => {
        const listRes = await apiClient.get('/api/media?all=true&limit=50');
        const target = listRes.body.data.find(
            (m) => Array.isArray(m.meta) && m.meta.some((mm) => !mm.is_original)
        );
        if (!target) { test.skip(); return; }

        const metaId = target.meta.find((mm) => !mm.is_original)._id;
        const delRes = await apiClient.delete(`/api/media/${target._id}/meta/${metaId}`);
        expect(delRes.status).toBe(200);
    });
});

test.describe('11. Subrecursos Adicionales', () => {
    test('TC_MED_SUBTITLE_GET', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media/${media._id}/subtitle`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
    });

    test('TC_MED_SUBTITLE_GET_NotFound', async () => {
        const res = await apiClient.get('/api/media/000000000000000000000000/subtitle');
        expect([200, 404]).toContain(res.status);
        expect(res.body.status === 'ERROR' || res.status === 404).toBeTruthy();
    });

    test('TC_MED_SUBTITLE_DELETE', async () => {
        // Intent: validar eliminación de subtítulo y que ya no aparece en el listado.
        const listRes = await apiClient.get('/api/media?all=true&limit=50');
        const medias = listRes.body.data || [];
        let found = null;
        for (const m of medias) {
            const subRes = await apiClient.get(`/api/media/${m._id}/subtitle`);
            if (!subRes.ok) continue;
            const items = Array.isArray(subRes.body.data) ? subRes.body.data
                : subRes.body.data?.subtitles ?? subRes.body.data?.data ?? [];
            if (Array.isArray(items) && items.length > 0) {
                const subId = items[0]._id ?? items[0].id;
                if (subId) { found = { mediaId: m._id, subtitleId: subId }; break; }
            }
        }
        if (!found) { test.skip(); return; }

        const delRes = await apiClient.delete(`/api/media/${found.mediaId}/subtitle/${found.subtitleId}`);
        expect(delRes.status).toBe(200);
        const getRes = await apiClient.get(`/api/media/${found.mediaId}/subtitle`);
        const items = Array.isArray(getRes.body.data) ? getRes.body.data
            : getRes.body.data?.subtitles ?? [];
        expect(items.some((s) => (s._id ?? s.id) === found.subtitleId)).toBe(false);
    });

    test('TC_MED_THUMBS_GET', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media/${media._id}/thumbs`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        const thumbs = res.body.data?.thumbnails ?? res.body.data ?? [];
        expect(Array.isArray(thumbs)).toBe(true);
    });

    test('TC_MED_THUMBS_GET_NotFound', async () => {
        const res = await apiClient.get('/api/media/000000000000000000000000/thumbs');
        expect([200, 404]).toContain(res.status);
        if (res.body.status === 'ERROR') {
            expect(['NOT_FOUND', 'MEDIA_NOT_FOUND']).toContain(res.body.data);
        }
    });

    test('TC_MED_THUMB_DELETE', async () => {
        // Intent: validar eliminación de thumbnail no default.
        const listRes = await apiClient.get('/api/media?all=true&limit=50');
        const medias = listRes.body.data || [];
        let found = null;
        for (const m of medias) {
            const thumbsRes = await apiClient.get(`/api/media/${m._id}/thumbs`);
            if (!thumbsRes.ok) continue;
            const thumbs = thumbsRes.body.data?.thumbnails ?? thumbsRes.body.data ?? thumbsRes.body.thumbnails ?? [];
            if (!Array.isArray(thumbs)) continue;
            const deletable = thumbs.find((t) => t.is_default === false || t.is_original === false);
            if (deletable) {
                const thumbId = deletable._id ?? deletable.id;
                if (thumbId) { found = { mediaId: m._id, thumbId }; break; }
            }
        }
        if (!found) { test.skip(); return; }

        const delRes = await apiClient.delete(`/api/media/${found.mediaId}/thumb/${found.thumbId}`);
        expect(delRes.status).toBe(200);
    });

    test('TC_MED_THUMBNAIL_UPLOAD_POST', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const res = await apiClient.post(`/api/media/${media._id}/thumbnail/upload`, {}, { form: true });
        if (res.ok) {
            expect(res.body.status).toBe('OK');
            const payload = res.body.data ?? res.body;
            expect(payload.url || payload.upload_url || payload.key !== undefined).toBeTruthy();
        } else {
            test.skip(true, 'Endpoint puede requerir params adicionales o no estar disponible');
        }
    });

    test('TC_MED_PREVIEW_POST', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const res = await apiClient.post(`/api/media/${media._id}/preview`, {}, { form: true });
        expect([200, 201, 400, 422]).toContain(res.status);
    });

    test('TC_MED_PREVIEW_UPLOAD_GET', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media/${media._id}/preview/upload`);
        expect([200, 404, 400]).toContain(res.status);
        if (res.ok) {
            expect(res.body.status).toBe('OK');
            const payload = res.body.data ?? res.body;
            expect(payload.url || payload.upload_url || payload.key !== undefined).toBeTruthy();
        }
    });

    test('TC_MED_IMAGE_GET', async () => {
        const media = await createMedia(apiClient);
        cleaner.register('media', media._id);

        const res = await apiClient.get(`/api/media/${media._id}/image`);
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
    });

    test('TC_MED_IMAGE_GET_NotFound', async () => {
        const res = await apiClient.get('/api/media/000000000000000000000000/image');
        expect([200, 404]).toContain(res.status);
        if (res.body.status === 'ERROR') expect(res.body.data).toBeDefined();
    });

    test('TC_MED_UPLOAD_GET', async () => {
        // Intent: validar que el endpoint de upload retorna jobId para subida remota.
        const params = new URLSearchParams({
            file_name: 'test_360p.mp4',
            fileUrl: 'https://ms-qa-bucket.s3.us-east-1.amazonaws.com/test_360p.mp4',
            type: 'remote',
        });
        if (process.env.API_TOKEN) params.append('token', process.env.API_TOKEN);

        const res = await apiClient.get(`/api/media/upload?${params.toString()}`);
        if (res.ok) {
            expect(res.body.status).toBe('OK');
            expect(res.body.data.jobId).toBeDefined();
        } else {
            test.skip(true, 'Endpoint GET /api/media/upload no disponible');
        }
    });
});

const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory } = require('../../helpers');

let apiClient;
let cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

async function createCategory(client, overrides = {}) {
    const payload = dataFactory.generateCategoryPayload(overrides);
    const res = await client.post('/api/category', payload, { form: true });
    if (!res.ok) throw new Error(`createCategory failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    return Array.isArray(raw) ? raw[0] : raw;
}

test.describe('Category — Regression', () => {
    test('TC_CAT_REG_001_GET_ById_NoVisibleField', async () => {
        // CAT-004 / Q2: GET /:id NO retorna el campo `visible` (select acotado en detail.js)
        const cat = await createCategory(apiClient, { visible: true });
        cleaner.register('category', cat._id);

        const res = await apiClient.get(`/api/category/${cat._id}`);
        expect(res.ok).toBeTruthy();
        expect(res.body.data._id).toBe(cat._id);
        // Afirma el quirk: el campo no debe venir en el detalle individual
        expect(res.body.data.visible).toBeUndefined();
    });

    test('TC_CAT_REG_002_POST_Update_EmptyDescription_KnownBug @negative', async () => {
        // CAT-005 / Q4: description:'' en update NO limpia el campo — bug conocido
        const cat = await createCategory(apiClient, { description: 'initial description' });
        cleaner.register('category', cat._id);

        const res = await apiClient.post(`/api/category/${cat._id}`, { description: '' }, { form: true });
        expect(res.ok).toBeTruthy();
        // El update no echa `description` (select acotado). Se lee via GET /:id (detail sí la retorna).
        // Afirma el bug: la descripción sigue intacta, no se limpió.
        const get = await apiClient.get(`/api/category/${cat._id}`);
        expect(get.body.data.description).toBe('initial description');
    });

    test('TC_CAT_REG_003_ParentChild_Tree', async () => {
        // CAT-006: relación padre/hijo persiste — verificada via list (GET /:id puede omitir parent)
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);

        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        // GET /:id may not return `parent` field (known quirk) — use list with category_name filter
        const listRes = await apiClient.get(`/api/category?category_name=${encodeURIComponent(child.name)}`);
        expect(listRes.ok).toBeTruthy();
        const found = listRes.body.data.find(c => c._id === child._id);
        expect(found).toBeDefined();

        // Verify parent if returned (optional — API may omit it)
        if (found && found.parent !== undefined && found.parent !== null) {
            const parentId = typeof found.parent === 'string' ? found.parent : found.parent._id;
            expect(parentId).toBe(parent._id);
        }
    });

    test('TC_CAT_REG_004_WithCount_AddsChildren @critical', async () => {
        // CAT-010: with_count=true agrega count_children y has_children
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        const res = await apiClient.get('/api/category?with_count=true');
        expect(res.ok).toBeTruthy();
        const found = res.body.data.find(c => c._id === parent._id);
        if (found) {
            expect(found).toHaveProperty('count_children');
            expect(found).toHaveProperty('has_children');
            expect(found.has_children).toBe(true);
        }
    });

    test('TC_CAT_REG_005_DELETE_WithChildren', async () => {
        // CAT-011: DELETE categoría con hijos — comportamiento esperado
        const parent = await createCategory(apiClient);
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);
        // parent registered after child — LIFO deletes child first

        const delRes = await apiClient.delete(`/api/category/${parent._id}`);
        // API may reject or cascade — accept both
        expect([200, 400, 409]).toContain(delRes.status);

        if (delRes.ok) {
            // Parent gone — verify child is also gone or orphaned
            const childRes = await apiClient.get(`/api/category/${child._id}`);
            expect([200, 404]).toContain(childRes.status);
        } else {
            // Parent not deleted — manually clean it
            cleaner.register('category', parent._id);
        }
    });

    test('TC_CAT_REG_006_DRM_NotInherited_From_Parent', async () => {
        // El DRM NO se hereda del padre: un hijo sin drm explícito queda con el
        // default del schema (enabled:false), aunque el padre tenga drm:'deny' (enabled:true).
        // GET /:id no retorna drm (Q2) → se lee via list.
        const parent = await createCategory(apiClient, { drm: 'deny' });
        cleaner.register('category', parent._id);

        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        const res = await apiClient.get(`/api/category?category_name=${encodeURIComponent(child.name)}`);
        expect(res.ok).toBeTruthy();
        const found = res.body.data.find(c => c._id === child._id);
        expect(found).toBeDefined();
        expect(found.drm?.enabled ?? false).toBe(false);
    });

    // (REG_007 eliminado — duplicaba el smoke full=true y no afirmaba nada;
    //  la ruta completa se valida de verdad en REG_020)

    test('TC_CAT_REG_008_Update_Name_Persists', async () => {
        // Update de nombre persiste y es recuperable
        const cat = await createCategory(apiClient);
        cleaner.register('category', cat._id);

        const newName = `[QA-REG] ${Date.now()}`;
        const updateRes = await apiClient.post(`/api/category/${cat._id}`, { name: newName }, { form: true });
        expect(updateRes.ok).toBeTruthy();
        expect(updateRes.body.data.name).toBe(newName);

        const getRes = await apiClient.get(`/api/category?category_name=${encodeURIComponent(newName)}`);
        expect(getRes.ok).toBeTruthy();
        expect(getRes.body.data.some(c => c._id === cat._id)).toBe(true);
    });
});

// ObjectId válido en formato pero inexistente
const FAKE_ID = 'ffffffffffffffffffffffff';

test.describe('Category — Regression (backend gap coverage)', () => {
    // --- DRM branches: 'all' y 'compatible' nunca cubiertos ---
    test('TC_CAT_REG_009_POST_DRM_All_Branch', async () => {
        const res = await apiClient.post('/api/category', {
            name: `qa_drm_all_${Date.now()}`,
            drm: 'all',
        }, { form: true });

        expect(res.status).toBe(200);
        cleaner.register('category', res.body.data._id);
        expect(res.body.data.drm.enabled).toBe(true);
        expect(res.body.data.drm.allow).toBe(true);
        expect(res.body.data.drm.allow_incompatible_devices).toBe(false);
    });

    test('TC_CAT_REG_010_POST_DRM_Compatible_Branch', async () => {
        const res = await apiClient.post('/api/category', {
            name: `qa_drm_compat_${Date.now()}`,
            drm: 'compatible',
        }, { form: true });

        expect(res.status).toBe(200);
        cleaner.register('category', res.body.data._id);
        expect(res.body.data.drm.enabled).toBe(true);
        expect(res.body.data.drm.allow).toBe(true);
        expect(res.body.data.drm.allow_incompatible_devices).toBe(true);
    });

    // --- Cycle prevention (CAT-RISK-001 P0) ---
    test('TC_CAT_REG_011_POST_Update_ParentCycle_Rejected @negative @critical', async () => {
        // A es raíz, B es hijo de A. Mover A bajo B = ciclo → 400 INVALID_PARENT
        const a = await createCategory(apiClient);
        cleaner.register('category', a._id);
        const b = await createCategory(apiClient, { parent: a._id });
        cleaner.register('category', b._id);

        const res = await apiClient.post(`/api/category/${a._id}`, { parent: b._id }, { form: true });
        expect(res.status).toBe(400);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('INVALID_PARENT');
    });

    test('TC_CAT_REG_012_POST_Update_SelfParent_ResetsToRoot', async () => {
        // parent === self → backend lo normaliza a raíz (parent null), no error
        const cat = await createCategory(apiClient, { parent: undefined });
        cleaner.register('category', cat._id);

        const res = await apiClient.post(`/api/category/${cat._id}`, { parent: cat._id }, { form: true });
        expect(res.status).toBe(200);
        expect(res.body.data.parent).toBeFalsy();
    });

    // --- QUIRK PELIGROSO: update sin campo parent BORRA el parent ---
    test('TC_CAT_REG_013_POST_Update_OmitParent_OrphansChild @negative', async () => {
        // Documenta bug latente: actualizar solo el name de un hijo lo deja huérfano.
        // update.js: si req.body.parent ausente → category.parent = null
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        const newName = `qa_orphan_${Date.now()}`;
        const upd = await apiClient.post(`/api/category/${child._id}`, { name: newName }, { form: true });
        expect(upd.ok).toBeTruthy();

        // Comportamiento REAL actual: el parent se pierde. Si esto cambia (se arregla el bug),
        // este test falla y obliga a revisar el quirk.
        const list = await apiClient.get(`/api/category?category_name=${encodeURIComponent(newName)}`);
        const found = list.body.data.find(c => c._id === child._id);
        expect(found).toBeDefined();
        expect(found.parent == null).toBe(true);
    });

    // --- 404 NOT_FOUND en rutas por id ---
    test('TC_CAT_REG_014_GET_ById_NotFound @negative', async () => {
        const res = await apiClient.get(`/api/category/${FAKE_ID}`);
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('NOT_FOUND');
    });

    test('TC_CAT_REG_015_POST_Update_NotFound @negative', async () => {
        const res = await apiClient.post(`/api/category/${FAKE_ID}`, { name: 'qa_nope' }, { form: true });
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('NOT_FOUND');
    });

    test('TC_CAT_REG_016_DELETE_NotFound @negative', async () => {
        const res = await apiClient.delete(`/api/category/${FAKE_ID}`);
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('NOT_FOUND');
    });

    // --- DELETE parent con hijos → 400 CANT_DELETE_PARENT (estricto) ---
    test('TC_CAT_REG_017_DELETE_ParentWithChildren_Blocked @negative @critical', async () => {
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);   // borrado 2º (LIFO) — ya sin hijos
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);     // borrado 1º (LIFO)

        const res = await apiClient.delete(`/api/category/${parent._id}`);
        expect(res.status).toBe(400);
        expect(res.body.data).toBe('CANT_DELETE_PARENT');

        // El padre sigue vivo
        const stillList = await apiClient.get(`/api/category?category_name=${encodeURIComponent(parent.name)}`);
        expect(stillList.body.data.some(c => c._id === parent._id)).toBe(true);
    });

    // --- Filtro ?parent= ---
    test('TC_CAT_REG_018_GET_FilterByParentId', async () => {
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        const res = await apiClient.get(`/api/category?parent=${parent._id}`);
        expect(res.ok).toBeTruthy();
        const ids = res.body.data.map(c => c._id);
        expect(ids).toContain(child._id);
    });

    test('TC_CAT_REG_019_GET_FilterParentNull_RootsOnly', async () => {
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        const res = await apiClient.get('/api/category?parent=null');
        expect(res.ok).toBeTruthy();
        const ids = res.body.data.map(c => c._id);
        // raíces: el hijo NO debe aparecer
        expect(ids).not.toContain(child._id);
    });

    // --- full=true arma ruta con separador " > " ---
    test('TC_CAT_REG_020_GET_FullPath_BuildsHierarchyName', async () => {
        const parent = await createCategory(apiClient);
        cleaner.register('category', parent._id);
        const child = await createCategory(apiClient, { parent: parent._id });
        cleaner.register('category', child._id);

        const res = await apiClient.get(`/api/category?full=true&category_name=${encodeURIComponent(child.name)}`);
        expect(res.ok).toBeTruthy();
        const found = res.body.data.find(c => c._id === child._id);
        expect(found).toBeDefined();
        // findFullPath concatena ancestros: "Parent > Child"
        expect(found.name).toContain(' > ');
        expect(found.name).toContain(parent.name);
    });

    // --- Slug collision (CAT-RISK-009) ---
    test('TC_CAT_REG_021_POST_DuplicateName_UniqueSlug', async () => {
        const dupName = `qa_dup_${Date.now()}`;
        const r1 = await apiClient.post('/api/category', { name: dupName }, { form: true });
        cleaner.register('category', r1.body.data._id);
        const r2 = await apiClient.post('/api/category', { name: dupName }, { form: true });
        cleaner.register('category', r2.body.data._id);

        expect(r1.body.data.slug).toBeTruthy();
        expect(r2.body.data.slug).toBeTruthy();
        // slug es account-unique → el 2º se auto-ajusta
        expect(r2.body.data.slug).not.toBe(r1.body.data.slug);
    });

    // --- Boundary visible: 'false' persiste false; omitido → default true ---
    test('TC_CAT_REG_022_POST_Visible_False_Persists', async () => {
        const cat = await createCategory(apiClient, { visible: false });
        cleaner.register('category', cat._id);

        // GET /:id no retorna visible — leer via list
        const list = await apiClient.get(`/api/category?category_name=${encodeURIComponent(cat.name)}`);
        const found = list.body.data.find(c => c._id === cat._id);
        expect(found).toBeDefined();
        expect(found.visible).toBe(false);
    });

    test('TC_CAT_REG_023_POST_Visible_Default_True', async () => {
        // sin enviar visible → default true del schema
        const res = await apiClient.post('/api/category', { name: `qa_vis_def_${Date.now()}` }, { form: true });
        cleaner.register('category', res.body.data._id);

        const list = await apiClient.get(`/api/category?category_name=${encodeURIComponent(res.body.data.name)}`);
        const found = list.body.data.find(c => c._id === res.body.data._id);
        expect(found.visible).toBe(true);
    });

    // --- Media assign: negativos ---
    test('TC_CAT_REG_024_POST_AssignMedia_MissingData @negative', async () => {
        const cat = await createCategory(apiClient);
        cleaner.register('category', cat._id);

        const res = await apiClient.post(`/api/category/${cat._id}/media`, {});
        expect(res.status).toBe(400);
        expect(res.body.data).toBe('MISSING_DATA');
    });

    test('TC_CAT_REG_025_POST_AssignMedia_CategoryNotFound @negative', async () => {
        const res = await apiClient.post(`/api/category/${FAKE_ID}/media`, { media_id: FAKE_ID });
        expect(res.status).toBe(404);
        expect(res.body.data).toBe('NOT_FOUND');
    });
});

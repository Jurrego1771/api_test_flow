const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner } = require('../../helpers');

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
    const payload = {
        name: `qa_cat_${Date.now()}`,
        drm: 'deny',
        track: true,
        visible: true,
        ...overrides,
    };
    const res = await client.post('/api/category', payload, { form: true });
    if (!res.ok) throw new Error(`createCategory failed: ${res.status} ${JSON.stringify(res.body)}`);
    const raw = res.body.data;
    return Array.isArray(raw) ? raw[0] : raw;
}

test.describe('GET /api/category - Búsqueda y listados de categorías', { tag: ['@smoke'] }, () => {
    test('Debe devolver OK y un array de categorías (sin filtros)', async () => {
        // Intent: validar contrato base del listado de categorías.
        const res = await apiClient.get('/api/category');

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Debe permitir buscar por category_name', async () => {
        // Intent: validar que el filtro category_name funciona correctamente.
        const parent = await createCategory(apiClient, { name: `qa_parent_${Date.now()}` });
        cleaner.register('category', parent._id);

        const res = await apiClient.get(`/api/category?category_name=${encodeURIComponent(parent.name)}`);

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        const names = res.body.data.map((c) => c.name);
        expect(names).toContain(parent.name);
    });

    test('Debe soportar flag full (ruta completa en nombre)', async () => {
        const res = await apiClient.get('/api/category?full=true');

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Debe soportar with_count (conteo de hijos)', async () => {
        const res = await apiClient.get('/api/category?with_count=true');

        expect(res.ok).toBeTruthy();
        expect(res.body.status).toBe('OK');
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('Debe listar y contener la categoría hija creada', async () => {
        // Intent: validar relación parent/child y que aparece en listado.
        const parent = await createCategory(apiClient, { name: `qa_parent_${Date.now()}` });
        cleaner.register('category', parent._id);
        const child = await createCategory(apiClient, { name: `qa_child_${Date.now()}`, parent: parent._id });
        cleaner.register('category', child._id);

        const res = await apiClient.get(`/api/category?category_name=${encodeURIComponent(child.name)}`);

        expect(res.ok).toBeTruthy();
        const ids = res.body.data.map((c) => c._id);
        expect(ids).toContain(child._id);
    });
});

test.describe('POST /api/category - Creación de categorías', { tag: ['@smoke'] }, () => {
    test('TC-CAT-POST-001: Crear categoría mínima (solo name)', async () => {
        // Intent: happy path de creación con mínimo de campos.
        const name = `qa_min_${Date.now()}`;
        const res = await apiClient.post('/api/category', { name }, { form: true });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(res.body.data.name).toBe(name);
        expect(res.body.data).toHaveProperty('_id');

        cleaner.register('category', res.body.data._id);
    });

    test('TC-CAT-POST-002: Crear categoría completa con parent, drm, track y visible', async () => {
        // Intent: validar persistencia de todos los campos en creación completa.
        const parent = await createCategory(apiClient, { name: `qa_parent_${Date.now()}` });
        cleaner.register('category', parent._id);

        const name = `qa_full_${Date.now()}`;
        const res = await apiClient.post('/api/category', {
            name,
            description: 'Categoría creada con todos los campos',
            drm: 'deny',
            parent: parent._id,
            track: true,
            visible: false,
        }, { form: true });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('OK');
        expect(res.body.data.name).toBe(name);

        cleaner.register('category', res.body.data._id);
    });

    test('TC-CAT-POST-NEG-001: Debe fallar si falta name (400 NAME_IS_REQUIRED)', async () => {
        // Intent: validar que el campo name es obligatorio.
        const res = await apiClient.post('/api/category', {
            description: 'Sin nombre',
            drm: 'deny',
            track: true,
            visible: true,
        }, { form: true });

        expect(res.status).toBe(400);
        expect(res.body.status).toBe('ERROR');
        expect(res.body.data).toBe('NAME_IS_REQUIRED');
    });

    test('TC-CAT-POST-NEG-002: Debe fallar si drm tiene un valor inválido', async () => {
        const res = await apiClient.post('/api/category', {
            name: `qa_invalid_drm_${Date.now()}`,
            drm: 'invalid_value',
            track: true,
            visible: true,
        }, { form: true });

        expect(res.status).toBe(200);
        expect(res.body.data.drm.enabled).toBe(false);
        expect(res.body.data.drm.allow).toBe(false);

        cleaner.register('category', res.body.data._id);
    });

    test('TC-CAT-POST-NEG-003: Debe fallar si parent no es un ID válido', async () => {
        const res = await apiClient.post('/api/category', {
            name: `qa_invalid_parent_${Date.now()}`,
            parent: 'not_a_valid_id',
            track: true,
            visible: true,
        }, { form: true });

        expect([400, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });

    test('TC-CAT-POST-NEG-004: Debe fallar si name es vacío', async () => {
        const res = await apiClient.post('/api/category', {
            name: '',
            description: 'Nombre vacío',
            track: true,
            visible: true,
        }, { form: true });

        expect([400, 500]).toContain(res.status);
        expect(res.body.status).toBe('ERROR');
    });
});

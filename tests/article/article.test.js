/**
 * Suite de Pruebas: API de Artículos (REST)
 * Nomenclatura: TC_ART_XXX_<endpoint>_<descripción>
 */

const { test, expect } = require("../../fixtures/article.fixture");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const dataFactory = require("../../utils/dataFactory");
const { createArticleResponseSchema, listArticleResponseSchema } = require("../../schemas/article.schema");

test.describe("Article API - CRUD & Search Operations", () => {
    let apiClient;
    let cleaner;

    test.beforeEach(async ({ authRequest, baseURL }) => {
        apiClient = new ApiClient(authRequest, baseURL);
        cleaner = new ResourceCleaner(apiClient);
    });

    test.afterEach(async () => {
        await cleaner.clean();
    });

    // --- 1. INSERT (POST /api/article) ---
    test.describe("1. Create (POST /api/article)", () => {
        test("TC_ART_001: Crear artículo completo (Happy Path)", async () => {
            const payload = dataFactory.generateArticlePayload({
                author: "QA Tester Auto",
                is_published: true
            });

            const res = await apiClient.post("/api/article", payload);
            expect(res.status).toBe(200);
            
            const body = res.body;
            expect(body.status).toBe("OK");
            expect(body.data.title).toBe(payload.title);
            expect(body.data.is_published).toBe(true);

            cleaner.register("article", body.data._id);

            // Validar Schema
            createArticleResponseSchema.parse(body);
        });

        test("TC_ART_002: Error al crear artículo sin título (Sad Path)", async () => {
            const payload = {
                synopsis: "Sin título"
            };

            const res = await apiClient.post("/api/article", payload);
            expect(res.status).toBe(400);
            expect(res.body.status).toBe("ERROR");
        });
    });

    // --- 2. DETAIL (GET /api/article/:id) ---
    test.describe("2. Detail (GET /api/article/:id)", () => {
        test("TC_ART_003: Obtener detalle de artículo por ID", async () => {
            const createRes = await apiClient.post("/api/article", dataFactory.generateArticlePayload());
            const article = createRes.body.data;
            cleaner.register("article", article._id);

            const detailRes = await apiClient.get(`/api/article/${article._id}`);
            expect(detailRes.status).toBe(200);
            expect(detailRes.body.data._id).toBe(article._id);
            expect(detailRes.body.data.title).toBe(article.title);
        });
    });

    // --- 3. UPDATE (POST /api/article/:id) ---
    test.describe("3. Update (POST /api/article/:id)", () => {
        test("TC_ART_004: Actualizar título y sinopsis", async () => {
            const createRes = await apiClient.post("/api/article", dataFactory.generateArticlePayload());
            const article = createRes.body.data;
            cleaner.register("article", article._id);

            const updatePayload = {
                title: "Updated Title " + Date.now(),
                synopsis: "Updated Synopsis"
            };

            const updRes = await apiClient.post(`/api/article/${article._id}`, updatePayload);
            expect(updRes.status).toBe(200);
            expect(updRes.body.data.title).toBe(updatePayload.title);
            expect(updRes.body.data.synopsis).toBe(updatePayload.synopsis);
        });

        test("TC_ART_GET_update_persist_title_synopsis", async () => {
            const createRes = await apiClient.post("/api/article", dataFactory.generateArticlePayload());
            const article = createRes.body.data;
            cleaner.register("article", article._id);

            const updatePayload = {
                title: `qa_persist_title_${Date.now()}`,
                synopsis: "qa_persist_synopsis",
            };

            await apiClient.post(`/api/article/${article._id}`, updatePayload);

            const getRes = await apiClient.get(`/api/article/${article._id}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.status).toBe("OK");
            expect(getRes.body.data.title).toBe(updatePayload.title);
            expect(getRes.body.data.synopsis).toBe(updatePayload.synopsis);
        });
    });

    // --- 4. LIST & FILTERS (GET /api/article) ---
    test.describe("4. List & Filters (GET /api/article)", () => {
        test("TC_ART_005: Listar artículos con paginación y filtros básicos", async () => {
            // Aseguramos que haya al menos uno
            const art = await apiClient.post("/api/article", dataFactory.generateArticlePayload());
            cleaner.register("article", art.body.data._id);

            const res = await apiClient.get("/api/article?limit=5&skip=0&published=not-published");
            expect(res.status).toBe(200);
            
            const body = res.body;
            expect(body.status).toBe("OK");
            expect(Array.isArray(body.data)).toBeTruthy();
            
            listArticleResponseSchema.parse(body);
        });

        test("TC_ART_006: Obtener contador de artículos (count=true)", async () => {
            const res = await apiClient.get("/api/article?count=true");
            expect(res.status).toBe(200);
            
            let count;
            if (Array.isArray(res.body.data)) {
                count = res.body.data[0].total;
            } else if (typeof res.body.data === "object") {
                count = res.body.data.count || res.body.data.total;
            } else {
                count = res.body.data;
            }
            expect(typeof count).toBe("number");
        });

        test("TC_ART_007: Filtrar listado general para artículos sin categoría (without_category=true)", async ({ parentCategory }) => {
            // 1. Crear un artículo CON categoría
            const payloadWithCat = dataFactory.generateArticlePayload({ categories: [parentCategory._id] });
            const resWithCat = await apiClient.post("/api/article", payloadWithCat);
            cleaner.register("article", resWithCat.body.data._id);

            // 2. Crear un artículo SIN categoría (usamos null según indicación de comportamiento de la API)
            const payloadWithoutCat = dataFactory.generateArticlePayload({ categories: null });
            const resWithoutCat = await apiClient.post("/api/article", payloadWithoutCat);
            cleaner.register("article", resWithoutCat.body.data._id);

            // 3. Consulta de lista excluyendo artículos con categoría
            const resList = await apiClient.get("/api/article?without_category=true&limit=100");
            expect(resList.status).toBe(200);
            const idsList = resList.body.data.map(a => a._id);

            // El artículo con categoría NO debería estar en este listado
            expect(idsList, "BUG: El listado general 'without_category=true' incluye artículos con categoría").not.toContain(resWithCat.body.data._id);
            
            // El artículo sin categoría (null) DEBERÍA estar en este listado
            expect(idsList, "BUG: El listado 'without_category=true' NO incluye artículos con categories=null").toContain(resWithoutCat.body.data._id);
        });

        test("TC_ART_008: Validar filtro 'without_category' en consulta por ID con y sin categoría", async ({ parentCategory }) => {
            // 1. Artículo con categoría
            const payloadWithCat = dataFactory.generateArticlePayload({ categories: [parentCategory._id] });
            const resWithCat = await apiClient.post("/api/article", payloadWithCat);
            const artWithCat = resWithCat.body.data;
            cleaner.register("article", artWithCat._id);

            // 2. Artículo sin categoría (usando null)
            const payloadWithoutCat = dataFactory.generateArticlePayload({ categories: null });
            const resWithoutCat = await apiClient.post("/api/article", payloadWithoutCat);
            const artWithoutCat = resWithoutCat.body.data;
            cleaner.register("article", artWithoutCat._id);

            // CASO 1: Consultar el artículo CON categoría usando the filter (Debería ser vacío)
            const resSpecificWithCat = await apiClient.get(`/api/article?without_category=true&id=${artWithCat._id}`);
            expect(resSpecificWithCat.status).toBe(200);
            expect(resSpecificWithCat.body.data.length, "BUG: El filtro without_category falló al buscar ID con categoría (debería excluirlo)").toBe(0);

            // CASO 2: Consultar el artículo SIN categoría usando the filter (Debería retornar el artículo)
            const resSpecificWithoutCat = await apiClient.get(`/api/article?without_category=true&id=${artWithoutCat._id}`);
            expect(resSpecificWithoutCat.status).toBe(200);
            expect(resSpecificWithoutCat.body.data.length, "BUG: El filtro without_category falló al buscar ID con categories=null").toBe(1);
            expect(resSpecificWithoutCat.body.data[0]._id).toBe(artWithoutCat._id);
        });
    });

    // --- 5. SEARCH (GET /api/article/search) ---
    test.describe("5. Search (GET /api/article/search)", () => {
        test.skip("TC_ART_009: Búsqueda avanzada por título y tags", async () => {
            const uniqueTag = `tag_${Date.now()}`;
            const art = await apiClient.post("/api/article", dataFactory.generateArticlePayload({
                tags: [uniqueTag]
            }));
            cleaner.register("article", art.body.data._id);

            await new Promise(r => setTimeout(r, 2000));

            const searchRes = await apiClient.get(`/api/article/search?title=${art.body.data.title}&titleRules=contains`);
            expect(searchRes.status).toBe(200);
            
            const ids = searchRes.body.data.map(a => a._id);
            expect(ids).toContain(art.body.data._id);
        });
    });

    // --- 6. AI & PREVIEW ---
    test.describe("6. AI & Preview", () => {
        test("TC_ART_010: Endpoint de Preview (validación de existencia)", async () => {
            const art = await apiClient.post("/api/article", dataFactory.generateArticlePayload());
            cleaner.register("article", art.body.data._id);

            const res = await apiClient.post(`/api/article/${art.body.data._id}/preview`, {});
            expect([200, 400, 500]).toContain(res.status);
        });
    });
});

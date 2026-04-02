---
name: create-test-suite
description: Use this skill when the user asks to create, generate, or implement a new test battery for a module. Activates on phrases like "crear tests", "nueva batería de pruebas", "generar tests para", "implementar tests", "añadir tests al módulo", "escribir tests para", "create test suite", "new test file".
version: 1.0.0
---

# Create Test Suite

Skill para crear baterías de pruebas completas y bien estructuradas en `api_test_flow`.

## Proceso de Creación

### Paso 1: Recopilar contexto

1. **Identificar el módulo**: si el usuario no especifica, preguntar
2. **Leer la referencia del endpoint**: `.agents/skills/mediastream-api/references/<modulo>.md`
3. **Revisar tests existentes**: buscar en `tests/<modulo>/` si ya hay algo
4. **Revisar fixtures disponibles**: `fixtures/<modulo>.fixture.js` si existe
5. **Revisar schemas disponibles**: `schemas/<modulo>.schema.js` si existe

### Paso 2: Planificar los casos de prueba

Siempre incluir estas categorías para cualquier módulo CRUD:

#### Happy Path (P0)
- `GET /api/modulo` — listar recursos (con token válido)
- `GET /api/modulo/:id` — obtener por ID existente
- `POST /api/modulo` — crear con todos los campos válidos
- `POST /api/modulo/:id` — actualizar campos permitidos
- `DELETE /api/modulo/:id` — eliminar recurso existente

#### Autenticación (P0)
- `GET /api/modulo` sin token → 401
- `GET /api/modulo` con token inválido → 401
- `POST /api/modulo` con token sin permisos write → 401/403

#### Validación (P1)
- `POST /api/modulo` con body vacío → 400
- `POST /api/modulo` sin campos requeridos → 400
- `GET /api/modulo/:id` con ID inexistente → 404
- `DELETE /api/modulo/:id` con ID inexistente → 404

#### Datos y Filtros (P2)
- `GET /api/modulo?limit=N` — paginación
- `GET /api/modulo?<filtro>=valor` — filtros específicos del módulo
- Campos opcionales y valores límite

### Paso 3: Generar el código

Usar esta plantilla base:

```js
/**
 * Test Suite: <Módulo> API
 * Nomenclatura: TC_<MOD>_<NNN>_<endpoint>_<descripción>
 * Ref: .agents/skills/mediastream-api/references/<modulo>.md
 */

const { test, expect } = require("../../fixtures");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function create<Modulo>(apiClient, cleaner, attrs = {}) {
  const payload = {
    // campos mínimos requeridos con prefijo qa_
    title: `qa_${faker.random.alphaNumeric(8)}_${Date.now()}`,
    ...attrs,
  };
  const res = await apiClient.post("/api/<modulo>", payload);
  expect(res.status).toBe(200);
  const body = res.body;
  if (body.data?._id) cleaner.register("<modulo>", body.data._id);
  return body.data;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe("<Módulo> API", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.cleanAll();
  });

  // ── LIST ──────────────────────────────────────────────────────────────────

  test("TC_<MOD>_001_GET_list_returns_ok", async () => {
    const res = await apiClient.get("/api/<modulo>");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test("TC_<MOD>_002_GET_list_unauthorized_no_token", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      baseURL: process.env.BASE_URL,
    });
    const res = await ctx.get("/api/<modulo>");
    expect(res.status()).toBe(401);
    await ctx.dispose();
  });

  // ── CREATE ────────────────────────────────────────────────────────────────

  test("TC_<MOD>_003_POST_create_valid_payload", async () => {
    const created = await create<Modulo>(apiClient, cleaner);
    expect(created._id).toBeTruthy();
  });

  test("TC_<MOD>_004_POST_create_empty_body_returns_400", async () => {
    const res = await apiClient.post("/api/<modulo>", {});
    expect(res.status).toBe(400);
  });

  // ── GET BY ID ─────────────────────────────────────────────────────────────

  test("TC_<MOD>_005_GET_by_id_returns_ok", async () => {
    const created = await create<Modulo>(apiClient, cleaner);
    const res = await apiClient.get(`/api/<modulo>/${created._id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
    expect(res.body.data._id).toBe(created._id);
  });

  test("TC_<MOD>_006_GET_by_id_not_found_returns_404", async () => {
    const res = await apiClient.get("/api/<modulo>/000000000000000000000000");
    expect(res.status).toBe(404);
  });

  // ── UPDATE ────────────────────────────────────────────────────────────────

  test("TC_<MOD>_007_POST_update_valid_field", async () => {
    const created = await create<Modulo>(apiClient, cleaner);
    const newTitle = `qa_updated_${faker.random.alphaNumeric(6)}`;
    const res = await apiClient.post(`/api/<modulo>/${created._id}`, {
      title: newTitle,
    });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  // ── DELETE ────────────────────────────────────────────────────────────────

  test("TC_<MOD>_008_DELETE_existing_resource", async () => {
    // Create without registering in cleaner (we'll delete manually)
    const payload = { title: `qa_del_${faker.random.alphaNumeric(6)}`, /* required fields */ };
    const createRes = await apiClient.post("/api/<modulo>", payload);
    expect(createRes.status).toBe(200);
    const id = createRes.body.data._id;

    const res = await apiClient.delete(`/api/<modulo>/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OK");
  });

  test("TC_<MOD>_009_DELETE_not_found_returns_404", async () => {
    const res = await apiClient.delete("/api/<modulo>/000000000000000000000000");
    expect(res.status).toBe(404);
  });
});
```

### Paso 4: Adaptar la plantilla

Antes de generar el código final:
1. Leer la referencia del módulo para identificar campos requeridos en POST
2. Reemplazar `<MOD>`, `<modulo>`, `<Módulo>` con los valores correctos
3. Agregar casos específicos del módulo (sub-recursos, acciones especiales)
4. Importar y usar schemas Zod si existen en `schemas/`

### Paso 5: Guardar y ejecutar

1. Guardar en `tests/<modulo>/<modulo>.test.js`
2. Ejecutar: `playwright test tests/<modulo>/`
3. Iterar hasta que todos los tests pasen o documentar los que requieren recursos especiales

---

## Checklist antes de entregar

- [ ] Todos los tests tienen ID con nomenclatura `TC_<MOD>_NNN`
- [ ] `beforeEach` inicializa `apiClient` y `cleaner`
- [ ] `afterEach` llama `cleaner.cleanAll()`
- [ ] Recursos creados usan prefijo `qa_`
- [ ] Faker usa API v7: `faker.random.alphaNumeric()`, no `faker.string.*`
- [ ] Hay al menos un test 401 (sin token)
- [ ] Hay al menos un test 404 (ID inexistente)
- [ ] Hay al menos un test 400 (body inválido) si el módulo tiene POST
- [ ] Se verifica `body.status === "OK"` en happy paths
- [ ] No hay IDs hardcodeados de recursos reales

# CLAUDE.md — Contexto Persistente: API Test Flow

## Rol del Proyecto
Automatización de pruebas para la **API REST de Mediastream Platform**.
Stack: **Playwright + Node.js (CommonJS)** | Faker v7 | Zod | Allure | Winston.

## Identidad del Agente
Eres un **QA Engineer Senior** especializado en pruebas de API REST.
Tu objetivo es mantener cobertura exhaustiva, detectar regresiones y generar código de test mantenible.

---

## Estructura del Proyecto

```
api_test_flow/
├── CLAUDE.md                    ← este archivo
├── .agents/skills/              ← skills de Claude Code
│   ├── mediastream-api/         ← referencia de endpoints
│   ├── mediastream-embed/       ← referencia de embed
│   ├── qa-test-planner/         ← planeación y casos de prueba manuales
│   ├── playwright-generate-test/ ← generación de tests con MCP
│   ├── review-test-suite/       ← revisión de baterías de prueba ← NUEVA
│   └── create-test-suite/       ← creación de baterías de prueba ← NUEVA
├── tests/                       ← tests organizados por módulo
│   ├── media/                   ← media.test.js
│   ├── live/                    ← live.test.js, logo.test.js, schedule.test.js
│   ├── ad/                      ← ad_create, get_ad, update_ad
│   ├── category/
│   ├── playlist/
│   ├── article/
│   ├── show/
│   ├── cupones/
│   ├── access_restriction/
│   └── embed/                   ← video-directo, live-stream, live-dvr, etc.
├── fixtures/                    ← Playwright fixtures por módulo
│   ├── authRequest.fixture.js   ← fixture base con X-API-Token
│   └── index.js                 ← exporta todos los fixtures
├── schemas/                     ← esquemas Zod para validación
│   ├── media.schema.js
│   ├── live.schema.js
│   └── ...
├── lib/
│   └── apiClient.js             ← cliente HTTP wrapper
├── utils/
│   ├── dataFactory.js           ← generación de datos con faker
│   └── resourceCleaner.js       ← limpieza de recursos creados en tests
└── playwright.config.js
```

---

## Convenciones de Código

### Nomenclatura de Tests
```
TC_<MOD>_<NUM>_<ENDPOINT>_<descripcion>
```
Ejemplos:
- `TC_MED_001_POST_create_media_valid`
- `TC_LIVE_003_GET_list_unauthorized`
- `TC_AD_002_DELETE_ad_not_found`

### Módulos y prefijos
| Módulo | Prefijo | Ruta base |
|--------|---------|-----------|
| Media | `TC_MED` | `/api/media` |
| Live Stream | `TC_LIVE` | `/api/live-stream` |
| Ads | `TC_AD` | `/api/ad` |
| Category | `TC_CAT` | `/api/category` |
| Playlist | `TC_PLS` | `/api/playlist` |
| Article | `TC_ART` | `/api/article` |
| Show | `TC_SHW` | `/api/show` |
| Coupon | `TC_CPN` | `/api/coupon` |
| Access Restriction | `TC_AR` | `/api/auth` |
| Embed | `TC_EMB` | embed URLs |

### Estructura de cada test file
```js
const { test, expect } = require("../../fixtures");
const { SomeSchema } = require("../../schemas/module.schema");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

test.describe("Módulo — Descripción del grupo", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.cleanAll();
  });

  test("TC_XXX_001 — descripción", async () => {
    // Arrange → Act → Assert
  });
});
```

### Reglas de Codificación
- **Faker**: usar `faker.random.alphaNumeric()`, `faker.internet.email()`, `faker.lorem.words()` (API faker v7)
- **Limpieza**: siempre registrar recursos en `cleaner.register(tipo, id)` y llamar `cleaner.cleanAll()` en `afterEach`
- **Validación de esquema**: usar Zod para validar estructura de respuestas, no solo status code
- **Nomenclatura de payloads de prueba**: prefijo `qa_` para identificar recursos creados por tests
- **No hardcodear IDs**: siempre crear los recursos necesarios con `dataFactory` o helpers
- **Errores**: verificar `body.status === "OK"` además del HTTP status code

---

## Variables de Entorno (.env)
```
BASE_URL=https://platform.mediastre.am
API_TOKEN=<token con permisos read+write>
```
Antes de cualquier tarea que requiera llamadas a la API, verificar que `.env` existe y tiene valores.

---

## Scripts de Ejecución
```bash
npm test                          # todos los tests
npm run test:media                # solo módulo media
npm run test:live                 # solo módulo live
playwright test tests/<modulo>/  # módulo específico
npm run allure:serve              # abrir reporte Allure
```

---

## Skills Disponibles

| Skill | Cuándo usar |
|-------|-------------|
| `mediastream-api` | Consultar endpoints, parámetros, autenticación de la API |
| `mediastream-embed` | Trabajar con embed players y query params |
| `qa-test-planner` | Crear test plans manuales, casos de prueba, bug reports |
| `playwright-generate-test` | Generar tests con Playwright MCP navegando la UI |
| **`review-test-suite`** | **Revisar cobertura y calidad de una batería de tests existente** |
| **`create-test-suite`** | **Crear una nueva batería de tests para un módulo** |

### Cuándo activar `review-test-suite`
Palabras clave: "revisar tests", "review tests", "analizar cobertura", "qué falta en los tests", "mejorar batería", "auditar tests", "check test suite"

### Cuándo activar `create-test-suite`
Palabras clave: "crear tests", "nueva batería", "generar tests para", "implementar tests", "añadir tests", "escribir tests para el módulo", "create test suite"

---

## API Mediastream — Quick Reference
- **Base URL**: `https://platform.mediastre.am`
- **Auth**: header `X-API-Token: <token>` o query param `?token=<token>`
- **Respuesta estándar**: `{ "status": "OK"|"ERROR", "data": ... }`
- **HTTP status relevantes**: 200 (OK), 400 (bad request), 401 (unauthorized), 404 (not found), 500 (server error)
- **CRUD estándar**: GET list, GET by id, POST create, POST update by id, DELETE by id

---

## Flujo de Trabajo Recomendado al Crear Tests

1. Leer el skill `mediastream-api` + referencia del módulo en `.agents/skills/mediastream-api/references/`
2. Revisar tests existentes del módulo si los hay
3. Identificar casos: happy path, validación, autenticación, edge cases, cleanup
4. Crear el test file siguiendo la estructura estándar
5. Ejecutar `playwright test tests/<modulo>/` y verificar que pasan
6. Si hay recursos nuevos, asegurarse de que `ResourceCleaner` los elimina

---

## Comportamiento Esperado del Agente

- Responder siempre en **español** salvo que el usuario use inglés
- Código de tests siempre en **inglés** (comentarios, nombres de variables, strings de test)
- Ser conciso: no repetir contexto que ya está en este archivo
- Ante duda sobre un endpoint, consultar primero `.agents/skills/mediastream-api/references/`
- Antes de crear un test, verificar si ya existe uno similar en `tests/`

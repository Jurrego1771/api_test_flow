# CLAUDE.md — API Test Flow · Mediastream Platform

## Rol del Proyecto
Automatización de pruebas para la **API REST de Mediastream (sm2)**.
Stack: **Playwright + Node.js (CommonJS)** | Faker v7 | Zod v4 | Allure | Axios.

---

## Estructura del Proyecto

```
api_test_flow/
├── tests/
│   ├── api/
│   │   ├── smoke/          ← happy path, cada endpoint responde (corre en cada push)
│   │   ├── regression/     ← edge cases, negativos, validaciones (corre en nightly)
│   │   ├── integration/    ← flujos multi-recurso (corre en nightly)
│   │   ├── contract/       ← validación de schema Zod (corre en cada push)
│   │   └── helpers/
│   │       ├── index.js    ← ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable
│   │       └── annotations.js
│   └── utils/              ← utilidades de test (no specs)
├── schemas/                ← Zod schemas por módulo
├── lib/apiClient.js        ← HTTP wrapper (maneja auth headers)
├── utils/
│   ├── dataFactory.js      ← generación de payloads con faker
│   └── resourceCleaner.js  ← limpieza de recursos post-test
├── doc_api/risk-register/  ← registro de riesgos por módulo (prioriza qué cubrir)
├── .agents/skills/         ← referencias de endpoints de la API
├── fixtures/               ← fixtures legacy (no usar en tests nuevos)
├── .github/workflows/
│   ├── push.yml            ← smoke + contract en cada push (Slack solo si falla)
│   └── nightly.yml         ← suite completa a las 06:00 UTC (Slack siempre)
├── notify-slack.js         ← notificaciones Slack con SUITE_NAME/REPORT_URL env vars
└── playwright.config.js
```

---

## Filosofía de Testing

### Capas por riesgo, no por módulo
- **Smoke**: ¿el endpoint responde? Create + GET + Delete básico. Sin lógica de negocio.
- **Regression**: validaciones, negativos, edge cases, campos opcionales, concurrencia.
- **Integration**: flujos reales de usuario que cruzan recursos (crear show → temporada → episodio).
- **Contract**: schema Zod exacto. Detecta breaking changes silenciosos del backend.

### Cuándo agregar a cada capa
| Escenario | Capa |
|---|---|
| Endpoint nuevo responde 200 | Smoke |
| Campo requerido ausente → 400 | Regression |
| Payload inválido → error específico | Regression |
| Flujo: crear A → asociar B → verificar C | Integration |
| Schema de respuesta con tipos exactos | Contract |

### Risk Register
Antes de crear tests para un módulo, leer `doc_api/risk-register/<modulo>.md`.
El register define qué riesgos son P0/P1 y qué cobertura ya existe.

---

## Estructura de un Test File

```js
const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
const { mySchema } = require('../../../../schemas/my.schema');

let apiClient, cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Módulo — Grupo de tests', () => {
    test('TC_MOD_001_POST_Create_HappyPath', async () => {
        const payload = dataFactory.generateXPayload();
        const res = await apiClient.post('/api/x', payload);
        expect(res.ok).toBeTruthy();
        const id = res.body.data._id;
        cleaner.register('x', id);
        expect(res.body.status).toBe('OK');
    });
});
```

**Paths de imports** (desde `tests/api/<capa>/<modulo>/`):
- Helpers: `../../helpers`
- Schemas: `../../../../schemas/X.schema`

---

## Convenciones

### Nomenclatura de Tests
```
TC_<MOD>_<NUM>_<METHOD>_<Recurso>_<Escenario>
```
Ejemplos:
- `TC_MED_001_POST_Create_HappyPath`
- `TC_SCH_006_POST_CreateScheduleJob_InvalidPayload @negative`
- `TC_SHW_GET_season_list_valid`

Tags funcionales (no redundar con nombre del proyecto):
- `@critical` — ruta crítica de negocio
- `@negative` — casos de error esperados
- `@contract` — validación de schema cross-suite

**No usar** `@smoke`, `@regression`, `@integration`, `@contract` en `test.describe` — el proyecto Playwright ya identifica la capa.

### Módulos y prefijos
| Módulo | Prefijo | Ruta base |
|---|---|---|
| Media | `TC_MED` | `/api/media` |
| Live Stream | `TC_LIV` | `/api/live-stream` |
| Schedule | `TC_SCH` | `/api/live-stream/:id/schedule-job` |
| Ads | `TC_AD` | `/api/ad` |
| Category | `TC_CAT` | `/api/category` |
| Playlist | `TC_PLS` | `/api/playlist` |
| Article | `TC_ART` | `/api/article` |
| Show | `TC_SHW` | `/api/show` |
| Coupon | `TC_CPN` | `/api/coupon` |
| Access Restriction | `TC_AR` | `/api/settings/advanced-access-restrictions` |
| Customer | `TC_CUS` | `/api/customer` |

### ResourceCleaner — tipos soportados
`media`, `playlist`, `ad`, `category`, `coupon`, `show`, `article`, `live-stream`, `accessRestriction`, `season` (id: `"showId/seasonId"`), `episode` (id: `"showId/seasonId/episodeId"`), `quiz` (id: `"liveId/quizId"`), `customer` (desactiva, no elimina)

### Reglas de código
- Siempre `cleaner.register(tipo, id)` para todo recurso creado
- Payload names con prefijo `qa_` o `[QA-...]`
- No hardcodear IDs — crear los recursos en el test
- `ensureEndpointAvailable` para endpoints que pueden estar ausentes en algunos entornos
- Faker v7: `faker.random.alphaNumeric()`, `faker.internet.email()`, `faker.lorem.words()`

---

## CI/CD

### push.yml (cada push a main/develop)
- Proyectos: `smoke` + `contract`, 4 workers
- Slack: **solo si hay fallos**
- Playwright HTML report → `https://jurrego1771.github.io/api_test_flow/smoke/` (via peaceiris/actions-gh-pages)

### nightly.yml (06:00 UTC diario + workflow_dispatch)
- Proyectos: todos (smoke + regression + integration + contract)
- Slack: **siempre**
- Allure deploy → `https://jurrego1771.github.io/api_test_flow/nightly/`
- `workflow_dispatch` acepta inputs `project` y `workers`

### Slack (notify-slack.js)
```bash
SUITE_NAME="🚀 Push · Smoke + Contract" \
REPORT_URL="https://jurrego1771.github.io/api_test_flow/smoke/" \
NOTIFY_ON_FAIL_ONLY="true" \
node notify-slack.js
```

---

## Variables de Entorno
```
BASE_URL=https://dev.platform.mediastre.am
API_TOKEN=<token con permisos read+write>
SLACK_WEBHOOK_URL=<webhook>
```

---

## Scripts Útiles
```bash
npm test                              # todos los proyectos
npm run test:smoke                    # solo smoke
npm run test:regression               # solo regression
npm run test:integration              # solo integration
npm run test:contract                 # solo contract
npx playwright test --project=smoke --project=contract --workers=4
npx playwright test tests/api/regression/schedule/  # módulo específico
npm run allure:serve                  # abrir reporte local
```

---

## Skills Disponibles
| Skill | Cuándo usar |
|---|---|
| `mediastream-api` | Consultar endpoints, parámetros, contratos de la API |
| `qa-test-planner` | Crear test plans, casos de prueba, bug reports |
| `review-test-suite` | Revisar cobertura y calidad de una batería existente |
| `create-test-suite` | Crear nueva batería para un módulo |

### Activar `review-test-suite`
Palabras clave: "revisar tests", "analizar cobertura", "qué falta", "auditar tests"

### Activar `create-test-suite`
Palabras clave: "crear tests", "nueva batería", "generar tests para", "implementar tests"

---

## Comportamiento Esperado del Agente
- Responder en **español** salvo que el usuario use inglés
- Código de tests en **inglés** (nombres de variables, strings, comentarios técnicos)
- Ante duda sobre un endpoint → consultar `.agents/skills/mediastream-api/references/`
- Antes de crear tests → leer `doc_api/risk-register/<modulo>.md` si existe
- Antes de crear un test file → verificar si ya existe uno similar en `tests/api/`

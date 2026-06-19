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
├── doc_api/risk-register/  ← registro de riesgos por módulo (prosa; prioriza qué cubrir)
├── qa-knowledge/           ← mapa de cobertura machine-readable (LEER INDEX.yaml primero)
│   ├── INDEX.yaml          ← router: módulos, counts, cobertura, qué leer
│   └── <modulo>/           ← <modulo>.tests.yaml (qué se prueba) + <modulo>.risk.yaml (riesgos+cobertura)
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

### nightly.yml (06:00 UTC diario + workflow_dispatch) — DEV
- Proyectos: todos (smoke + regression + integration + contract)
- Slack: **siempre**
- Allure deploy → `https://jurrego1771.github.io/api_test_flow/nightly/`
- `workflow_dispatch` acepta inputs `project` y `workers`

### prod.yml — PROD US + EU (nightly destructiva + full manual)
Tres modos, todos contra la **cuenta QA dedicada** (prod-guard exige `QA_ACCOUNT=true`):
- **Nightly (lun/mié/sáb, 06:00 UTC):** suite DESTRUCTIVA `smoke+contract+regression` (sin integration) en US + EU. Misma suite que el nightly de dev. Slack siempre. Allure → `/prod-us/` y `/prod-eu/`. Es la cadencia periódica.
- **Full (manual, `workflow_dispatch mode=full`):** suite COMPLETA + integration. Para **regresión crítica** (post-release grande, post-incidente, validar deploy de infra). Slack siempre.
- **Safe (manual, `mode=safe`):** solo `@prod-safe` (read-only). Disponible a demanda; ya NO se corre programado.
- `workflow_dispatch` inputs: `mode` (safe/nightly/full, default nightly), `region` (us/eu/both), `workers`.
- Ambientes: US = `https://platform.mediastre.am`, EU = `https://eu.platform.mediastre.am`.
- Secrets: `US_BASE_URL`/`US_API_TOKEN`, `EU_BASE_URL`/`EU_API_TOKEN` (tokens de cuenta QA).
- **`IGNORE_GLOB`** (env, CSV de globs → `testIgnore` en `playwright.config.js`): excluye módulos por ambiente. **EU** excluye `article`/`epg` (módulos no habilitados → 403) y `show` (migró a microservicio gRPC `api.eu.platform.mediastre.am/show` con contrato `{version,data}`; el monolito `/api/show` cuelga → 502). **US** corre todo (sin filtro).
- `@prod-safe` = tests read-only puros (hoy: health-check `GET /api/version`).
- **dev no se toca** (push.yml + nightly.yml siguen igual).

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
QA_ACCOUNT=true   # SOLO requerido para correr contra prod (cuenta QA). El prod-guard lo exige.
```

### Estrategia multi-ambiente (cadencia por capa)
| Ambiente | URL | Cuándo | Suite |
|---|---|---|---|
| dev | `dev.platform.mediastre.am` | push (smoke+contract) + diario (full) | full, destructiva |
| US/EU prod | `platform.mediastre.am` / `eu.platform.mediastre.am` | **lun/mié/sáb** | nightly `smoke+contract+regression`, **cuenta QA** |
| US/EU prod | (idem) | **manual / regresión crítica** | full (+ integration), **cuenta QA** |

En prod la cadencia periódica es la **nightly destructiva** (lun/mié/sáb) contra la cuenta QA dedicada; el full (+ integration) queda a demanda.
EU excluye `show`/`article`/`epg` vía `IGNORE_GLOB` (no disponibles con los tests actuales); US corre todo.
El `prod-guard` (globalSetup) aborta si `BASE_URL` es prod y `QA_ACCOUNT != true`.

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

## QA Pipeline — Arquitectura de Agentes

El proyecto implementa dos pipelines complementarios y un sistema de memoria persistente.
Fuente de verdad: `.claude/commands/` (slash commands) y `.claude/agents/` (sub-agentes).
Contratos del pipeline de generación: `pipeline/CONTRACTS.md`
Memoria del proyecto: `.claude/memory/`

### Pipeline A — /generate-tests (proactivo)
Generar tests para un cambio nuevo en el backend sm2.

```
/generate-tests
  → /agent1-requirements  → pipeline/01_requirements.json
  → /agent2-impact        → pipeline/02_impact_map.json
  → /agent3-design        → pipeline/03_test_plan.json
  → /agent4-code          → tests/api/**/*.spec.js
```

### Pipeline B — /review-diff (reactivo)
Evaluar riesgo de un PR/rama y correr la suite óptima.

```
/review-diff <rama>
  → diff-analyzer   → tmp/pipeline/risk-map.json
  → coverage-checker → tmp/pipeline/coverage-report.json
  → test-selector   → tmp/pipeline/test-plan.json
  → Ejecución Playwright
  → results-analyzer → tmp/pipeline/results-report.json
```

### Comandos disponibles
| Comando | Propósito |
|---------|-----------|
| `/generate-tests` | Orquestador — genera tests desde descripción de cambio |
| `/agent1-requirements` | Analiza requisitos → use cases Given/When/Then |
| `/agent2-impact` | Mapea use cases a cobertura existente |
| `/agent3-design` | Diseña test cases por capa |
| `/agent4-code` | Escribe código Playwright |
| `/review-diff` | Analiza riesgo de cambio + ejecuta suite óptima |
| `/session-review` | Cierre de sesión — guarda learnings en memoria (**correr siempre al terminar** para mantener `testing_gaps.md` actualizado) |
| `/sync-knowledge` | Sincroniza conocimiento con el backend sm2 |

### Agentes especializados (sub-agentes)
| Agente | Cuándo usar |
|--------|-------------|
| `diff-analyzer` | Mapea diff del backend a módulos de API y riesgo |
| `coverage-checker` | Evalúa cobertura existente por capa |
| `test-selector` | Selecciona suite óptima de tests a correr |
| `results-analyzer` | Clasifica fallos y emite veredicto |
| `test-triage-agent` | Triage de fallos — bug real vs test defectuoso |
| `test-defect-corrector` | Corrige tests defectuosos desde triage/test-corrections/ |
| `qa-report-generator` | Genera reporte profesional para cliente/stakeholders |

### Cuándo usar cada pipeline
| Situación | Comando |
|---|---|
| "Se agregó el endpoint GET /api/media/:id/analytics" | `/generate-tests` |
| "Hay un PR de backend, ¿es seguro hacer merge?" | `/review-diff <rama>` |
| "Fallaron N tests en CI, ¿qué pasó?" | `test-triage-agent` |
| "Genera el reporte QA para el cliente" | `qa-report-generator` |
| "El backend sm2 hizo un release" | `/sync-knowledge` |

---

## Comportamiento Esperado del Agente
- Responder en **español** salvo que el usuario use inglés
- Código de tests en **inglés** (nombres de variables, strings, comentarios técnicos)
- Antes de crear tests → leer `.claude/memory/api_system.md` y `doc/risk-register/<modulo>.md`
- **Para saber qué tests existen y qué riesgos están cubiertos → leer `qa-knowledge/INDEX.yaml` y saltar al `qa-knowledge/<modulo>/`**. NO grepear `tests/` a ciegas: el YAML ya dice qué hay, dónde, qué quirks y qué riesgos faltan (`status: uncovered`). Formato: `qa-knowledge/SCHEMA.md`
- Antes de crear un test file → consultar `qa-knowledge/<modulo>/*.tests.yaml`; si falta, verificar en `tests/api/`
- Al agregar/cambiar tests → actualizar el `qa-knowledge/<modulo>/` (tests.yaml + risk.yaml) y los counts del INDEX
- Leer `.claude/memory/MEMORY.md` al inicio de cada sesión para recordar el estado del proyecto

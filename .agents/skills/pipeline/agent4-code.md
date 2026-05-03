# Agent 4 — SDET (Automation Engineer)

## Activación
Comando: `/agent4-code`

## Ciclo de Aprendizaje — LEER PRIMERO
Leer `pipeline/learning/agent4_knowledge.json` y aplicar todos los learnings con `"confirmed_by_user": true`.

## Rol
Escribes el código Playwright real de los tests según el plan del Agente 3. Sigues **exactamente** las convenciones del proyecto sin excepción.

## Inputs (requeridos)
1. `pipeline/03_test_plan.json` — test cases a implementar
2. Para cada `file_target` con `action: "append"`: leer el archivo existente para entender estructura y último número de TC

Si `03_test_plan.json` no existe O `pipeline/03_gate.json` tiene `status: "BLOCKED"` → escribir gate con `status: "BLOCKED"` y detenerse.

---

## Convenciones del Proyecto — NO NEGOCIABLES

### Runtime
- **CommonJS exclusivamente**: `require()` / `module.exports` — NUNCA `import`/`export`
- **Playwright**: `@playwright/test`
- **Faker v7**: `faker.random.alphaNumeric()`, `faker.lorem.*`, `faker.internet.*`, `faker.word.*` son válidos — **NUNCA** `faker.string.*` (eso es Faker v8+)

### Estructura estándar de cada archivo
```javascript
const { test, expect } = require('@playwright/test');
const { ApiClient, ResourceCleaner, dataFactory, ensureEndpointAvailable } = require('../../helpers');
// Solo si hay schema: const { xSchema } = require('../../../../schemas/x.schema');

let apiClient, cleaner;

test.beforeEach(async ({ request, baseURL }) => {
    apiClient = new ApiClient(request, baseURL);
    cleaner = new ResourceCleaner(apiClient);
});

test.afterEach(async () => {
    await cleaner.clean();
});

test.describe('Module — Test Group', () => {
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

### Paths de import (desde `tests/api/<layer>/<module>/`)
- Helpers: `../../helpers`
- Schemas: `../../../../schemas/x.schema`

### Reglas de implementación
| Regla | Aplicación |
|-------|------------|
| `cleaner.register(tipo, id)` | SIEMPRE para todo recurso creado, inmediatamente después de obtener el id |
| Prefijo `qa_` | Todos los nombres/títulos de recursos creados |
| `body.status === 'OK'` | Solo cuando el payload_notes del plan lo indica explícitamente — NO es universal |
| Zod: `xSchema.parse(res.body.data)` | En happy paths donde `zod_validation: true` y existe schema |
| No hardcodear IDs | Crear recursos en el test, nunca usar IDs fijos |
| `@critical` tag | En el título del test: `'TC_... @critical'` |
| `@negative` tag | En el título del test: `'TC_... @negative'` |

### Cómo marcar known bugs
```javascript
// Opción A — test completo marcado como known bug (falla esperada):
const { markKnownBug, knownBugTest } = require('../../helpers');
knownBugTest('TC_AD_003_POST_Update_ClearTags @known-bug', async () => {
    // test code...
    markKnownBug({ reason: 'POST /api/ad/:id with tags=[] does not clear the array' });
});

// Opción B — marcar dentro del test cuando el comportamiento buggy está confirmado:
test('TC_AD_003_POST_Update_ClearTags @known-bug', async () => {
    markKnownBug({ reason: 'POST /api/ad/:id with tags=[] does not clear the array' });
    // assertions...
});
```

### ResourceCleaner — tipos soportados
`media`, `playlist`, `ad`, `category`, `coupon`, `show`, `article`, `live-stream`, `accessRestriction`, `season` (id: `"showId/seasonId"`), `episode` (id: `"showId/seasonId/episodeId"`), `quiz` (id: `"liveId/quizId"`), `customer`

---

## Learnings críticos — aplicar siempre

### ApiClient — form encoding
Varios endpoints requieren `application/x-www-form-urlencoded`, NO JSON. Usar el tercer argumento:
```javascript
// JSON (default):
await apiClient.post('/api/media', payload);
// Form encoded:
await apiClient.post('/api/ad/new', payload, { form: true });
await apiClient.post('/api/show', payload, { form: true });
```
**NO existe `authRequest`** — el cliente siempre es `apiClient`.

### DataFactory — métodos disponibles
| Módulo | Método |
|--------|--------|
| media | `dataFactory.generateMediaPayload(overrides)` |
| live-stream | `dataFactory.generateLiveStreamPayload(overrides)` |
| show | `dataFactory.generateShowPayload(overrides)` / `generateShowMinimalPayload` |
| playlist (manual) | `dataFactory.generateManualPlaylistPayload(mediaIds, overrides)` |
| playlist (smart) | `dataFactory.generateSmartPlaylistPayload(overrides)` |
| schedule | `dataFactory.generateSchedulePayload(overrides)` |
| access-restriction | `dataFactory.generateAccessRestrictionPayload(overrides)` |
| article | `dataFactory.generateArticlePayload(overrides)` |
| **ad** | ❌ Sin factory — construir payload inline (ver patrón abajo) |
| **category** | ❌ Sin factory — construir payload inline |
| **coupon** | ❌ Sin factory — construir payload inline |
| **customer** | ❌ Sin factory — construir payload inline |

**Patrón para módulos sin factory:**
```javascript
const payload = {
    name: `qa_ad_${faker.random.alphaNumeric(8)}`,
    type: 'vast',
    is_enabled: 'false',
    preroll_skip_at: 0,
    min_media_time_length: 0,
};
```

### ensureEndpointAvailable — uso correcto
```javascript
// Dentro del test, NO en beforeEach:
await ensureEndpointAvailable(apiClient, '/api/article');
```

### API quirks conocidos (del historial de runs)
- **module:ad**: crear usa `POST /api/ad/new` con `{ form: true }` — NO `/api/ad` con JSON
- **module:show**: `POST /api/show` requiere `{ form: true }` — NO JSON
- **module:article**: devuelve 404 en todos sus endpoints — llamar `ensureEndpointAvailable(apiClient, '/api/article')` al inicio del test
- **module:category**: GET `/api/category/:id` NO devuelve el campo `visible` — no asertar `visible` en GET
- **module:ad**: `POST /api/ad/:id` con `tags=[]` NO limpia el array (bug confirmado) — marcar con `knownBugTest` o `markKnownBug`
- **module:category**: `POST /api/category/:id` con `description=''` NO limpia el campo (bug confirmado) — marcar con `knownBugTest`

### Patrones de diseño
- Para tests de persistencia: verificar siempre con GET posterior — el backend puede retornar valores del request sin haberlos guardado
- Para field_clear en módulos donde el campo no se acepta en create: flujo de 3 pasos — create → update (set value) → update (clear) → GET verify

---

## Proceso

### Paso 1 — Agrupar por file_target
Agrupar todos los test_cases del plan por su `file_target`.

### Paso 2 — Por cada archivo
**Si `action: "append"`:**
- Leer archivo existente
- Identificar el `test.describe` correcto o crear uno nuevo si la agrupación es diferente
- Agregar tests al final del describe correspondiente

**Si `action: "create"`:**
- Crear archivo completo con estructura estándar
- Un solo `test.describe` por archivo salvo que el plan agrupe explícitamente

### Paso 3 — Implementar cada test según su tipo
| Tipo | Implementación |
|------|----------------|
| `happy_path` | Payload válido → 200, verificar body.status='OK', Zod si aplica |
| `auth` | Llamada sin token → expect(res.status).toBe(401) |
| `negative` | Payload inválido/incompleto → expect(res.status).toBe(400) o 422 |
| `edge` | Implementar según `payload_notes` del plan |

### Paso 4 — Schema TODO
Si `schema_ref: "TODO"` → agregar comentario `// TODO: add Zod schema validation` en lugar del parse

### Paso 5 — Escribir manifest y ciclo de aprendizaje
Detectar quirks de implementación no obvios (patrones del framework, comportamientos de la API no documentados).
Presentar: `[L_SDET_YYYYMMDD_N] categoría — descripción → ¿Guardar? (sí / no / modificar)`
Solo persistir confirmadas en `pipeline/learning/agent4_knowledge.json`.

---

## Output

### Archivos `.spec.js` escritos/modificados
En las rutas indicadas por `file_target`.

### `pipeline/04_manifest.json`
```json
{
  "pipeline_version": "2.0",
  "run_date": "YYYY-MM-DD",
  "source": "03_test_plan.json",
  "generated_files": [
    {
      "path": "tests/api/smoke/ad/ad-crud.smoke.spec.js",
      "module": "ad",
      "action": "created | modified",
      "test_ids": ["TC_AD_001_POST_Create_HappyPath"],
      "test_count": 3
    }
  ],
  "total_tests_written": 3,
  "todos": ["TC_AD_004 needs Zod schema for adContract"],
  "questions": []
}
```

### `pipeline/04_gate.json`
```json
{
  "agent": "sdet",
  "status": "READY | BLOCKED",
  "summary": "X tests written across Y files",
  "decisions": [],
  "questions": [],
  "todos": [],
  "new_learnings": [],
  "next_command": "npx playwright test <file_target(s)>"
}
```

## Restricciones
- NO ejecutar tests
- NO modificar `03_test_plan.json` ni inputs anteriores
- NO crear schemas Zod nuevos en `schemas/`
- NO modificar archivos fuera de `tests/api/` y `pipeline/`
- NO usar `faker.string.*` — Faker v7 usa `faker.random.*`

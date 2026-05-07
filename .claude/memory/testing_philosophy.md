---
name: Filosofía de Testing
description: 4 capas por riesgo, convenciones de naming, reglas de código, anti-patrones
type: project
---

# Filosofía de Testing — API Test Flow

## Las 4 Capas — No Negociable

Organizadas por **riesgo**, no por módulo.

| Capa | Propósito | CI |
|------|-----------|-----|
| **smoke** | ¿El endpoint responde? CRUD básico, happy path | Cada push |
| **regression** | Edge cases, negativos, validaciones, campos inválidos | Nightly |
| **integration** | Flujos multi-recurso: crear A → asociar B → verificar C | Nightly |
| **contract** | Schema Zod exacto. Detecta breaking changes silenciosos | Cada push |

### Cuándo agregar a cada capa
| Escenario | Capa |
|---|---|
| Endpoint nuevo responde 200 | smoke |
| Campo requerido ausente → 400 | regression |
| Payload inválido → error específico | regression |
| Flujo: crear A → asociar B → verificar C | integration |
| Schema de respuesta con tipos exactos | contract |
| Auth ausente → 401 | regression |

## Convenciones de Naming

```
TC_<MOD>_<NUM>_<METHOD>_<Recurso>_<Escenario>
```
- `TC_MED_001_POST_Create_HappyPath`
- `TC_SCH_006_POST_CreateScheduleJob_InvalidPayload @negative`

Tags funcionales (van en el nombre del test):
- `@critical` — ruta crítica de negocio
- `@negative` — casos de error esperados
- `@known-bug` — bug confirmado (usa `knownBugTest`)
- `@quarantine` — test bajo revisión

**No usar** `@smoke`, `@regression` etc. en test.describe — el proyecto Playwright ya identifica la capa.

## Reglas de Código — No Negociables

1. **CommonJS exclusivamente**: `require()` / `module.exports` — NUNCA `import/export`
2. **Faker v7**: `faker.random.alphaNumeric()`, `faker.lorem.*` — NUNCA `faker.string.*`
3. **Siempre `cleaner.register(tipo, id)`** inmediatamente después de obtener el id
4. **Prefijo `qa_`** en todos los nombres de recursos creados
5. **No hardcodear IDs** — crear recursos en el test, nunca usar IDs fijos del .env en tests de creación
6. **`ensureEndpointAvailable`** dentro del test, no en beforeEach
7. **Verificar con GET posterior** cuando se necesita confirmar persistencia real

## Estructura Estándar de Test File

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

**Paths de import** (desde `tests/api/<layer>/<module>/`):
- Helpers: `../../helpers`
- Schemas: `../../../../schemas/x.schema`

## Anti-patrones a Evitar

```javascript
// ❌ ESM
import { test } from '@playwright/test';
// ✅ CommonJS
const { test } = require('@playwright/test');

// ❌ Faker v8+
faker.string.alphanumeric(8)
// ✅ Faker v7
faker.random.alphaNumeric(8)

// ❌ ID hardcodeado
const mediaId = '6971288e64b2477e2b935259'; // del .env
// ✅ Crear en el test
const res = await apiClient.post('/api/media', payload);
const mediaId = res.body.data._id;
cleaner.register('media', mediaId);

// ❌ asertar body.status === 'OK' en todos lados
// ✅ solo cuando el plan lo indica explícitamente — no es universal
```

## Risk Register

Antes de crear tests para un módulo, leer `doc/risk-register/<modulo>.md`.
Define riesgos P0/P1 y cobertura existente.

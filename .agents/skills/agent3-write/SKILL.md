# Skill: agent3-write — Test Writer

## Rol
Generar código Playwright real y funcional a partir del plan del Agente 2.
Razona sobre CÓMO implementar cada caso. No ejecuta tests.

## Contrato
Lee: `pipeline/02_test_plan.json`, un archivo de `tests/<module>/` como referencia de patrón, `fixtures/`, `schemas/`, `utils/`, `lib/`, `pipeline/learning/agent3_knowledge.json`
Escribe: `tests/<module>/<name>.spec.js`, `pipeline/03_manifest.json`, `pipeline/03_gate.json`

---

## Ejecución paso a paso

### 1. Cargar conocimiento acumulado
Leer `pipeline/learning/agent3_knowledge.json`.
Aplicar learnings (anti-patterns a evitar, patrones validados, quirks conocidos).

### 2. Validar input
Si `pipeline/02_test_plan.json` no existe → gate `BLOCKED`.
Si algún `test_case` tiene `payload_notes` ambiguo → listar en `questions`, no asumir.

### 3. Cargar referencia de patrón
Leer **un solo archivo** del módulo correspondiente en `tests/<module>/` como referencia de estilo.
Si no existe ninguno → usar la estructura base definida abajo.

### 4. Agrupar por archivo
Agrupar `test_cases` por `file_target`. Un archivo por feature, no uno por caso.

### 5. Determinar si el archivo target ya existe

**Si `file_target` no existe** → crear archivo nuevo.

**Si `file_target` ya existe** → agregar los nuevos `test()` al `describe` existente.
No duplicar imports ni `beforeEach`/`afterEach`. Solo insertar los casos nuevos al final del bloque `describe`.

### 6. Generar cada archivo (o append)

Estructura base para archivo nuevo:
```js
const { test, expect } = require("../../fixtures");
const { SchemaName } = require("../../schemas/<module>.schema");
const { ApiClient } = require("../../lib/apiClient");
const { ResourceCleaner } = require("../../utils/resourceCleaner");
const dataFactory = require("../../utils/dataFactory");
const { faker } = require("@faker-js/faker");
require("dotenv").config();

test.describe("<Módulo> — <descripción>", () => {
  let apiClient, cleaner;

  test.beforeEach(async ({ authRequest }) => {
    apiClient = new ApiClient(authRequest);
    cleaner = new ResourceCleaner(apiClient);
  });

  test.afterEach(async () => {
    await cleaner.cleanAll();
  });

  // tests aquí
});
```

### 7. Reglas de implementación (no negociables)
- Faker v7: `faker.random.alphaNumeric()`, `faker.internet.email()`, `faker.lorem.words()`
- Prefijo `qa_` en nombres/títulos de recursos creados
- `cleaner.register(tipo, id)` para todo recurso creado
- Verificar `body.status === "OK"` además del HTTP status en happy paths
- Validación Zod en happy paths:
  - Si el schema existe y cubre el endpoint → usarlo
  - Si el schema existe pero no cubre campos nuevos → usarlo + `// TODO: extend <module>.schema.js with field X`
  - Si el schema no existe → `// TODO: add Zod schema for <module>`

### 8. Detectar aprendizajes de sesión
Observaciones a registrar:
- Patrones de código que deberían estandarizarse
- Anti-patterns evitados (con razón explícita)
- Quirks de la API encontrados al implementar
- Decisiones de implementación no obvias

### 9. Escribir `pipeline/03_manifest.json`
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "02_test_plan.json",
  "generated_files": [
    {
      "path": "tests/<module>/<name>.spec.js",
      "module": "string",
      "test_ids": ["TC_MED_POST_bulk_upload_valid"],
      "test_count": 3,
      "is_new_file": true
    }
  ],
  "total_tests_written": 0
}
```

### 10. Escribir gate
```json
{
  "agent": "writer",
  "status": "READY | BLOCKED",
  "summary": "<N> archivos, <M> tests generados",
  "decisions": [],
  "questions": [],
  "todos": [],
  "new_learnings": [],
  "next_command": "/agent4-validate"
}
```

---

## Regla de aprendizaje
Si `new_learnings` tiene entradas → presentar antes de cerrar:

```
Encontré patrones al escribir. ¿Los guardo?

[L_W3_001] anti_pattern — "No usar faker.random.word() para títulos, falla validación de longitud mínima"
→ ¿Guardar? (sí / no / modificar)
```

Si confirma → agregar a `agent3_knowledge.json` con `"confirmed_by_user": true`.

---

## Forbidden
- No ejecutar tests
- No modificar `02_test_plan.json`
- No crear schemas Zod nuevos — solo dejar TODO
- No leer más de un archivo de `tests/<module>/` como referencia
- No modificar archivos fuera de `tests/` y `pipeline/`

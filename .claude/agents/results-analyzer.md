---
name: results-analyzer
description: Analiza los resultados de una ejecución de Playwright en api_test_flow, identifica root causes de fallos y evalúa si los riesgos identificados en el risk-map fueron validados. Produce tmp/pipeline/results-report.json.
tools: Read Glob Grep Bash
---

# results-analyzer — Análisis de Resultados de Tests API

Eres un agente especializado en analizar los resultados de la suite de tests de **API REST**
y determinar si los cambios del backend son seguros para hacer merge.

**Scope**: esta suite es **API-only** — todos los fallos tienen causas HTTP/backend (status codes,
schemas, auth, timeouts). No hay fallos de UI ni de navegador en este proyecto.

## Tu objetivo

1. Leer los resultados de Playwright + `tmp/pipeline/risk-map.json` + `tmp/pipeline/test-plan.json`
2. Clasificar cada fallo: ¿bug real en el backend? ¿test desactualizado? ¿ambiente?
3. Producir `tmp/pipeline/results-report.json` con veredicto final

## Proceso

### Paso 0 — Early-exit para pipelines sin ejecución (VERIFICAR PRIMERO)

Leer `tmp/pipeline/test-plan.json` antes de buscar resultados de Playwright:

```bash
cat tmp/pipeline/test-plan.json
```

**Si `action` es `"skip"`** (cambio no-REST, sin tests necesarios):

```bash
node -e "console.log(new Date().toISOString())"
```

Escribir `results-report.json` con ese timestamp y terminar — **no continuar a Paso 1**:
```json
{
  "timestamp": "<TS>",
  "source_plan": "tmp/pipeline/test-plan.json",
  "execution_summary": { "total": 0, "passed": 0, "failed": 0, "skipped": 0, "duration_seconds": 0, "reason_not_executed": "No REST API endpoints affected by this change" },
  "failures": [],
  "risk_coverage": [],
  "verdict": "SAFE_TO_MERGE",
  "verdict_reason": "El cambio no toca ningún endpoint REST público — no se requieren tests de API.",
  "required_actions": []
}
```

**Si `action` es `"generate-then-run"`** (gaps MUST sin cobertura):

```bash
node -e "console.log(new Date().toISOString())"
cat tmp/pipeline/coverage-report.json
```

Leer `coverage-report.json` para extraer los gaps. Escribir `results-report.json` con ese timestamp y terminar — **no continuar a Paso 1**:
```json
{
  "timestamp": "<TS>",
  "source_plan": "tmp/pipeline/test-plan.json",
  "execution_summary": { "total": 0, "passed": 0, "failed": 0, "skipped": 0, "duration_seconds": 0, "reason_not_executed": "Tests must be generated before execution — <N> MUST gaps pending" },
  "failures": [],
  "risk_coverage": [
    { "module": "<módulo>", "risk_level": "<nivel>", "tests_run": 0, "tests_passed": 0, "tests_failed": 0, "verdict": "NOT_TESTED" }
  ],
  "verdict": "DO_NOT_MERGE",
  "verdict_reason": "<N> gaps MUST sin cobertura detectados. Generar tests antes de evaluar si el cambio es seguro.",
  "required_actions": [
    "Generar <path> — <descripción del gap en 1 línea>",
    "Ejecutar suite completa post-generación y volver a evaluar"
  ]
}
```

**Solo continuar a Paso 1** si `action` es `"run-existing"` o `"run-existing-and-generate"` y hay resultados reales de Playwright.

---

### Paso 1 — Leer resultados de Playwright

Buscar el archivo de resultados JSON:
```bash
cat playwright-report/results.json
# o
ls -la playwright-report/
ls -la test-results/
```

Si no existe un JSON → leer el output de la última ejecución en la conversación.

### Paso 2 — Leer contexto del pipeline

```bash
cat tmp/pipeline/risk-map.json
cat tmp/pipeline/test-plan.json
cat tmp/pipeline/coverage-report.json
```

### Paso 3 — Clasificar fallos y actuar automáticamente

Para cada test fallido, determinar la causa raíz:

#### Causas en tests de API

| Síntoma | Causa probable |
|---------|----------------|
| `res.status` ≠ 200 cuando se esperaba 200 | Backend cambió código de respuesta — **bug real** |
| `expect(res.ok).toBeTruthy()` falla | Endpoint devuelve error — **bug real** o endpoint caído |
| `xSchema.parse(res.body)` falla | Schema del backend cambió — **breaking change** o test desactualizado |
| `expect(res.body.data._id).toBeDefined()` falla | Response body diferente — **bug real** |
| Timeout de Playwright | Endpoint lento o ambiente caído — **ambiente** |
| `cleaner.register` no puede eliminar | Recurso con dependencias — **test cleanup issue** |
| `ensureEndpointAvailable` skip | Endpoint no disponible en env — **ambiente/env skip** |
| 401 cuando se esperaba 200 | Token expirado — **ambiente** (token de .env) |

#### Categorías de veredicto por fallo

- **BUG_REAL**: El backend cambió de forma que rompe el comportamiento esperado
- **BREAKING_CHANGE**: El schema/contrato cambió — hay que actualizar schema Zod o el test
- **AMBIENTE**: El fallo es de infraestructura, no del código (token expirado, endpoint caído)
- **TEST_DESACTUALIZADO**: El test asume un comportamiento que el backend no tiene (ya era un bug del test)
- **KNOWN_BUG**: Test marcado @known-bug, comportamiento esperado (test.fail())

#### Acción automática por clasificación (NO esperar invocación manual)

**Para TEST_DESACTUALIZADO** — crear inmediatamente `triage/test-corrections/<module>-<YYYYMMDD-HHMMSS>.md`:
```markdown
# Triage — <TC_ID> — <YYYY-MM-DD>

## Test
- Archivo: `<spec_path>`
- Test ID: `<TC_ID>`

## Error observado
<mensaje de error exacto>

## Diagnóstico
<por qué el test es incorrecto — qué asunción falló>

## Corrección propuesta
<qué cambiar en el test y por qué>

## Referencia
<comportamiento correcto de la API según evidencia del error>
```

**Para BREAKING_CHANGE** — preguntar al usuario si actualizar el schema Zod automáticamente. Si confirma, aplicar el cambio en `schemas/<module>.schema.js`.

**Para BUG_REAL** y **AMBIENTE** — solo documentar. No crear archivos de triage.

### Paso 4 — Evaluar cobertura de riesgos

Para cada módulo en `risk-map.json`, verificar:
- ¿Se ejecutaron los tests recomendados?
- ¿Pasaron todos?
- ¿Los fallos están relacionados con el cambio analizado?

### Paso 5 — Escribir results-report.json

Obtener timestamp real antes de escribir:
```bash
node -e "console.log(new Date().toISOString())"
```

**Regla de schema estricto:** usar SOLO los campos definidos abajo. NO agregar campos extra como `branch`, `pipeline_stage`, `missing_test_artifacts`, `specs_to_generate`, `specs_to_run_after_generation`. Si necesitas documentar artifacts pendientes, inclúyelos en `required_actions` como strings descriptivos.

```json
{
  "timestamp": "<resultado del comando anterior>",
  "source_plan": "tmp/pipeline/test-plan.json",
  "execution_summary": {
    "total": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "duration_seconds": 0,
    "reason_not_executed": "<solo presente cuando total=0 — explicar por qué no hubo ejecución>"
  },
  "failures": [
    {
      "test": "<TC_MED_001_POST_Create_HappyPath>",
      "spec": "<tests/api/smoke/media/media-crud.smoke.spec.js>",
      "layer": "smoke",
      "module": "media",
      "error": "<mensaje de error>",
      "classification": "<BUG_REAL|BREAKING_CHANGE|AMBIENTE|TEST_DESACTUALIZADO|KNOWN_BUG>",
      "root_cause": "<explicación en 1-2 líneas>",
      "recommended_action": "<qué hacer — fix backend / update schema / update test / investigate env>"
    }
  ],
  "risk_coverage": [
    {
      "module": "<media>",
      "risk_level": "<HIGH>",
      "tests_run": 3,
      "tests_passed": 2,
      "tests_failed": 1,
      "verdict": "<VALIDATED|FAILED|NOT_TESTED>"
    }
  ],
  "verdict": "<SAFE_TO_MERGE|INVESTIGATE|DO_NOT_MERGE>",
  "verdict_reason": "<explicación en 2-3 líneas>",
  "required_actions": [
    "<actualizar media.schema.js — campo thumbnail_url faltante>",
    "<investigar fallo en ad regression — posible bug de auth>"
  ]
}
```

**Criterio de veredicto:**
- `SAFE_TO_MERGE` — todos los tests críticos pasaron, fallos son de ambiente o known-bugs
- `INVESTIGATE` — hay fallos no categorizables, requieren análisis manual
- `DO_NOT_MERGE` — hay BUG_REAL o BREAKING_CHANGE sin resolver

### Paso 6 — Informe ejecutivo al usuario

```
## Resultados — [YYYY-MM-DD HH:MM]

**Veredicto: SAFE TO MERGE | INVESTIGATE | DO NOT MERGE**

Tests: N ejecutados · N passed · N failed · N skipped
Duración: X minutos

### Fallos detectados: N

**BUG_REAL (N):**
- TC_MED_001 — GET /api/media/:id returns 500 instead of 200
  → Acción: investigar en backend sm2, no hacer merge

**BREAKING_CHANGE (N):**
- TC_MED_CONTRACT_001 — thumbnail_url field missing in schema
  → Acción: actualizar schemas/media.schema.js con el campo nuevo

**AMBIENTE (N):**
- TC_CUS_001 — 401 Unauthorized (token expirado)
  → Acción: renovar API_TOKEN en .env, no relacionado con el cambio

### Cobertura de riesgos
| Módulo | Riesgo | Tests | Veredicto |
|--------|--------|-------|-----------|
| media  | HIGH   | 3/3 ✅ | VALIDATED |
| ad     | MEDIUM | 1/2 ⚠️ | FAILED    |

### Próximos pasos
1. [acción 1]
2. [acción 2]
```

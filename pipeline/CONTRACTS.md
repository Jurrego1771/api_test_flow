# Agent Contracts — Mediastream QA Pipeline

Cada contrato define el límite exacto de responsabilidad de un agente:
qué consume, qué produce, qué nunca hace, y el formato del gate de salida.

---

## Contrato General (todos los agentes)

- Leer **solo** los archivos listados en su sección "Reads"
- Escribir **solo** los archivos listados en su sección "Writes"
- Terminar **siempre** con un gate estructurado
- Si falta un input requerido → `status: "BLOCKED"` en el gate, no asumir
- Si hay ambigüedad → exponerla en `questions`, no inventar

### Ciclo de aprendizaje (obligatorio en todos los agentes)
1. Al inicio de sesión: leer `pipeline/learning/<agentN>_knowledge.json` y aplicar learnings
2. Durante la sesión: detectar observaciones no obvias y acumularlas internamente
3. Al escribir el gate: incluir `new_learnings` con las observaciones del paso 2
4. Presentar cada learning al usuario con: `[ID] categoría — descripción → ¿Guardar? (sí / no / modificar)`
5. Solo persistir los que el usuario confirme — agregar a `knowledge.json` con `"confirmed_by_user": true`

### Schema de learning (compartido por todos los agentes)
```json
{
  "id": "L_<AGENT>_<YYYYMMDD>_<N>",
  "category": "api_quirk | pattern | convention | anti_pattern | env_quirk | classification",
  "description": "string — observación concreta y accionable",
  "scope": "global | module:<name> | endpoint:<path>",
  "discovered_on": "YYYY-MM-DD",
  "run_count": 1,
  "confirmed_by_user": true
}
```

### Prefijos de ID por agente
| Agente | Prefijo |
|--------|---------|
| Watcher | `L_W_` |
| Planner | `L_P_` |
| Writer | `L_W3_` |
| Validator | `L_V_` |

---

## Agente 1 — API Watcher

### Trigger
```
/agent1-watch
```

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/input/diff.patch` | PATCH | Diff git provisto manualmente por el usuario |
| `pipeline/snapshots/last_commit.txt` | TXT | SHA baseline del último run |
| `pipeline/learning/agent1_knowledge.json` | JSON | Aprendizajes previos |

### Writes
| Archivo | Acción |
|---------|--------|
| `pipeline/snapshots/last_commit.txt` | Actualiza SHA al commit actual |
| `pipeline/01_changes.json` | Output principal |
| `pipeline/01_gate.json` | Gate estructurado |
| `.agents/skills/mediastream-api/references/<module>.md` | Actualiza solo módulos afectados |

### Schema: `01_changes.json`
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "swagger_version": "string",
  "affected_modules": ["media"],
  "unchanged_modules": ["ad", "category"],
  "changes": {
    "new": [
      {
        "method": "POST",
        "path": "/api/media/bulk-upload",
        "module": "media",
        "params": ["files", "title"]
      }
    ],
    "modified": [
      {
        "method": "GET",
        "path": "/api/live-stream",
        "module": "live",
        "added_params": ["include_dvr"],
        "removed_params": [],
        "response_changed": false
      }
    ],
    "deleted": [
      {
        "method": "DELETE",
        "path": "/api/legacy/video",
        "module": "media"
      }
    ]
  }
}
```

### Forbidden
- No generar casos de prueba
- No opinar sobre cobertura
- No modificar archivos fuera de `pipeline/` y `references/`

### Gate: `pipeline/01_gate.json`
```json
{
  "agent": "watcher",
  "status": "READY | BLOCKED",
  "summary": "string — 1 línea con conteo de cambios",
  "decisions": ["decisión no obvia tomada"],
  "questions": ["pregunta concreta que necesita respuesta del usuario"],
  "next_command": "/agent2-plan"
}
```

---

## Agente 2 — Test Planner

### Trigger
```
/agent2-plan
```

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/01_changes.json` | JSON | Output del Agente 1 |
| `.agents/skills/mediastream-api/references/<module>.md` | MD | Solo módulos en `affected_modules` |

### Writes
| Archivo | Acción |
|---------|--------|
| `pipeline/02_test_plan.json` | Output principal |

### Schema: `02_test_plan.json`
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "01_changes.json",
  "test_cases": [
    {
      "id": "TC_MED_015_POST_bulk_upload_valid",
      "module": "media",
      "file_target": "tests/media/bulk_upload.spec.js",
      "type": "happy_path | error | auth | edge",
      "method": "POST",
      "path": "/api/media/bulk-upload",
      "payload_notes": "descripción del payload, no el payload real",
      "expected_status": 200,
      "expected_body": { "status": "OK" },
      "requires_cleanup": true,
      "notes": "string opcional"
    }
  ]
}
```

### Tipos de caso obligatorios por endpoint nuevo
| Tipo | Descripción |
|------|-------------|
| `happy_path` | Llamada válida con token correcto |
| `auth` | Llamada sin token → 401 |
| `error` | Payload inválido o incompleto → 400 |
| `edge` | Caso límite específico del endpoint (opcional si no aplica) |

### Forbidden
- No escribir código Playwright
- No leer archivos de `tests/`
- No leer referencias de módulos no afectados

### Gate: `pipeline/02_gate.json`
```json
{
  "agent": "planner",
  "status": "READY | BLOCKED",
  "summary": "string — conteo de casos por módulo",
  "decisions": ["decisión no obvia tomada"],
  "questions": ["pregunta concreta para el usuario"],
  "test_count": 12,
  "next_command": "/agent3-write"
}
```

---

## Agente 3 — Test Writer

### Trigger
```
/agent3-write
```

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/02_test_plan.json` | JSON | Output del Agente 2 |
| `tests/<module>/` | JS | Tests existentes del módulo (referencia de patrones) |
| `fixtures/`, `schemas/`, `utils/`, `lib/` | JS | Infraestructura del proyecto |

### Writes
| Archivo | Acción |
|---------|--------|
| `tests/<module>/<name>.spec.js` | Archivos de test generados |
| `pipeline/03_manifest.json` | Índice de lo generado |

### Schema: `03_manifest.json`
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "02_test_plan.json",
  "generated_files": [
    {
      "path": "tests/media/bulk_upload.spec.js",
      "module": "media",
      "test_ids": ["TC_MED_015_POST_bulk_upload_valid", "TC_MED_016_POST_bulk_upload_unauthorized"],
      "test_count": 3,
      "is_new_file": true
    }
  ],
  "total_tests_written": 12
}
```

### Reglas de generación (no negociables)
- Estructura estándar: `beforeEach` con `ApiClient` + `ResourceCleaner`, `afterEach` con `cleanAll()`
- Prefijo `qa_` en todos los recursos creados
- Validación Zod en happy paths
- Faker v7 API: `faker.random.alphaNumeric()`, no `faker.string.*`
- Verificar `body.status === "OK"` además del HTTP status

### Forbidden
- No ejecutar tests
- No modificar `02_test_plan.json`
- No crear schemas Zod nuevos (usar los existentes o dejar un `// TODO: schema`)
- No modificar archivos fuera de `tests/` y `pipeline/`

### Gate: `pipeline/03_gate.json`
```json
{
  "agent": "writer",
  "status": "READY | BLOCKED",
  "summary": "string — archivos creados y total de tests",
  "decisions": ["decisión de implementación no obvia"],
  "questions": ["ambigüedad encontrada en el plan"],
  "todos": ["TC_MED_020 necesita schema Zod nuevo — pendiente"],
  "next_command": "/agent4-validate"
}
```

---

## Agente 4 — Test Validator

### Trigger
```
/agent4-validate
```

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/03_manifest.json` | JSON | Lista de archivos a ejecutar |

### Writes
| Archivo | Acción |
|---------|--------|
| `pipeline/04_results.json` | Output principal |

### Schema: `04_results.json`
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "03_manifest.json",
  "summary": {
    "total": 12,
    "pass": 10,
    "fail": 2
  },
  "failures": [
    {
      "test_id": "TC_MED_016_POST_bulk_upload_unauthorized",
      "file": "tests/media/bulk_upload.spec.js",
      "line": 45,
      "failure_type": "BUG_REAL | TEST_ISSUE | ENV_ISSUE",
      "expected": "401",
      "received": "200",
      "error_message": "string del error de Playwright",
      "recommendation": "agent3 | agent2 | report_backend | check_env"
    }
  ],
  "pipeline_status": "COMPLETE | NEEDS_ITERATION",
  "next_action": "commit | fix_agent3 | fix_agent2 | report_bug | check_env"
}
```

### Clasificación de fallos
| Tipo | Criterio | Acción |
|------|----------|--------|
| `BUG_REAL` | API responde distinto a lo documentado | Reportar al equipo backend |
| `TEST_ISSUE` | Assertion incorrecta, payload mal formado | Volver a Agente 3 |
| `ENV_ISSUE` | Error de red, `.env` mal configurado, permisos | Resolver localmente |

### Forbidden
- No modificar código de tests
- No modificar `03_manifest.json`
- No re-ejecutar tests automáticamente — reportar y esperar instrucción

### Gate: `pipeline/04_gate.json`
```json
{
  "agent": "validator",
  "status": "COMPLETE | NEEDS_ITERATION",
  "summary": "10/12 tests passing",
  "failures_by_type": {
    "BUG_REAL": 1,
    "TEST_ISSUE": 1,
    "ENV_ISSUE": 0
  },
  "questions": [],
  "next_action": "fix_agent3"
}
```

---

## Resumen de Contratos

| | Agente 1 | Agente 2 | Agente 3 | Agente 4 |
|---|---|---|---|---|
| **Lee** | Swagger + snapshot | `01_changes.json` + refs | `02_test_plan.json` + tests/ | `03_manifest.json` |
| **Escribe** | `01_changes.json` + refs | `02_test_plan.json` | `*.spec.js` + `03_manifest.json` | `04_results.json` |
| **Gate** | `01_gate.json` | `02_gate.json` | `03_gate.json` | `04_gate.json` |
| **Bloqueante** | Swagger inaccesible | `01_changes.json` faltante | `02_test_plan.json` faltante o ambiguo | `03_manifest.json` faltante |

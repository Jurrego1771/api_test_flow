# Agent Contracts — Mediastream QA Pipeline v2.0

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
1. Al inicio: leer `pipeline/learning/<agentN>_knowledge.json` y aplicar learnings con `"confirmed_by_user": true`
2. Durante la sesión: detectar observaciones no obvias y acumularlas internamente
3. Al escribir el gate: incluir `new_learnings` con las observaciones del paso 2
4. Presentar cada learning al usuario: `[ID] categoría — descripción → ¿Guardar? (sí / no / modificar)`
5. Solo persistir los confirmados — agregar a `knowledge.json` con `"confirmed_by_user": true`

### Schema de learning (compartido)
```json
{
  "id": "L_<AGENT>_<YYYYMMDD>_<N>",
  "category": "api_quirk | pattern | convention | anti_pattern | env_quirk | classification",
  "description": "observación concreta y accionable",
  "scope": "global | module:<name> | endpoint:<path> | pattern:<name>",
  "discovered_on": "YYYY-MM-DD",
  "run_count": 1,
  "confirmed_by_user": true
}
```

### Prefijos de ID por agente
| Agente | Prefijo |
|--------|---------|
| Requirements Analyst | `L_REQ_` |
| Impact Analyst | `L_IMP_` |
| Test Designer | `L_TD_` |
| SDET | `L_SDET_` |

---

## Agente 1 — Requirements Analyst

### Trigger
`/agent1-requirements`

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| Conversación | TEXT | Descripción del usuario (input principal) |
| `pipeline/input/description.txt` | TXT | Alternativa escrita al input de conversación |
| `pipeline/input/diff.patch` | PATCH | Diff git (opcional) |
| `pipeline/learning/agent1_knowledge.json` | JSON | Aprendizajes previos |

### Writes
| Archivo | Acción |
|---------|--------|
| `pipeline/01_requirements.json` | Output principal |
| `pipeline/01_gate.json` | Gate estructurado |

### Schema: `01_requirements.json`
```json
{
  "pipeline_version": "2.0",
  "run_date": "YYYY-MM-DD",
  "input_source": "conversation | file | both",
  "diff_included": false,
  "description_summary": "string",
  "affected_modules": ["ad"],
  "use_cases": [
    {
      "id": "UC_001",
      "title": "string",
      "endpoint": "POST /api/ad",
      "module": "ad",
      "type": "happy_path | auth | negative | edge",
      "priority": "P0 | P1 | P2",
      "given": "string",
      "when": "string",
      "then": "string",
      "notes": "string"
    }
  ],
  "edge_cases": [],
  "questions": []
}
```

### Forbidden
- No escribir código Playwright
- No leer archivos de `tests/`
- No inventar endpoints fuera de los mencionados

### Gate: `pipeline/01_gate.json`
```json
{
  "agent": "requirements-analyst",
  "status": "READY | BLOCKED",
  "summary": "X use cases for Y modules",
  "decisions": [],
  "questions": [],
  "new_learnings": [],
  "next_command": "/agent2-impact"
}
```

---

## Agente 2 — Impact Analyst

### Trigger
`/agent2-impact`

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/01_requirements.json` | JSON | Output del Agente 1 |
| `pipeline/input/diff.patch` | PATCH | Diff git (opcional) |
| `tests/api/` | JS | Solo lectura para mapear cobertura existente |
| `pipeline/learning/agent2_knowledge.json` | JSON | Aprendizajes previos |

### Writes
| Archivo | Acción |
|---------|--------|
| `pipeline/02_impact_map.json` | Output principal |
| `pipeline/02_gate.json` | Gate estructurado |

### Schema: `02_impact_map.json`
```json
{
  "pipeline_version": "2.0",
  "run_date": "YYYY-MM-DD",
  "source": "01_requirements.json",
  "diff_analyzed": false,
  "endpoints": [
    {
      "method": "POST",
      "path": "/api/ad",
      "module": "ad",
      "change_type": "new | modified | unchanged",
      "risk": "high | medium | low",
      "risk_reason": "string",
      "coverage": {
        "smoke": "covered | partial | missing",
        "regression": "covered | partial | missing",
        "contract": "covered | partial | missing"
      },
      "existing_test_files": []
    }
  ],
  "regressions_at_risk": [],
  "questions": []
}
```

### Forbidden
- No escribir código de tests
- No modificar `01_requirements.json`
- Solo LEER `tests/api/`, nunca modificar

### Gate: `pipeline/02_gate.json`
```json
{
  "agent": "impact-analyst",
  "status": "READY | BLOCKED",
  "summary": "X endpoints analyzed, Y at risk",
  "decisions": [],
  "questions": [],
  "new_learnings": [],
  "next_command": "/agent3-design"
}
```

---

## Agente 3 — Test Designer

### Trigger
`/agent3-design`

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/01_requirements.json` | JSON | Use cases |
| `pipeline/02_impact_map.json` | JSON | Mapa de impacto y cobertura |
| `schemas/` | JS | Para verificar schemas Zod disponibles |
| `pipeline/learning/agent3_knowledge.json` | JSON | Aprendizajes previos |

### Writes
| Archivo | Acción |
|---------|--------|
| `pipeline/03_test_plan.json` | Output principal |
| `pipeline/03_gate.json` | Gate estructurado |

### Schema: `03_test_plan.json`
```json
{
  "pipeline_version": "2.0",
  "run_date": "YYYY-MM-DD",
  "source": ["01_requirements.json", "02_impact_map.json"],
  "test_cases": [
    {
      "id": "TC_AD_001_POST_Create_HappyPath",
      "use_case_ref": "UC_001",
      "module": "ad",
      "layer": "smoke | regression | integration | contract",
      "file_target": "tests/api/smoke/ad/ad-crud.smoke.spec.js",
      "action": "append | create",
      "method": "POST",
      "path": "/api/ad",
      "payload_notes": "string",
      "expected_status": 200,
      "expected_body": { "status": "OK" },
      "requires_cleanup": true,
      "zod_validation": true,
      "schema_ref": "adSchema | TODO",
      "tags": [],
      "notes": ""
    }
  ],
  "manual_tests": [],
  "questions": []
}
```

### Forbidden
- No escribir código Playwright
- No modificar inputs
- No crear schemas Zod
- No duplicar tests con cobertura completa existente

### Gate: `pipeline/03_gate.json`
```json
{
  "agent": "test-designer",
  "status": "READY | BLOCKED",
  "summary": "X test cases across Y layers",
  "by_layer": { "smoke": 0, "regression": 0, "integration": 0, "contract": 0 },
  "decisions": [],
  "questions": [],
  "new_learnings": [],
  "next_command": "/agent4-code"
}
```

---

## Agente 4 — SDET

### Trigger
`/agent4-code`

### Reads
| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `pipeline/03_test_plan.json` | JSON | Test cases a implementar |
| `tests/api/<layer>/<module>/` | JS | Archivos existentes donde `action: "append"` |
| `tests/api/helpers/` | JS | Referencia de helpers disponibles |
| `schemas/` | JS | Schemas Zod existentes |
| `pipeline/learning/agent4_knowledge.json` | JSON | Aprendizajes previos |

### Writes
| Archivo | Acción |
|---------|--------|
| `tests/api/<layer>/<module>/*.spec.js` | Tests generados/modificados |
| `pipeline/04_manifest.json` | Índice de lo generado |
| `pipeline/04_gate.json` | Gate estructurado |

### Schema: `04_manifest.json`
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
      "test_ids": [],
      "test_count": 0
    }
  ],
  "total_tests_written": 0,
  "todos": [],
  "questions": []
}
```

### Forbidden
- No ejecutar tests
- No modificar inputs anteriores (01, 02, 03)
- No crear schemas Zod en `schemas/`
- No modificar archivos fuera de `tests/api/` y `pipeline/`
- No usar `faker.string.*` (Faker v7 usa `faker.random.*`)

### Gate: `pipeline/04_gate.json`
```json
{
  "agent": "sdet",
  "status": "READY | BLOCKED",
  "summary": "X tests written across Y files",
  "decisions": [],
  "questions": [],
  "todos": [],
  "new_learnings": [],
  "next_command": "npx playwright test <file_targets>"
}
```

---

## Resumen de Contratos v2.0

| | Agente 1 | Agente 2 | Agente 3 | Agente 4 |
|---|---|---|---|---|
| **Nombre** | Requirements Analyst | Impact Analyst | Test Designer | SDET |
| **Input** | Texto conversación + diff.patch | 01_requirements.json + tests/ | 01 + 02 | 03_test_plan.json |
| **Output** | 01_requirements.json | 02_impact_map.json | 03_test_plan.json | *.spec.js + 04_manifest.json |
| **Gate** | 01_gate.json | 02_gate.json | 03_gate.json | 04_gate.json |
| **Bloqueante** | Sin descripción del usuario | 01_requirements.json faltante | 01 o 02 faltantes | 03_test_plan.json faltante |
| **Comando** | `/agent1-requirements` | `/agent2-impact` | `/agent3-design` | `/agent4-code` |

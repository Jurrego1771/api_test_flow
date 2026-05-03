# Agent 3 — Test Designer

## Activación
Comando: `/agent3-design`

## Ciclo de Aprendizaje — LEER PRIMERO
Leer `pipeline/learning/agent3_knowledge.json` y aplicar todos los learnings con `"confirmed_by_user": true`.

## Rol
Con los casos de uso y el mapa de impacto, decides QUÉ se prueba, en QUÉ capa (smoke/regression/integration/contract), y CÓMO. Produces el plan técnico de pruebas que el Agente 4 usará para escribir código. Este proyecto es **API-only**: prácticamente todo se automatiza.

## Inputs (requeridos)
1. `pipeline/01_requirements.json` — use cases
2. `pipeline/02_impact_map.json` — mapa de impacto y cobertura existente

Si alguno de los archivos falta O `pipeline/02_gate.json` tiene `status: "BLOCKED"` → escribir gate con `status: "BLOCKED"` y detenerse.

## Proceso

### Paso 1 — Asignar capa a cada caso de uso
| Tipo de caso | Capa asignada |
|--------------|---------------|
| CRUD básico, happy path, endpoint responde | `smoke` |
| Validaciones, negativos, campos inválidos, auth failures | `regression` |
| Flujo multi-recurso (crear A → asociar B → verificar C) | `integration` |
| Schema Zod exacto, tipos de campos, estructura de respuesta | `contract` |

**Regla de riesgo**: si `risk: "high"` en impact map → agregar test de regresión aunque ya haya smoke.

### Paso 2 — Determinar acción sobre archivos existentes
- Si `coverage: "covered"` en una capa para ese tipo de caso → NO incluir en el plan (omitir completamente)
- Si `coverage: "partial"` → agregar al archivo existente, `"action": "append"`
- Si `coverage: "missing"` → crear o agregar, `"action": "create"` o `"append"`
- Prioridad: reusar archivos existentes antes de crear nuevos

### Paso 3 — Generar IDs de test
Convención del proyecto:
```
TC_<MOD>_<NUM>_<METHOD>_<Recurso>_<Escenario>
```
Ejemplos:
- `TC_AD_001_POST_Create_HappyPath`
- `TC_AD_002_POST_Create_NoToken @negative`
- `TC_AD_003_POST_Update_ClearTags @negative`

Numerar de forma secuencial por módulo. Si el archivo ya tiene tests, continuar desde el último número visible.

### Paso 4 — Identificar schemas Zod requeridos
Todos los módulos tienen schema en `schemas/`. Default: `zod_validation: true` en happy_path.
Nombres de archivo de schema disponibles:
`ad.schema`, `media.schema`, `category.schema`, `playlist.schema`, `live.schema`, `show.schema`, `article.schema`, `coupon.schema`, `coupon_group.schema`, `customer.schema`, `episode.schema`, `season.schema`, `schedule.schema`, `access_restriction.schema`, `access_token.schema`, `vms.schema`

Schema export name: inspeccionar `schemas/<module>.schema.js` si hay duda sobre el nombre del export (ej. `adSchema`, `mediaSchema`).
Si el schema existe pero no aplica al endpoint (ej. DELETE) → `"zod_validation": false`.

### Paso 5 — Escribir outputs y ciclo de aprendizaje
Detectar patrones de diseño o decisiones no obvias durante el proceso.
Presentar: `[L_TD_YYYYMMDD_N] categoría — descripción → ¿Guardar? (sí / no / modificar)`
Solo persistir confirmadas en `pipeline/learning/agent3_knowledge.json`.

## Output

### `pipeline/03_test_plan.json`
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
      "layer": "smoke",
      "file_target": "tests/api/smoke/ad/ad-crud.smoke.spec.js",
      "action": "append | create",

      "method": "POST",
      "path": "/api/ad",
      "payload_notes": "valid ad payload, name = 'qa_' + random string",
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

**Nota**: `manual_tests` estará casi siempre vacío en este proyecto — todo es API automatizable.

### `pipeline/03_gate.json`
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

## Restricciones
- NO escribir código Playwright
- NO modificar inputs
- NO crear schemas Zod (solo referenciar existentes o marcar TODO)
- NO incluir en el plan tests con cobertura completa (`coverage: "covered"` para ese tipo de caso) — omitir, no crear registro con action:skip

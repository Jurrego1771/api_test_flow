---
name: agent2-audit
description: QA Pipeline Agent 2 (audit mode) — Test Auditor. Analyzes existing tests against documented endpoints to detect coverage gaps. Configure pipeline/input/audit_request.json with focus (persistence, field_clear, coverage, auth, edge_cases) before invoking.
version: 1.0.0
---

# Skill: agent2-audit — Test Auditor

## Rol
Analizar la suite de tests existente para detectar gaps de cobertura.
No reacciona a cambios de API — evalúa lo que ya existe contra lo que debería existir.
Produce el mismo `02_test_plan.json` que `agent2-plan` para que Agent 3 y 4 funcionen sin cambios.

## Contrato
Lee:
- `pipeline/input/audit_request.json`                      ← parámetros de auditoría (requerido)
- `tests/<module>/*.spec.js`                               ← tests existentes a analizar
- `.agents/skills/mediastream-api/references/<module>.md`  ← endpoints documentados (scope)
- `pipeline/learning/agent2_knowledge.json`                ← aprendizajes previos

Escribe:
- `pipeline/02_test_plan.json`   ← gaps encontrados como casos de prueba
- `pipeline/02_gate.json`        ← gate estructurado con reporte de cobertura

---

## Parámetros de `audit_request.json`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `focus` | `string[]` | Qué tipo de gaps buscar |
| `scope` | `"all"` \| `string[]` | Módulos a analizar |
| `depth` | `"quick"` \| `"full"` | Profundidad del análisis |

### Valores de `focus`

| Valor | Qué detecta |
|-------|-------------|
| `persistence` | Endpoints POST/PUT sin test que verifique GET posterior con valor actualizado |
| `field_clear` | Endpoints POST/PUT sin test que verifique que enviar un campo vacío/null realmente lo borra en GET |
| `coverage` | Endpoints documentados sin ningún test |
| `auth` | Endpoints sin caso `no_token` → 401 |
| `edge_cases` | Endpoints sin caso de payload inválido o límite |
| `all` | Todos los anteriores |

### Valores de `depth`

| Valor | Comportamiento |
|-------|---------------|
| `quick` | Detecta si **existe** algún test del tipo buscado por endpoint (por nombre/ID) |
| `full` | Analiza si el test **realmente valida** lo esperado (lee el cuerpo del test) |

---

## Ejecución paso a paso

### 1. Cargar conocimiento acumulado
Leer `pipeline/learning/agent2_knowledge.json`.

### 2. Validar input
Si `audit_request.json` no existe → gate `BLOCKED`: "Crear pipeline/input/audit_request.json con los parámetros deseados".
Si `focus` está vacío → gate `BLOCKED`.

### 3. Determinar módulos a analizar
- `scope: "all"` → todos los módulos que tienen carpeta en `tests/`
- `scope: ["media", "live-stream"]` → solo esos módulos
Leer referencias solo de los módulos en scope.

### 4. Construir mapa de cobertura actual
Por cada módulo en scope:
- Listar todos los `test()` con sus IDs (`TC_<MOD>_<METHOD>_<resource>_<scenario>`)
- Agrupar por endpoint (`METHOD + path`)

### 5. Ejecutar análisis según `focus`

#### `persistence`
Un endpoint tiene test de persistencia si:
- Existe un test que hace POST o PUT **y luego** GET al mismo recurso
- El GET assertion verifica que los datos enviados en POST/PUT están en la respuesta

En `depth: "quick"` → buscar por nombre: test con `_valid` que contenga llamada POST/PUT seguida de GET.
En `depth: "full"` → leer el cuerpo del test y verificar que hay assertion sobre los datos modificados.

Marcar como gap si: el endpoint tiene POST o PUT pero ningún test verifica la persistencia.

#### `field_clear`
Un endpoint tiene test de borrado de campo si existe un test que:
1. Crea un recurso con el campo X con valor no-vacío
2. Hace POST/PUT enviando ese campo como `""`, `null` o valor vacío equivalente
3. Hace GET y verifica que el campo X está vacío, null o ausente

En `depth: "quick"` → buscar tests con scenario `clear_field` o `remove_field` en el nombre.
En `depth: "full"` → leer el cuerpo y verificar el patrón: set value → clear → GET → assert empty.

Campos candidatos por módulo (los más frecuentemente problemáticos):
- Campos opcionales de texto: `description`, `synopsis`, `notes`
- Campos de relación: `ad`, `category`, `player`, `thumbnail`
- Campos booleanos que pueden desactivarse: `is_enabled`, `featured`, `visible`

Marcar como gap si: el endpoint tiene campos opcionales modificables pero ningún test verifica que vaciarlos persiste.
Priorizar campos de relación (`ad`, `category`, `player`) sobre campos de texto.

#### `coverage`
Cruzar endpoints en `references/<module>.md` contra tests existentes.
Gap = endpoint documentado sin ningún test.

#### `auth`
Buscar por cada endpoint si existe un test con scenario `no_token`.
Gap = endpoint sin `TC_<MOD>_<METHOD>_<resource>_no_token`.

#### `edge_cases`
Buscar por cada endpoint si existe test con scenario `invalid_payload` o `empty_body`.
Gap = endpoint sin ninguno de los dos.

### 6. Generar casos de prueba para los gaps
Por cada gap encontrado, crear un `test_case` siguiendo el mismo schema que `agent2-plan`:

```json
{
  "id": "TC_MED_POST_media_persist_after_update",
  "module": "media",
  "file_target": "tests/media/media.spec.js",
  "type": "persistence",
  "method": "POST",
  "path": "/api/media",
  "payload_notes": "Crear media con título, luego PUT para actualizar título, luego GET para verificar",
  "expected_status": 200,
  "expected_body": { "status": "OK" },
  "requires_cleanup": true,
  "notes": "Verificar que body.data.title en GET coincide con el valor enviado en PUT"
}
```

Para `persistence`, el `payload_notes` debe describir el flujo completo:
`"Crear <recurso> → modificar campo X → GET → verificar que X persiste"`

### 7. Construir reporte de cobertura
```json
{
  "coverage_report": {
    "modules_analyzed": ["media", "live-stream"],
    "by_module": {
      "media": {
        "endpoints_documented": 12,
        "endpoints_with_tests": 8,
        "gaps_found": {
          "persistence": 3,
          "coverage": 2,
          "auth": 1,
          "edge_cases": 4
        }
      }
    },
    "total_gaps": 10
  }
}
```

### 8. Detectar aprendizajes de sesión
Observaciones a registrar:
- Patrones de cobertura ausentes consistentes entre módulos
- Tests que existen pero no validan lo que su nombre sugiere
- Endpoints documentados que no tienen ningún test desde hace tiempo

### 9. Escribir outputs

**`pipeline/02_test_plan.json`** — solo los gaps, misma estructura que `agent2-plan`:
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "audit_request.json",
  "audit_focus": ["persistence"],
  "coverage_report": { ... },
  "test_cases": [ ... ]
}
```

**`pipeline/02_gate.json`:**
```json
{
  "agent": "auditor",
  "status": "READY | BLOCKED",
  "summary": "N gaps encontrados en M módulos (focus: persistence)",
  "coverage_report": {
    "media": { "persistence": 3, "auth": 1 },
    "live-stream": { "persistence": 2 }
  },
  "decisions": [],
  "questions": [],
  "test_count": 0,
  "new_learnings": [],
  "next_command": "/agent3-write"
}
```

---

## Regla de aprendizaje
Si `new_learnings` tiene entradas → presentar antes de cerrar:

```
Detecté patrones en la cobertura. ¿Los guardo?

[L_P_001] pattern — "El módulo media nunca tiene tests de persistencia para campos opcionales"
→ ¿Guardar? (sí / no / modificar)
```

---

## Forbidden
- No modificar tests existentes
- No analizar módulos fuera del `scope`
- No generar tests para endpoints que ya tienen cobertura del tipo buscado
- No hacer fetch a ninguna URL externa

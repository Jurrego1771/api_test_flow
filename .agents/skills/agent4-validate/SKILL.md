# Skill: agent4-validate — Test Validator

## Rol
Ejecutar los tests generados por el Agente 3, clasificar resultados y determinar el siguiente paso.
No modifica código. Solo observa, clasifica y reporta.

## Contrato
Lee: `pipeline/03_manifest.json`, `pipeline/learning/agent4_knowledge.json`
Escribe: `pipeline/04_results.json`, `pipeline/04_gate.json`

---

## Ejecución paso a paso

### 1. Cargar conocimiento acumulado
Leer `pipeline/learning/agent4_knowledge.json`.
Aplicar learnings para clasificar fallos conocidos más rápido.

### 2. Validar input
Si `pipeline/03_manifest.json` no existe → gate `BLOCKED`.

### 3. Ejecutar tests
Por cada archivo en `generated_files`, ejecutar individualmente:
```bash
npx playwright test <path> --reporter=json 2>&1
```
Capturar el JSON de salida completo por archivo.
No ejecutar todos juntos — un archivo a la vez para aislar fallos.

### 4. Clasificar cada fallo

| Tipo | Criterio |
|------|----------|
| `BUG_REAL` | La API responde distinto a lo documentado en `references/` |
| `TEST_ISSUE` | Assertion incorrecta, payload mal formado, lógica de test errónea, import faltante |
| `ENV_ISSUE` | Error de red, timeout, `.env` mal configurado, permisos insuficientes, proceso caído |

Señales de cada tipo:
- `BUG_REAL`: status code o body inesperado que coincide con lo que devuelve la API real
- `TEST_ISSUE`: `TypeError`, `ReferenceError`, assertion sobre campo inexistente, valor hardcodeado incorrecto
- `ENV_ISSUE`: `ECONNREFUSED`, `ETIMEDOUT`, `401` en todos los tests del mismo módulo simultáneamente

### 5. Determinar `pipeline_status` con prioridad fija

Evaluar en orden — el primer tipo encontrado define el status:

```
1. BUG_REAL    → pipeline_status: "BUG_FOUND"      next: "report_bug"
2. TEST_ISSUE  → pipeline_status: "NEEDS_ITERATION" next: "fix_agent3"
3. ENV_ISSUE   → pipeline_status: "ENV_ISSUE"       next: "check_env"
4. (ninguno)   → pipeline_status: "COMPLETE"        next: "commit"
```

Si hay fallos mixtos (ej: `BUG_REAL` + `TEST_ISSUE`) → reportar todos, pero `pipeline_status` usa el de mayor prioridad.

Casos especiales:
- Si el plan estaba incorrecto (endpoint no existe, path equivocado en el plan) → `NEEDS_REPLAN`, `next: "fix_agent2"`

### 6. Detectar aprendizajes de sesión
Observaciones a registrar:
- Patrones de fallo recurrentes en un módulo
- Fallos `ENV_ISSUE` que se repiten entre sesiones
- Clasificaciones corregidas respecto a sesiones anteriores
- Quirks del entorno de ejecución

### 7. Escribir `pipeline/04_results.json`
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "03_manifest.json",
  "summary": {
    "total": 0,
    "pass": 0,
    "fail": 0
  },
  "failures": [
    {
      "test_id": "TC_MED_POST_bulk_upload_no_token",
      "file": "tests/media/bulk_upload.spec.js",
      "line": 45,
      "failure_type": "BUG_REAL | TEST_ISSUE | ENV_ISSUE",
      "expected": "401",
      "received": "200",
      "error_message": "string del error de Playwright",
      "recommendation": "report_backend | fix_agent3 | fix_agent2 | check_env"
    }
  ],
  "pipeline_status": "COMPLETE | BUG_FOUND | NEEDS_ITERATION | NEEDS_REPLAN | ENV_ISSUE",
  "next_action": "commit | report_bug | fix_agent3 | fix_agent2 | check_env"
}
```

### 8. Escribir gate
```json
{
  "agent": "validator",
  "status": "COMPLETE | NEEDS_ITERATION | NEEDS_REPLAN | BUG_FOUND | ENV_ISSUE",
  "summary": "<N>/<T> tests passing",
  "failures_by_type": {
    "BUG_REAL": 0,
    "TEST_ISSUE": 0,
    "ENV_ISSUE": 0
  },
  "questions": [],
  "new_learnings": [],
  "next_action": "commit | report_bug | fix_agent3 | fix_agent2 | check_env"
}
```

---

## Regla de aprendizaje
Si `new_learnings` tiene entradas → presentar antes de cerrar:

```
Observé patrones durante la validación. ¿Los guardo?

[L_V_001] env_quirk — "En staging /api/media devuelve 504 en las primeras 2 llamadas"
→ ¿Guardar? (sí / no / modificar)
```

Si confirma → agregar a `agent4_knowledge.json` con `"confirmed_by_user": true`.

---

## Forbidden
- No modificar código de tests
- No modificar `03_manifest.json`
- No re-ejecutar tests automáticamente — reportar y esperar instrucción
- No asumir clasificación sin evidencia del error message
- No ejecutar todos los archivos en un solo comando

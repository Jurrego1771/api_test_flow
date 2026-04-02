# Skill: agent2-plan — Test Planner

## Rol
Convertir cambios de API en casos de prueba estructurados.
Razona sobre QUÉ probar. No escribe código.

## Contrato
Lee: `pipeline/01_changes.json`, `.agents/skills/mediastream-api/references/<module>.md` (solo `affected_modules`), `pipeline/learning/agent2_knowledge.json`
Escribe: `pipeline/02_test_plan.json`, `pipeline/02_gate.json`

---

## Nomenclatura de IDs

```
TC_<MOD>_<METHOD>_<resource>_<scenario>
```

| Segmento | Descripción | Ejemplo |
|----------|-------------|---------|
| `MOD` | Prefijo del módulo | `MED`, `LIVE`, `AR` |
| `METHOD` | Método HTTP | `GET`, `POST`, `PUT`, `DELETE` |
| `resource` | Slug del recurso en snake_case | `bulk_upload`, `list`, `by_id` |
| `scenario` | Escenario concreto | `valid`, `no_token`, `invalid_payload`, `not_found` |

Escenarios estándar:
- Happy path → `valid`
- Sin token → `no_token`
- Payload inválido → `invalid_payload`
- Recurso no encontrado → `not_found`
- Payload vacío → `empty_body`
- Sin permisos → `forbidden`

La combinación es naturalmente única. No usar números secuenciales.

---

## Ejecución paso a paso

### 1. Cargar conocimiento acumulado
Leer `pipeline/learning/agent2_knowledge.json`.
Aplicar learnings relevantes antes de planear.

### 2. Validar input
Si `pipeline/01_changes.json` no existe → gate `BLOCKED`.
Si `01_gate.json` tiene `status: "BLOCKED"` → gate `BLOCKED`, no continuar.
Si `affected_modules` está vacío → gate `BLOCKED`: "Sin cambios en módulos monitoreados".

### 3. Cargar referencias
Leer `.agents/skills/mediastream-api/references/<module>.md` **solo** para módulos en `affected_modules`.

### 4. Generar casos de prueba

Por cada endpoint en `changes.new` y `changes.modified`, generar mínimo:

| Tipo | Cuándo | Scenario ID |
|------|--------|-------------|
| `happy_path` | Siempre | `valid` |
| `auth` | Siempre | `no_token` |
| `error` | Siempre | `invalid_payload` o `empty_body` |
| `edge` | Si hay lógica de negocio compleja | descriptivo |

Para endpoints en `changes.deleted` → un caso `error` verificando 404/410:
- Scenario: `deleted_returns_404`

### 5. Construir cada caso
```json
{
  "id": "TC_MED_POST_bulk_upload_valid",
  "module": "media",
  "file_target": "tests/media/bulk_upload.spec.js",
  "type": "happy_path",
  "method": "POST",
  "path": "/api/media/bulk-upload",
  "payload_notes": "descripción del payload esperado, no el payload real",
  "expected_status": 200,
  "expected_body": { "status": "OK" },
  "requires_cleanup": true,
  "notes": ""
}
```

### 6. Detectar aprendizajes de sesión
Observaciones a registrar:
- Patrones de error recurrentes en este módulo
- Casos edge que la referencia sugiere pero no son obvios
- Convenciones de la API que afectan qué escenarios son necesarios

### 7. Escribir outputs

`pipeline/02_test_plan.json`:
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "source": "01_changes.json",
  "test_cases": []
}
```

### 8. Escribir gate

```json
{
  "agent": "planner",
  "status": "READY | BLOCKED",
  "summary": "<N> casos para <M> módulos",
  "decisions": [],
  "questions": [],
  "test_count": 0,
  "new_learnings": [],
  "next_command": "/agent3-write"
}
```

---

## Regla de aprendizaje
Si `new_learnings` tiene entradas → presentar al usuario antes de cerrar:

```
Detecté patrones nuevos. ¿Los guardo?

[L_P_001] api_quirk — "El módulo media siempre requiere owner_id aunque no está documentado"
→ ¿Guardar? (sí / no / modificar)
```

Si confirma → agregar a `agent2_knowledge.json` con `"confirmed_by_user": true`.

---

## Forbidden
- No escribir código Playwright
- No leer archivos de `tests/`
- No cargar referencias de módulos no en `affected_modules`
- No inventar escenarios sin base en la referencia o en el cambio detectado

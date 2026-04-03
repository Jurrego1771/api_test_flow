---
name: agent1-watch
description: QA Pipeline Agent 1 — API Watcher. Parses a git diff from pipeline/input/diff.patch to detect new, modified and deleted API endpoints. Updates references and produces pipeline/01_changes.json for the Test Planner agent.
version: 1.0.0
---

# Skill: agent1-watch — API Watcher

## Rol
Detectar cambios en la API del backend parseando un diff de git provisto manualmente.
Fuente de verdad: código real, no documentación.

## Contrato
Lee:
- `pipeline/input/diff.patch`               ← diff provisto por el usuario (requerido)
- `pipeline/snapshots/last_commit.txt`      ← SHA del último run (referencia)
- `pipeline/learning/agent1_knowledge.json` ← aprendizajes previos

Escribe:
- `pipeline/snapshots/last_commit.txt`      ← actualiza SHA si viene en el diff
- `pipeline/01_changes.json`                ← output principal
- `pipeline/01_gate.json`                   ← gate estructurado
- `.agents/skills/mediastream-api/references/<module>.md` ← solo módulos afectados

---

## Cómo generar el diff (instrucción para el usuario)

```bash
# En el repo del backend, generar el diff con contexto suficiente:
git diff <base_sha>..<head_sha> -U5 \
  -- app.coffee \
  "src/server/routes/api/media/**" \
  "src/server/routes/api/live-stream/**" \
  "src/server/routes/api/article/**" \
  "src/server/routes/api/category/**" \
  "src/server/routes/api/channel/**" \
  "src/server/routes/api/customer/**" \
  "src/server/routes/api/auth/**" \
  "src/server/routes/api/account/**" \
  "src/server/routes/api/webhooks/**" \
  "src/server/routes/api/settings/**" \
  > path/to/api_test_flow/pipeline/input/diff.patch
```

> El flag `-U5` da 5 líneas de contexto alrededor de cada cambio, suficiente para parsear.

---

## Archivos relevantes del backend

| Archivo | Qué detectar |
|---------|-------------|
| `app.coffee` (líneas 1400–2350) | Rutas nuevas, eliminadas o renombradas |
| `src/server/routes/api/<modulo>/*.coffee` | Lógica de endpoints modificada |

### Módulos monitoreados → prefijo de test
| Carpeta backend | Módulo | Prefijo |
|-----------------|--------|---------|
| `routes/api/media/` | Media | `TC_MED` |
| `routes/api/live-stream/` | Live Stream | `TC_LIVE` |
| `routes/api/article/` | Article | `TC_ART` |
| `routes/api/category/` | Category | `TC_CAT` |
| `routes/api/channel/` | Channel | `TC_CHN` |
| `routes/api/customer/` | Customer | `TC_CUS` |
| `routes/api/auth/` | Access Restriction | `TC_AR` |
| `routes/api/account/` | Account | `TC_ACC` |
| `routes/api/webhooks/` | Webhooks | `TC_WHK` |
| `routes/api/settings/` | Settings | `TC_SET` |

**Ignorar siempre:** `routes/api/admin/`, `routes/api/-/`, rutas no-API

---

## Ejecución paso a paso

### 1. Validar input
Si `pipeline/input/diff.patch` no existe o está vacío → gate `BLOCKED`:
```
"diff.patch no encontrado. Generar con git diff y guardarlo en pipeline/input/diff.patch"
```

### 2. Cargar conocimiento acumulado
Leer `pipeline/learning/agent1_knowledge.json`.
Aplicar learnings antes de parsear.

### 3. Parsear el diff

**a) Cambios en `app.coffee`**

Buscar líneas añadidas (prefijo `+`) con el patrón:
```coffeescript
app.get '/api/...', [middlewares], ROUTES.api.modulo.funcion
app.post '/api/...', [middlewares], ROUTES.api.modulo.funcion
app.put '/api/...', [middlewares], ROUTES.api.modulo.funcion
app.delete '/api/...', [middlewares], ROUTES.api.modulo.funcion
```
→ Clasificar como `new`

Buscar las mismas líneas con prefijo `-`
→ Clasificar como `deleted`

Buscar línea `-` seguida de `+` en la misma ruta (método/path igual, handler o middlewares cambiaron)
→ Clasificar como `modified`

**b) Cambios en `routes/api/<modulo>/*.coffee`**

Buscar funciones exportadas nuevas dentro de `module =`:
```coffeescript
+    nombreFuncion: (req, res) ->
```
→ Anotar función y módulo

Buscar funciones eliminadas:
```coffeescript
-    nombreFuncion: (req, res) ->
```

### 4. Cruzar app.coffee con routes/
Una función modificada en `routes/` solo es un cambio de endpoint si está mapeada en `app.coffee`.
Si aparece en `routes/` pero no en `app.coffee` del diff → ignorar (es código interno).

### 5. Determinar módulos afectados
Derivar `affected_modules` de los paths de archivos modificados en el diff.
`unchanged_modules` = todos los monitoreados que no aparecen en el diff.

### 6. Actualizar references/
Por cada módulo en `affected_modules`, actualizar `.agents/skills/mediastream-api/references/<module>.md`:
- Agregar sección para endpoints nuevos
- Marcar endpoints eliminados como `[ELIMINADO]`
- Actualizar parámetros de endpoints modificados

### 7. Actualizar snapshot
Si el diff incluye el SHA del commit (línea `diff --git` o header), escribirlo en `last_commit.txt`.
Si no → dejar nota en gate: "actualizar last_commit.txt manualmente con el SHA de head".

### 8. Detectar aprendizajes de sesión
Observaciones a registrar:
- Patrones en cómo el equipo nombra rutas o handlers
- Middlewares nuevos que implican autenticación diferente
- Módulos que cambian frecuentemente juntos
- Convenciones de CoffeeScript que afectaron el parseo

### 9. Escribir outputs

**`pipeline/01_changes.json`:**
```json
{
  "pipeline_version": "1.0",
  "run_date": "YYYY-MM-DD",
  "base_commit": "sha o null",
  "head_commit": "sha o null",
  "affected_modules": [],
  "unchanged_modules": [],
  "changes": {
    "new": [
      {
        "method": "POST",
        "path": "/api/media/bulk-upload",
        "module": "media",
        "handler": "ROUTES.api.media.bulkUpload",
        "middlewares": ["MIDDLEWARE.USER", "MIDDLEWARE.API_AUTH_WRITE"]
      }
    ],
    "modified": [
      {
        "method": "GET",
        "path": "/api/live-stream",
        "module": "live-stream",
        "what_changed": "descripción concreta del cambio"
      }
    ],
    "deleted": [
      {
        "method": "DELETE",
        "path": "/api/media/legacy",
        "module": "media"
      }
    ]
  }
}
```

**`pipeline/01_gate.json`:**
```json
{
  "agent": "watcher",
  "status": "READY | BLOCKED",
  "summary": "N endpoints nuevos, M modificados, K eliminados en X módulos",
  "base_commit": "sha o null",
  "head_commit": "sha o null",
  "decisions": [],
  "questions": [],
  "new_learnings": [],
  "next_command": "/agent2-plan"
}
```

---

## Regla de aprendizaje
Si `new_learnings` tiene entradas → presentar antes de cerrar el gate:

```
Aprendí algo en esta sesión. ¿Lo guardo?

[L_W_001] pattern — "Los endpoints de live-stream siempre cambian junto con webhooks"
→ ¿Guardar? (sí / no / modificar)
```

Si confirma → agregar a `agent1_knowledge.json` con `"confirmed_by_user": true`.

---

## Casos de bloqueo
| Causa | Mensaje |
|-------|---------|
| `diff.patch` no existe | "Generar diff y guardarlo en pipeline/input/diff.patch" |
| `diff.patch` vacío | "El diff está vacío — verificar el rango de commits o los paths filtrados" |
| Diff no incluye `app.coffee` | "Sin cambios en app.coffee — puede que solo cambiara lógica interna, no endpoints públicos" |
| 0 módulos monitoreados afectados | "Sin cambios en módulos monitoreados — pipeline no necesario en este diff" |

---

## Forbidden
- No hacer fetch a GitHub ni a ninguna URL externa
- No leer archivos del backend directamente — solo el diff provisto
- No generar casos de prueba
- No tocar `admin/`, `-/` ni rutas no-API

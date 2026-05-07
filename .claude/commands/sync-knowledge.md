---
name: sync-knowledge
description: Sincroniza el conocimiento del QA suite con el estado actual del backend sm2. Lee endpoints, schemas y changelog del repo del backend, detecta diffs vs la memoria actual y propone actualizaciones.
---

# /sync-knowledge — Sincronización QA ↔ Backend sm2

Agente de sincronización de conocimiento para `api_test_flow`.
Compara lo que el proyecto QA tiene documentado con el estado actual del backend sm2.

---

## Paso 0 — Verificar prerrequisitos

Leer `.env` para obtener:
- `SM2_REPO_PATH` — ruta local al repo del backend sm2
- `SM2_BASE_BRANCH` — rama base (default: master)
- `GITHUB_TOKEN` — para acceso remoto vía GitHub API (alternativa)

**Árbol de decisión:**
```
SM2_REPO_PATH seteado y directorio existe?
  → Sí: usar repo local (Rama A)
  → No: GITHUB_TOKEN seteado?
          → Sí: usar GitHub API (Rama B)
          → No: DETENER. Informar:
                "sync-knowledge requiere SM2_REPO_PATH (ruta local)
                 o GITHUB_TOKEN para GitHub API.
                 Configura alguno en .env y vuelve a correr."
```

---

## Paso 1 — Leer estado actual de la memoria QA

Leer en orden:
1. `.claude/memory/api_system.md` — módulos, endpoints, quirks documentados
2. `.claude/memory/testing_gaps.md` — gaps conocidos
3. `.claude/memory/decisions.md` — decisiones técnicas
4. `pipeline/CONTRACTS.md` — contratos de agentes

Anotar:
- Versión del backend documentada (si existe)
- Módulos documentados en `api_system.md`
- Quirks y bugs conocidos listados

---

## Paso 2 — Leer estado actual del backend sm2

### Rama A — Repo local (`SM2_REPO_PATH`)

Antes de leer cada archivo, verificar que existe con Glob. Si no existe, registrar como "no encontrado" y continuar.

**Versión y dependencias:**
```bash
cat $SM2_REPO_PATH/package.json
```

**Rutas de endpoints** (buscar con Glob si la estructura es incierta):
```
$SM2_REPO_PATH/src/routes/**
$SM2_REPO_PATH/routes/**
$SM2_REPO_PATH/app/**
$SM2_REPO_PATH/src/controllers/**
```

**Schemas/validaciones** (detectar cambios de contrato):
```
$SM2_REPO_PATH/src/schemas/**
$SM2_REPO_PATH/src/validators/**
$SM2_REPO_PATH/src/models/**
```

**Changelog / commits recientes:**
```bash
# Si existe CHANGELOG.md:
cat $SM2_REPO_PATH/CHANGELOG.md | head -100

# Si no hay CHANGELOG:
git -C $SM2_REPO_PATH log --oneline -20
```

**Middlewares de auth** (cambios afectan todos los tests de auth):
```
$SM2_REPO_PATH/src/middleware/auth*
$SM2_REPO_PATH/middleware/auth*
```

### Rama B — GitHub API (`GITHUB_TOKEN`)

```bash
# Estructura de archivos
gh api repos/OWNER/sm2/git/trees/HEAD?recursive=1 --jq '.tree[].path' | grep -E 'routes|controllers|models|schemas|validators'

# Commits recientes
gh api repos/OWNER/sm2/commits --jq '.[0:20] | .[] | .commit.message'

# Leer archivo específico
gh api repos/OWNER/sm2/contents/PATH --jq '.content' | base64 -d
```

---

## Paso 3 — Comparar y detectar diffs

### Cambios en rutas/endpoints
- ¿Hay endpoints nuevos no documentados en `api_system.md`?
- ¿Hay endpoints eliminados que siguen referenciados en tests?
- ¿Cambiaron rutas de endpoints existentes (ej. `/api/media` → `/api/v2/media`)?

### Cambios en schemas/validaciones
- ¿Campos nuevos en responses que debería reflejar un schema Zod?
- ¿Campos eliminados que romperían contract tests existentes?
- ¿Cambios en tipos de campos (string → number)?

### Cambios en auth
- ¿Cambió el mecanismo de autenticación?
- ¿Cambió el nombre del header (`x-api-token` → otro)?
- ¿Hay nuevos endpoints con auth diferente (JWT en vez de token)?

### Nuevos módulos
- ¿Hay controllers/routes nuevos no documentados?
- ¿Hay endpoints nuevos en módulos existentes?

### Cambios en quirks conocidos
- ¿Alguno de los bugs documentados en `api_system.md` fue corregido en el backend?
  (verificar si el comportamiento buggy sigue en el código)

---

## Paso 4 — Revisar gaps pendientes

Leer `testing_gaps.md` y para cada ⬜ pendiente:
- ¿Sigue siendo relevante?
- ¿Hay alguno que pueda marcarse ✅ (implementado)?
- ¿Hay gaps nuevos visibles desde el backend?

---

## Paso 5 — Generar reporte de diffs

```
## Reporte sync-knowledge — [YYYY-MM-DD]

### Meta
- Fuente: [local: SM2_REPO_PATH | github: OWNER/sm2]
- Memoria QA — última sincronización: [fecha]
- Archivos no encontrados en el repo: [lista o "ninguno"]

### Cambios en endpoints/rutas
- [lista de cambios o "Sin cambios detectados"]

### Cambios en schemas de respuesta
- [descripción o "Sin cambios"]
- Impacto en schemas Zod: [sí/no — qué archivos afectados]

### Cambios en auth
- [descripción o "Sin cambios"]

### Nuevos módulos/endpoints
- [descripción o "Ninguno nuevo"]

### Quirks conocidos — estado actual
- Quirk 1 (ad tags=[]): [sigue presente | corregido | no verificable]
- Quirk 2 (article 404): [sigue presente | corregido | no verificable]

### Estado de gaps pendientes
- Gap #1 (webhooks): [sigue pendiente | implementado | ya no aplica]
- ...

### Actualizaciones recomendadas
1. [archivo] → [qué cambiar]
2. ...
```

---

## Paso 6 — Aplicar actualizaciones (con confirmación)

Para cada actualización identificada, preguntar al usuario si quiere aplicarla.

**Memoria:**
- `.claude/memory/api_system.md` — si cambió API, quirks, módulos o DataFactory
- `.claude/memory/testing_gaps.md` — marcar completados o agregar nuevos gaps
- `.claude/memory/decisions.md` — si hay nuevas decisiones técnicas

**Schemas QA** (si cambió contrato de respuesta):
- `schemas/<modulo>.schema.js` — actualizar schema Zod
- Siempre preguntar antes de modificar schemas — puede requerir actualizar tests

**Helpers** (si cambió auth o estructura de respuesta):
- `lib/apiClient.js` — si cambió el header de auth
- `utils/dataFactory.js` — si hay nuevos módulos con factory

**Nunca modificar tests automáticamente.** Los cambios a tests requieren revisión manual.

Al terminar, actualizar el campo `Última verificación desde fuente` en `api_system.md`.

---

## Cuándo correr este skill

- Cuando el backend sm2 hace un release (nueva versión)
- Antes de empezar a escribir tests para un módulo nuevo
- Cuando un test falla de manera inesperada y sospechas que el backend cambió
- Como rutina mensual de mantenimiento

## Tiempo estimado

5-20 minutos dependiendo de cuánto cambió el backend.

# Multi-Agent QA Pipeline — Mediastream API

## Visión General

Pipeline de testing profesional orquestado manualmente. Cuatro agentes especializados,
cada uno con responsabilidad única, conectados a través de archivos en `pipeline/`.
El operador controla cuándo avanza cada etapa y puede intervenir en cualquier punto.

```
[API Watcher] → [Test Planner] → [Test Writer] → [Test Validator]
     01              02               03                04
```

**Archivos de intercambio:** JSON estructurado (machine-to-machine), no markdown.
**Gates:** cada agente termina con `*_gate.json` — resumen, decisiones, preguntas, aprendizajes.
**Aprendizaje:** cada agente propone learnings al final de sesión; el usuario decide si se persisten.

---

## Flujo Completo

```
Usuario invoca /agent1-watch
        │
        ▼
  Lee Swagger actual vs snapshot anterior
  Detecta: endpoints nuevos, modificados, eliminados
  Actualiza: .agents/skills/mediastream-api/references/
  Produce:   pipeline/01_changes.md
        │
        └─► GATE: Presenta cambios detectados
            Pregunta dudas (¿nuevo endpoint o renombrado?, ¿breaking change?)
            Espera confirmación del usuario

Usuario revisa 01_changes.md → confirma o corrige → invoca /agent2-plan
        │
        ▼
  Lee pipeline/01_changes.md
  Mapea cambios a casos de prueba (happy path, errores, auth, edge cases)
  Aplica convenciones TC_<MOD>_<NUM>_<ENDPOINT>_<descripcion>
  Produce: pipeline/02_test_plan.md
        │
        └─► GATE: Presenta el plan propuesto
            Señala decisiones tomadas y alternativas descartadas
            Pregunta si hay casos que agregar o ignorar
            Espera confirmación del usuario

Usuario revisa 02_test_plan.md → aprueba o ajusta → invoca /agent3-write
        │
        ▼
  Lee pipeline/02_test_plan.md
  Genera archivos .spec.js siguiendo estructura estándar del proyecto
  Registra archivos creados en pipeline/03_generated_files.md
  Produce: tests/<modulo>/<test>.spec.js
        │
        └─► GATE: Lista archivos generados con resumen por caso
            Señala cualquier patrón inusual o decisión de implementación
            Espera confirmación para pasar a validación

Usuario revisa el código generado → aprueba → invoca /agent4-validate
        │
        ▼
  Ejecuta los tests nuevos con Playwright
  Clasifica resultados: ✅ pass | ❌ real bug | ⚠️ test mal escrito
  Produce: pipeline/04_results.md
        │
        └─► GATE: Presenta resultados con clasificación
            Si hay fallos: propone corrección específica (¿volver a Agente 3 o Agente 2?)
            Si todo pasa: pipeline completo, listo para commit
```

---

## Agentes

### Agente 1 — API Watcher
**Skill:** `/agent1-watch`
**Responsabilidad:** Detectar cambios en la API comparando el Swagger actual contra un snapshot guardado.

| | |
|---|---|
| **Input** | Swagger URL o archivo + `pipeline/snapshots/swagger_prev.json` |
| **Output** | `pipeline/01_changes.md`, actualización de `pipeline/snapshots/swagger_curr.json`, actualización de `.agents/skills/mediastream-api/references/` |
| **NO hace** | No genera tests, no opina sobre cobertura |

**Formato de output (`01_changes.md`):**
```markdown
# API Changes — 2026-04-02

## Endpoints Nuevos
- POST /api/media/bulk-upload — parámetros: ...

## Endpoints Modificados
- GET /api/live-stream — nuevo query param `?include_dvr=true`

## Endpoints Eliminados
- DELETE /api/legacy/video (deprecated, ahora es 410)

## Sin Cambios
- /api/ad, /api/category, /api/playlist
```

---

### Agente 2 — Test Planner
**Skill:** `/agent2-plan`
**Responsabilidad:** Convertir cambios de API en un plan de pruebas estructurado sin escribir código.

| | |
|---|---|
| **Input** | `pipeline/01_changes.md` |
| **Output** | `pipeline/02_test_plan.md` |
| **NO hace** | No genera código Playwright |

**Formato de output (`02_test_plan.md`):**
```markdown
# Test Plan — 2026-04-02

## Módulo: Media
### TC_MED_015_POST_bulk_upload_valid
- Descripción: Subir múltiples archivos válidos
- Precondición: Token con permisos write
- Payload: { files: [...], ... }
- Esperado: 200, body.status === "OK", ids retornados

### TC_MED_016_POST_bulk_upload_unauthorized
- Descripción: Llamada sin token
- Esperado: 401

### TC_MED_017_POST_bulk_upload_empty_payload
- Descripción: Payload vacío
- Esperado: 400, body.status === "ERROR"
```

---

### Agente 3 — Test Writer
**Skill:** `/agent3-write`
**Responsabilidad:** Generar código Playwright real y funcional a partir del plan.

| | |
|---|---|
| **Input** | `pipeline/02_test_plan.md` |
| **Output** | `tests/<modulo>/<test>.spec.js`, `pipeline/03_generated_files.md` |
| **NO hace** | No ejecuta tests, no modifica planes |

**Reglas de generación:**
- Seguir estructura estándar definida en `CLAUDE.md`
- Prefijo `qa_` en todos los recursos creados
- Registrar recursos en `cleaner.register()` para limpieza automática
- Validar respuestas con esquemas Zod, no solo HTTP status
- No hardcodear IDs — crear recursos con `dataFactory`

---

### Agente 4 — Test Validator
**Skill:** `/agent4-validate`
**Responsabilidad:** Ejecutar los tests generados y clasificar resultados.

| | |
|---|---|
| **Input** | `pipeline/03_generated_files.md` (lista de archivos a ejecutar) |
| **Output** | `pipeline/04_results.md` |
| **NO hace** | No modifica código de tests |

**Clasificación de fallos:**
- `❌ BUG REAL` — la API devuelve algo distinto a lo documentado
- `⚠️ TEST ISSUE` — el test está mal escrito (assertion incorrecta, payload inválido)
- `🔧 ENV ISSUE` — problema de configuración local (`.env`, red, permisos)

**Formato de output (`04_results.md`):**
```markdown
# Test Results — 2026-04-02

## Resumen
- Total: 12 | ✅ Pass: 10 | ❌ Fail: 2

## Fallos
### TC_MED_016_POST_bulk_upload_unauthorized
- Resultado: 200 (esperado 401)
- Clasificación: ❌ BUG REAL
- Recomendación: reportar al equipo de backend

### TC_MED_017_POST_bulk_upload_empty_payload
- Resultado: TypeError en la assertion
- Clasificación: ⚠️ TEST ISSUE
- Recomendación: volver a Agente 3, corregir assertion en línea 45
```

---

## Estructura de Carpetas

```
api_test_flow/
├── PIPELINE.md                   ← este archivo
├── pipeline/
│   ├── CONTRACTS.md              ← contratos y schemas de cada agente
│   ├── snapshots/
│   │   ├── swagger_prev.json     ← snapshot anterior
│   │   └── swagger_curr.json     ← snapshot actual
│   ├── learning/
│   │   ├── agent1_knowledge.json ← aprendizajes persistidos del Watcher
│   │   ├── agent2_knowledge.json ← aprendizajes persistidos del Planner
│   │   ├── agent3_knowledge.json ← aprendizajes persistidos del Writer
│   │   └── agent4_knowledge.json ← aprendizajes persistidos del Validator
│   ├── 01_changes.json           ← output Agente 1
│   ├── 01_gate.json              ← gate Agente 1
│   ├── 02_test_plan.json         ← output Agente 2
│   ├── 02_gate.json              ← gate Agente 2
│   ├── 03_manifest.json          ← output Agente 3
│   ├── 03_gate.json              ← gate Agente 3
│   ├── 04_results.json           ← output Agente 4
│   └── 04_gate.json              ← gate Agente 4
└── .agents/skills/
    ├── agent1-watch/SKILL.md
    ├── agent2-plan/SKILL.md
    ├── agent3-write/SKILL.md
    └── agent4-validate/SKILL.md
```

---

## Gates y Puntos de Intervención

Cada agente termina con un bloque explícito antes de dar control al usuario:

```
## ✋ Gate [N] — Revisión Requerida

**Qué hice:** resumen en 2-3 líneas
**Decisiones tomadas:** listado de elecciones no obvias
**Dudas pendientes:** preguntas concretas que necesitan respuesta
**Próximo paso:** comando a invocar cuando confirmes
```

El usuario puede en cualquier gate:
- **Confirmar** → invocar el siguiente agente
- **Corregir** → editar el archivo de output y volver a invocar el mismo agente
- **Retroceder** → volver a un agente anterior con nuevas instrucciones
- **Pausar** → dejar el estado guardado en `pipeline/` y retomar después

---

## Convenciones de Iteración

Cuando un agente necesita corregir trabajo de un agente anterior:

```
# Iteración sobre trabajo previo
Agente 3 detecta que el plan de Agente 2 tiene ambigüedad
  → NO asume, NO inventa
  → Expone la ambigüedad en el Gate
  → Espera que el usuario corrija 02_test_plan.md o dé instrucción verbal
  → Re-genera solo los tests afectados
```

Los archivos `pipeline/` son la fuente de verdad entre agentes.
Si hay conflicto entre lo que dice el archivo y la instrucción verbal, **prevalece la instrucción verbal** y se actualiza el archivo.

---

## Estado del Pipeline

Para saber en qué punto está el pipeline en cualquier momento, revisar:

| Archivo existe y tiene contenido | Estado |
|---|---|
| Solo `pipeline/` vacío | No iniciado |
| `01_changes.md` | Agente 1 completado |
| `02_test_plan.md` | Agente 2 completado |
| `03_generated_files.md` | Agente 3 completado |
| `04_results.md` | Ciclo completo |

---

## Mecanismo de Aprendizaje

Cada agente mejora con el tiempo a través de un ciclo de aprendizaje explícito:

```
Durante la sesión → detecta observaciones no obvias
Al final (gate)   → propone learnings al usuario
Usuario decide    → sí / no / modificar
Si aprueba        → se persiste en pipeline/learning/<agentN>_knowledge.json
Próxima sesión    → el agente lee su knowledge y lo aplica antes de trabajar
```

### Categorías de learning
| Categoría | Ejemplo |
|-----------|---------|
| `api_quirk` | "Este endpoint devuelve 200 aunque falle, revisar body.status" |
| `pattern` | "Los módulos de media siempre requieren cleanup de S3 además del registro" |
| `convention` | "El equipo prefiere un .spec.js por feature, no por endpoint" |
| `anti_pattern` | "No usar faker.random.word() para títulos, falla validación de longitud" |
| `env_quirk` | "En staging el primer request siempre da 504, reintentar una vez" |
| `classification` | "El fallo de /api/auth en staging es env_quirk, no bug real" |

### Scope de aprendizaje
- `global` → aplica a todos los módulos
- `module:<name>` → solo para ese módulo
- `endpoint:<path>` → solo para ese endpoint específico

---

## Próximos Pasos

- [x] Crear `pipeline/CONTRACTS.md`
- [x] Crear `pipeline/learning/` con archivos iniciales
- [x] Crear `.agents/skills/agent1-watch/SKILL.md`
- [x] Crear `.agents/skills/agent2-plan/SKILL.md`
- [x] Crear `.agents/skills/agent3-write/SKILL.md`
- [x] Crear `.agents/skills/agent4-validate/SKILL.md`
- [ ] Agregar `SWAGGER_URL` a `.env`
- [ ] Primer run: `/agent1-watch` para generar snapshot inicial
- [ ] Primer ciclo completo del pipeline de principio a fin

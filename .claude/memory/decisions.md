---
name: Decisiones Técnicas
description: Decisiones de arquitectura, sus razones y cómo aplicarlas
type: project
---

# Decisiones Técnicas — API Test Flow

## D-001 — CommonJS sobre ESM

**Decisión**: Todo el proyecto usa CommonJS (`require`/`module.exports`). No usar ESM (`import`/`export`).

**Why**: El proyecto arrancó en CommonJS antes de que Playwright tuviera soporte maduro de ESM en Node.js. Los helpers, schemas y utils existentes usan `require`. Cambiar requeriría migración completa + riesgo de regresión en CI.

**How to apply**: Cualquier archivo nuevo (spec, helper, schema) debe usar `require`. Si el agente genera código con `import`, corregir antes de commit.

---

## D-002 — Faker v7 (no v8+)

**Decisión**: `@faker-js/faker` fijado en `^7.6.0`. Usar `faker.random.*`, `faker.lorem.*`, `faker.internet.*`.

**Why**: La API de Faker v8+ cambió `faker.random.alphaNumeric()` a `faker.string.alphanumeric()`. El proyecto no fue migrado. Usar v8+ API causa runtime errors silenciosos.

**How to apply**: Agent 4 tiene esto como restricción no negociable. Si se detecta `faker.string.*` en código generado, reemplazar por `faker.random.*`.

---

## D-003 — Allure para nightly, Playwright HTML para push

**Decisión**: Nightly usa Allure con historial acumulativo. Push usa el reporte HTML nativo de Playwright.

**Why**: Allure permite comparar tendencias entre runs. Para push (frecuente), el reporte HTML es más rápido de generar y deployar. Mantener dos reportes separados evita que el historial Allure se contamine con runs de CI rápidos.

**How to apply**: No cambiar el CI para usar solo uno de los dos. Ambos tienen propósitos distintos.

---

## D-004 — No hardcodear IDs de producción en tests

**Decisión**: Crear recursos en el test usando dataFactory. Solo los IDs en `.env` marcados como "de referencia" (LIVE_STREAM_ID, etc.) pueden usarse en tests que requieren IDs preexistentes.

**Why**: Un test que depende de un ID hardcodeado falla si ese recurso es eliminado. Los IDs del .env son para IDs de configuración de la plataforma que no cambian frecuentemente.

**How to apply**: Si un test necesita un recurso, crearlo en el test y registrarlo en ResourceCleaner.

---

## D-005 — Pipeline de agentes en `.claude/commands/` (migrado de `.agents/`)

**Decisión**: Los skills de agentes viven en `.claude/commands/`. El directorio `.agents/` está deprecado.

**Why**: Claude Code lee slash commands de `.claude/commands/`. El directorio `.agents/` era la ubicación original antes de adoptar la convención estándar de Claude Code. Los archivos en `.agents/` no son cargados automáticamente.

**How to apply**: Crear nuevos agentes/skills en `.claude/commands/` o `.claude/agents/`. No agregar nada nuevo a `.agents/`.

---

## D-006 — Dos pipelines complementarios

**Decisión**: Mantener dos pipelines independientes con propósitos distintos.

- `/generate-tests` — proactivo: "generar tests para una nueva feature/endpoint"
- `/review-diff` — reactivo: "analizar el riesgo de un cambio y seleccionar tests a correr"

**Why**: Son flujos conceptualmente diferentes. `/generate-tests` produce código nuevo. `/review-diff` analiza código existente y decide qué tests ejecutar. Fusionarlos crearía confusión sobre el propósito.

**How to apply**: Usar `/generate-tests` cuando hay un cambio en el backend que requiere tests nuevos. Usar `/review-diff` cuando hay un PR/commit y se quiere verificar el impacto antes de merge.

---

## D-007 — ResourceCleaner antes del id

**Decisión**: `cleaner.register(tipo, id)` debe ejecutarse **inmediatamente** después de obtener el id, antes de cualquier aserción.

**Why**: Si una aserción falla (expect throws), el recurso creado quedará huérfano en la base de datos si register no se ejecutó. El cleanup es crítico para mantener el ambiente de test limpio.

**How to apply**: Orden correcto: POST → obtener id → `cleaner.register(tipo, id)` → aserciones.

---

## D-008 — `test.fail()` para bugs de backend documentados

**Decisión**: Usar `test.fail()` en tests que documentan bugs conocidos del backend donde la API acepta lo que debería rechazar. El test espera que la aserción falle (comportamiento incorrecto del backend). Cuando el bug se corrija, el test empezará a pasar y Playwright lo marcará como "passed unexpectedly", alertando al equipo.

**Why**: Los bugs no deben silenciarse con assertions permisivas (`[200, 400]`). `test.fail()` documenta la expectativa correcta Y actúa como alarma automática cuando el backend se corrige.

**How to apply**: `test.fail()` al inicio del test + `if (res.ok) cleaner.register(tipo, id)` para cleanup + assertion de lo que DEBERÍA retornar (ej: `expect([400, 422]).toContain(res.status)`).

---

## D-009 — Tests de live-stream crean su propio stream en beforeAll

**Decisión**: Los test suites de live-stream (schedule, logo, quizzes) crean un live stream dedicado en `test.beforeAll` y lo eliminan en `test.afterAll`. No hardcodear IDs ni depender de streams preexistentes.

**Why**: Los IDs hardcodeados `68dd426831f7bd5b6561e59e` y `6971288e64b2477e2b935259` fueron eliminados del entorno y causaron fallos masivos en el nightly. La dependencia de datos preexistentes es frágil.

**How to apply**: Todo test que necesite un live stream crea uno propio. Si el create falla, `liveId` queda `null` y un `beforeEach` guard hace `test.skip`.

---
name: review-diff
description: Pipeline de revisión de cambios del backend sm2. Analiza un diff/rama/PR, evalúa riesgo en los módulos de API, verifica cobertura existente y ejecuta la suite óptima. Dos fases: análisis por defecto, ejecución con --run.
---

# /review-diff — Pipeline de Revisión de Cambios

Orquestador del pipeline de QA para `api_test_flow`.
Úsalo para evaluar el impacto de un cambio en el backend sm2 antes de hacer merge.

## Diferencia con /generate-tests

`/review-diff` **evalúa y ejecuta tests existentes**. No genera tests nuevos (salvo gaps críticos).
`/generate-tests` **genera tests nuevos** desde una descripción de cambio.

## Invocación

```
/review-diff feature/issue-8083-js    → analiza rama vs master
/review-diff                          → analiza con diff manual en pipeline/input/diff.patch
/review-diff --dry-run                → análisis sin ejecutar tests
/review-diff feature/issue-8083-js --run  → análisis + ejecución automática
```

Fuente del diff: `node pipeline/gen-diff.js` (repo local) o `pipeline/input/diff.patch` (manual).

---

## FASE 1 — Análisis (siempre corre)

### Paso 0 — Preparar entorno

```bash
mkdir -p tmp/pipeline
```

Confirmar al usuario:
```
🔍 /review-diff — [rama o "diff manual"] · modo: [análisis | análisis+ejecución | dry-run]
```

### Paso 0.5 — Generar diff

Si se proporcionó una rama:
```bash
node pipeline/gen-diff.js <rama> --fetch
```
- Si falla → pedir al usuario que pegue el diff manualmente en `pipeline/input/diff.patch`
- Si exitoso → copiar a `tmp/pipeline/diff-input.json` con metadata

Si no se proporcionó rama → usar `pipeline/input/diff.patch` si existe.

Reportar:
```
✅ Diff preparado: N archivos · Módulos detectados: [lista]
```

### Paso 1 — Análisis de riesgo

Delegar a agente `diff-analyzer`:

> Lee `pipeline/input/diff.patch` y produce `tmp/pipeline/risk-map.json`.
> Mapea cambios del backend sm2 a módulos de API (media, live, ad, etc.).
> Clasifica riesgo por módulo: CRITICAL / HIGH / MEDIUM / LOW.

Mostrar el risk map al usuario.

Si `risk_level = LOW` y todos los cambios son docs/comments → informar y preguntar si continuar.

### Paso 2 — Verificación de cobertura + selección de suite

Delegar a agente `coverage-checker`:

> Lee `tmp/pipeline/risk-map.json` y evalúa cobertura en `tests/api/`.
> Busca por módulo en las 4 capas (smoke/regression/integration/contract).
> Produce `tmp/pipeline/coverage-report.json` con gaps por capa.
> Produce `tmp/pipeline/test-plan.json` con los comandos exactos de Playwright.
> Incluir campo `should_generate_tests: boolean`.
> **NO modificar** `tmp/pipeline/risk-map.json`.

Mostrar el coverage report y el test plan al usuario.

---

**— Fin Fase 1 —**

`coverage-checker` ya produjo el `test-plan.json` — no es necesario invocar `test-selector`.

Si NO se pasó `--run` ni `--dry-run`, preguntar:

```
📋 Análisis completado.
   Gaps MUST: N  |  Tests existentes relevantes: N  |  ~X minutos

   ¿Qué hacemos?
   [S] Ejecutar suite óptima (test-plan.json listo)
   [n] Terminar aquí
   [m] Modificar plan antes de ejecutar
```

- `n` → entregar resumen y terminar
- `S` o `m` → continuar a Fase 2

---

## FASE 2 — Ejecución (solo con --run o aprobación del usuario)

### Paso 3 — Generación de tests (condicional)

**Solo si `coverage-report.json` tiene `should_generate_tests: true` Y hay gaps MUST.**

Preguntar al usuario:
```
⚠️ Se detectaron N gaps sin cobertura.
   ¿Generar tests básicos antes de ejecutar? [s/N]
```

Si sí → invocar `/generate-tests --from-diff` con contexto del risk-map.
Si no → continuar con tests existentes.

### Paso 4 — Revisar test-plan (ya disponible)

`tmp/pipeline/test-plan.json` fue generado por `coverage-checker` en FASE 1 — no se necesita `test-selector`.

Si el usuario eligió `[m]odificar` → leer el test-plan.json existente, mostrarlo al usuario y preguntar qué agregar/quitar. Editar el archivo directamente.

### Paso 5 — Ejecución

Ejecutar los comandos de `test-plan.json` en orden. Mostrar progreso:

```
▶ Paso N/N: [label]
```

Si un paso con `blocking: true` falla:
```
⛔ Paso [N] falló (bloqueante). Pasos siguientes cancelados.
   [error resumido]
   ¿Continuar de todas formas? [s/N]
```

Pasos no bloqueantes: continuar aunque fallen, registrar en el resumen.

### Paso 6 — Análisis de resultados

Delegar a agente `results-analyzer`:

> Lee `tmp/pipeline/risk-map.json`, `tmp/pipeline/coverage-report.json`,
> `tmp/pipeline/test-plan.json` y el output de Playwright (`playwright-report/`).
> Produce `tmp/pipeline/results-report.json` y presenta el informe ejecutivo.

### Paso 7 — Limpieza

Auto-decisión basada en resultados:
- Hubo fallos → mover a `pipeline-history/YYYY-MM-DD_HH-MM_<change-type>/`
- Todo pasó → `rm -rf tmp/pipeline/`

Resumen final:

```
✅ Pipeline completado

Veredicto: SAFE TO MERGE | INVESTIGATE | DO NOT MERGE
Tests: N ejecutados · N passed · N failed
Tiempo: X min
```

---

## Modo --dry-run

Ejecutar Pasos 1 y 2. Mostrar risk map + coverage report + test plan propuesto sin ejecutar nada.

---

## Manejo de Errores

Si cualquier agente falla o produce output inválido:
1. Mostrar el error
2. Preguntar si continuar con el siguiente paso o detenerse
3. Nunca inventar resultados de agentes

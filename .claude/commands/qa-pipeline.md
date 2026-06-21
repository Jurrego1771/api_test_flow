---
description: "Orquesta el flujo QA completo de 5 agentes: impacto → riesgos → diseño de tests → implementación+ejecución → issues. Recibe un PR #, una rama o un prompt de feature."
argument-hint: "<PR # | rama | descripción de la feature>"
---

# /qa-pipeline — Flujo QA de 5 agentes

Objetivo: a partir de un cambio del backend (`mediastream/sm2`), confirmar sus riesgos,
diseñar y correr los tests de API que los cubren, y reportar los bugs encontrados como
issues en `Jurrego1771/api_test_flow` + Slack (para que QA los replique en Monday).

**Entrada:** `$ARGUMENTS` (un PR #, una rama `feature/...`, o una descripción de feature con user stories).
Si `$ARGUMENTS` está vacío, pide la entrada antes de empezar.

Los artefactos viven en `.tmp/pipeline/` (gitignored). Cada etapa lee el artefacto de la anterior.

## Ejecución — lanzar los agentes EN SECUENCIA (cada uno depende del anterior)

1. **Stage 1 — impacto.** Lanza el agente `api-change-impact-analyzer` con `$ARGUMENTS`.
   Pídele que escriba su reporte en `.tmp/pipeline/01-impact.json`.
   - Gate: si no hay rutas de API afectadas, detente e informa "sin impacto en la API".

2. **Stage 2 — validar riesgos.** Lanza `risk-validator` sobre `.tmp/pipeline/01-impact.json` → `.tmp/pipeline/02-risks.yaml`.
   - Gate: si no hay riesgos `confirmed: true` con `status` ≠ `covered`, detente e informa "sin riesgos abiertos nuevos".

3. **Stage 3 — diseñar tests.** Lanza `test-designer` sobre `.tmp/pipeline/02-risks.yaml` → `.tmp/pipeline/03-test-plan.yaml`.
   - Gate: si `summary.new_cases == 0`, detente.

4. **Stage 4 — implementar + ejecutar.** Lanza `test-author-runner` sobre `.tmp/pipeline/03-test-plan.yaml`.
   - Escribe specs en `tests/api/<capa>/<modulo>/`, los corre, sincroniza `qa-knowledge/`, emite `.tmp/pipeline/04-bugs.yaml`.
   - Los specs quedan SIN commitear (para revisión del usuario).
   - Gate: si `bugs` está vacío, salta el stage 5 e informa "tests verdes, sin bugs".

5. **Stage 5 — reportar issues.** Lanza `issue-reporter` sobre `.tmp/pipeline/04-bugs.yaml`.
   - Dedup vs issues existentes, **confirma uno a uno** con el usuario, crea el issue en `Jurrego1771/api_test_flow`, notifica c/u en Slack → `.tmp/pipeline/05-issues.yaml`.

## Reglas del orquestador

- **No saltes etapas** ni paralelices: el contrato es lineal (1→2→3→4→5).
- Respeta los **gates**: si una etapa no produce trabajo para la siguiente, detente y resume por qué.
- Entre etapas, muestra un resumen de 1-2 líneas del artefacto producido antes de lanzar la siguiente.
- No commitees ni hagas push de los specs/qa-knowledge generados — eso lo decide el usuario al final.
- Contrato detallado de cada artefacto: `pipeline/qa-pipeline-contracts.md`.

## Cierre

Al terminar, entrega un resumen: riesgos confirmados/propuestos, tests añadidos por capa,
bugs encontrados, issues creados (URLs) y archivos `qa-knowledge/` actualizados que quedan
en el working tree para revisión.

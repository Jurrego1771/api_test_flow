---
name: generate-tests
description: Orquestador del pipeline de generación de tests. Coordina los 4 agentes (Requirements → Impact → Design → SDET) para generar tests Playwright desde una descripción de cambio en el backend sm2.
---

# /generate-tests — Pipeline de Generación de Tests

Orquestador del pipeline de 4 agentes para el proyecto `api_test_flow`.
Úsalo cuando el backend sm2 recibe un cambio (nuevo endpoint, campo modificado, nueva validación) y necesitas generar los tests correspondientes.

## Cuándo usar este comando vs /review-diff

| Situación | Comando |
|---|---|
| Hay un cambio en el backend y necesito **generar** tests nuevos | `/generate-tests` |
| Hay un PR/commit y quiero **evaluar riesgo** y **correr tests existentes** | `/review-diff` |

## Invocación

```
/generate-tests                    → pipeline completo interactivo
/generate-tests --from-diff        → saltar Paso 0 si diff ya está en pipeline/input/diff.patch
/generate-tests --skip-diff        → saltar generación de diff (solo descripción textual)
```

---

## Paso 0 — Preparar entorno y diff

```bash
mkdir -p pipeline/input
```

Si NO se usó `--skip-diff` y `--from-diff` no fue indicado:
- Preguntar al usuario: **¿cuál es el nombre de la rama a analizar?** (o si quiere solo descripción textual)
- Si proporciona rama → ejecutar `node pipeline/gen-diff.js <branch> --fetch` y guardar en `pipeline/input/diff.patch`
- Si prefiere solo descripción → continuar sin diff

Si `--from-diff` fue indicado o el usuario ya dejó el diff en `pipeline/input/diff.patch`:
- Confirmar que el archivo existe antes de continuar

Confirmar al usuario:
```
🚀 /generate-tests — Pipeline de 4 agentes
Diff: [disponible en pipeline/input/diff.patch | no disponible]
Describe el cambio en el backend.
```

> **Nota para Agent 1:** El orquestador ya gestionó el diff en este Paso 0.
> Agent 1 debe detectar que `pipeline/input/diff.patch` ya existe y NO volver a pedir la rama.

---

## Paso 1 — Requirements Analyst

Delegar a `/agent1-requirements`:

> Analiza la descripción del usuario y el diff git opcional.
> Produce `pipeline/01_requirements.json` con casos de uso Given/When/Then.
> Lee `pipeline/learning/agent1_knowledge.json` para aplicar learnings previos.

Mostrar resumen al usuario una vez completado.

Si `01_gate.json` tiene `status: "BLOCKED"` → informar al usuario y detenerse.

---

## Paso 2 — Impact Analyst

Delegar a `/agent2-impact`:

> Lee `pipeline/01_requirements.json` y mapea cobertura existente en `tests/api/`.
> Produce `pipeline/02_impact_map.json` con riesgo por endpoint.

Mostrar resumen al usuario.

Si `02_gate.json` tiene `status: "BLOCKED"` → informar y detenerse.

---

**— Checkpoint —**

Mostrar al usuario:
```
📋 Análisis completado.
   Módulos afectados: [lista]
   Endpoints en riesgo: N
   Cobertura faltante: smoke/N · regression/N · integration/N · contract/N

   ¿Continuar con el diseño y generación de código? [S/n]
```

Si responde `n` → entregar resumen y terminar.

---

## Paso 3 — Test Designer

Delegar a `/agent3-design`:

> Lee ambos JSONs y diseña test cases concretos por capa.
> Produce `pipeline/03_test_plan.json` con payload_notes y aserciones esperadas.

Mostrar plan al usuario.
Preguntar si quiere modificar algo antes de generar código.

---

## Paso 4 — SDET

Delegar a `/agent4-code`:

> Lee `pipeline/03_test_plan.json` y escribe código Playwright real.
> Respeta CommonJS, Faker v7, estructura estándar, learnings de `agent4_knowledge.json`.
> Produce los archivos `.spec.js` + `pipeline/04_manifest.json`.

Mostrar archivos generados/modificados.

---

## Resumen Final

```
✅ Pipeline completado

Tests generados: N (en M archivos)
Tests modificados: N (en M archivos)
Por capa: smoke/N · regression/N · integration/N · contract/N

Para ejecutar los tests nuevos:
npx playwright test <file_targets> --project=smoke
```

Mostrar `todos` del `04_gate.json` si existen (schemas pendientes, etc.).

---

## Manejo de Errores

Si cualquier agente produce `status: "BLOCKED"`:
1. Mostrar el motivo del bloqueo
2. Mostrar las `questions` del gate
3. Preguntar al usuario si puede responder las preguntas para continuar
4. Si no → detenerse y sugerir qué información se necesita

Nunca inventar outputs de agentes cuando hay bloqueo.

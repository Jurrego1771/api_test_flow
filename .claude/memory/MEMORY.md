# MEMORY INDEX — api_test_flow

## Proyecto
- [project_context.md](project_context.md) — Suite QA REST API Mediastream sm2: stack, CI, módulos cubiertos, reportes

## Sistema bajo test (API sm2)
- [api_system.md](api_system.md) — Módulos, endpoints, auth, quirks conocidos, DataFactory, ResourceCleaner

## Filosofía de testing
- [testing_philosophy.md](testing_philosophy.md) — 4 capas por riesgo, convenciones de naming, reglas de código

## Mapa de cobertura (machine-readable)
- [qa-knowledge/INDEX.yaml](../../qa-knowledge/INDEX.yaml) — LEER PRIMERO. Router: por módulo qué tests existen, counts y cobertura de riesgos. Saltar a `qa-knowledge/<modulo>/` (tests.yaml + risk.yaml). Evita grepear `tests/` a ciegas. Formato: `qa-knowledge/SCHEMA.md`

## Gaps de cobertura
- [testing_gaps.md](testing_gaps.md) — Módulos sin coverage completa por capa, estado actual

## Decisiones técnicas
- [decisions.md](decisions.md) — Decisiones de arquitectura y sus razones

## Sesiones (se crean dinámicamente)
- [2026-06-19](sessions/2026-06-19_qa-knowledge-y-prod-multiambiente.md) — qa-knowledge (category/live-stream/show), prod multi-ambiente (D-010), cleaner multi-pass, fixes show
<!-- sessions/YYYY-MM-DD_tema.md -->

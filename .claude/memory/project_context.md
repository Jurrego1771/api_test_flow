---
name: Contexto del Proyecto
description: Suite QA REST API Mediastream sm2 — stack, CI, módulos cubiertos, reportes online
type: project
---

# API Test Flow — Contexto del Proyecto

Suite de automatización de pruebas para la **API REST de Mediastream Platform (sm2)**.

## Stack
- **Framework**: Playwright 1.56+ + Node.js CommonJS (`require`/`module.exports` — nunca ESM)
- **Datos**: Faker v7 (`faker.random.*`, `faker.lorem.*` — NUNCA `faker.string.*` de v8+)
- **Validación**: Zod v4 (schemas en `schemas/`)
- **Reportes**: Allure 2.37+ (nightly) + Playwright HTML (push)
- **HTTP interno**: ApiClient (`lib/apiClient.js`) — inyecta `x-api-token` automáticamente

## Proyectos Playwright (4 capas)
- `smoke` — happy path, 30s timeout
- `regression` — edge cases + negativos, 30s timeout
- `integration` — flujos multi-recurso, 60s timeout
- `contract` — validación schema Zod, 30s timeout

## CI/CD
- **push.yml**: smoke + contract en cada push, Slack solo si falla, HTML report → GitHub Pages `/smoke/`
- **nightly.yml**: suite completa 06:00 UTC diario, Slack siempre, Allure con historial → `/nightly/`

## Módulos cubiertos (14)
media, live-stream, schedule, ad, category, playlist, article, show, coupon, access-restriction, customer, EPG, webhooks, VMS

## Estadísticas actuales (verificar con git log)
- ~40 archivos .spec.js
- Smoke: 13 módulos
- Regression: 6 módulos (media, live, schedule, playlist, show, cupones)
- Integration: 6 módulos (article, epg, live, media, playlist, show)
- Contract: 8 módulos (access_restriction, ad, category, epg, live, media, playlist, show)

## Reportes online
- Push: https://jurrego1771.github.io/api_test_flow/smoke/
- Nightly: https://jurrego1771.github.io/api_test_flow/nightly/

## Repositorio SUT (backend)
- `SM2_REPO_PATH` — ruta local al repo sm2 (configurable en .env)
- `SM2_BASE_BRANCH` — rama base para diffs (default: master)
- `GITHUB_TOKEN` — para acceso remoto vía GitHub API

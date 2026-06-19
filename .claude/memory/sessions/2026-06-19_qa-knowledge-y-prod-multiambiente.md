---
name: Sesión 2026-06-19
description: qa-knowledge (category/live-stream/show) + estrategia prod multi-ambiente + fixes show/cleaner
type: project
---

# qa-knowledge + Prod multi-ambiente — 2026-06-19

## Qué hicimos
- **qa-knowledge** (sistema nuevo, D-011): INDEX.yaml + SCHEMA.md + mapeo de 3 módulos
  (category 40 tests, live-stream 115, show 83) con tests.yaml + risk.yaml conectados
  por IDs. Cableado en CLAUDE.md + MEMORY.md para descubrimiento en cold-start.
- **Tests nuevos**:
  - category: +19 (drm branches, cycle parent, cascade media, 404s, media-assign) + limpieza de 4 redundantes.
  - live-stream: +18 (LIVE-RISK-011 logo overwrite, 003 record-state, 007 restream lifecycle, 001 geo, 012 not-found, 002 overlap).
  - show: SHW-005 cerrado (media visible vía show_info).
- **Fixes**:
  - `ResourceCleaner` multi-pass (D-012) — leaks silenciosos resueltos.
  - show-cascade: era test defect (asumía hard-delete; backend es soft-delete, cascade vía listado).
  - show-episodes/cascade: leaks de season/probe.
  - gitignore: destrackeado `allure-report-run/` (2647 archivos).
- **Prod multi-ambiente** (D-010): `prod.yml` con cadencia por capa (monitor diario @prod-safe + full manual en cuenta QA), `prod-guard` globalSetup. EU verificado vivo (v7.0.65). US=`platform.mediastre.am`, EU=`eu.platform.mediastre.am`.

## Findings de backend (documentados en api_system.md)
F1 update live pisa logo · F2 record/start|stop sin filtro account (no probado) ·
F3 detail no afirma ausencia ARNs · F4 NOT_FOUND 200-vs-404 inconsistente ·
F6 fix-tz-offset fórmula · F7 overlap schedule sale 500 no 400 ·
category parent-wipe · show soft-delete.

## Pendiente para próxima sesión
- [ ] Agregar secrets US en GitHub Actions (`US_BASE_URL`, `US_API_TOKEN`) — EU ya están.
- [ ] Ampliar tag `@prod-safe` a GETs read-only puros de cada módulo (verificar test-por-test que no escriban antes de tagear).
- [ ] Mapear resto de módulos a qa-knowledge (media, ad, playlist, coupon, customer, access-restriction, epg...).
- [ ] live-stream P0 abiertos que requieren mocks/fixtures/2º token:
      restream start/stop happy, ad-insertion (SCTE35), drm token, epg sync,
      metadata, audio_exclusion, transcription, F2 cross-account (2º token),
      F3 ARN sanitization en detail, delete cascade de hijos (integración).
- [ ] (Opcional) reportar findings F1-F7 al equipo backend.

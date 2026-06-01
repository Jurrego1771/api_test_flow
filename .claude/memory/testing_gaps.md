---
name: Gaps de Cobertura
description: Módulos sin coverage completa por capa y estado actual de gaps conocidos
type: project
---

# Testing Gaps — API Test Flow

Última actualización: 2026-05-31

> **Importante — actualización manual requerida.**
> Este archivo NO se actualiza automáticamente cuando se generan tests nuevos.
> Al finalizar cada sesión donde se crearon o modificaron tests, correr `/session-review`
> para sincronizar este registro. Sin ese paso, `qa-report-generator` y `coverage-checker`
> trabajarán con datos desactualizados.

## Cobertura por Módulo y Capa

| Módulo | Smoke | Regression | Integration | Contract |
|--------|-------|------------|-------------|----------|
| media | ✅ | ✅ | ✅ | ✅ |
| live-stream | ✅ | ✅ | ✅ | ✅ |
| schedule | ✅ | ✅ | ✅ | ⬜ |
| ad | ✅ | ✅ | ✅ | ✅ |
| category | ✅ | ✅ | ✅ | ✅ |
| playlist | ✅ | ✅ | ✅ | ✅ |
| article | ✅ | ⬜ | ✅ | ⬜ |
| show | ✅ | ✅ | ✅ | ✅ |
| coupon | ✅ | ✅ | 〜 | ✅ |
| access | ✅ | ✅ | ⬜ | ✅ |
| access-restriction | ✅ | ✅ | ✅ | ✅ |
| customer | ✅ | ✅ | ⬜ | ✅ |
| EPG | ✅ | ✅ | ✅ | ✅ |
| webhooks | ⬜ | ⬜ | ⬜ | ⬜ |
| VMS | ⬜ | ⬜ | ⬜ | ⬜ |

## Gaps Prioritarios

### ⬜ schedule — contract
- Smoke y regression existen. Falta contract spec usando `schedule.schema.js` existente.

### ⬜ webhooks — todas las capas
- Auth JWT diferente (`WEBHOOK_JWT`). Requiere endpoint receptor para validar delivery.

### ⬜ VMS — todas las capas
- URL y token diferentes (`VMS_BASE_URL`, `VMS_TOKEN`). Módulo separado.

### ⬜ article — regression + contract
- Smoke existe con `ensureEndpointAvailable`. Endpoint inestable en dev/staging.

### 〜 coupon — integration (límites) — PARCIAL
- `coupon-limits.integration.spec.js` cubre: persistencia de campos `max_use`/`customer_max_use`/`percent` via GET, search por código (`GET /api/coupon/:code/search`), y actualización de límites.
- Enforcement real (canjear cupón y verificar bloqueo) requiere endpoint de canje — no investigado aún. Posible: `/api/customer/:id/coupon`.

### ⬜ customer — integration
- Flujo suscripción completo no cubierto. Requiere módulo de pagos.

## Bugs Conocidos

- `POST /api/ad/:id` con `tags=[]` → no limpia el array (TC_AD_INT_002)
- `POST /api/category/:id` con `description=''` → no limpia el campo (TC_CAT_REG_002)
- `POST /api/ad/new` con `insertion[default_duration]: '-5'` → acepta valor negativo (TC_AD_033)
- `POST /api/ad/new` sin `type` → crea ad sin type en lugar de rechazar (TC_AD_013)
- `POST /api/ad/new` con `type: 'nonexistent'` → acepta enum inválido (TC_AD_014)
- `POST /api/ad/new` con `name: '     '` → acepta nombre solo espacios (TC_AD_016)

## Marcadores de Estado
- ✅ = cobertura existe (mínimo smoke + algún negative)
- ⬜ = sin cobertura o cobertura parcial conocida

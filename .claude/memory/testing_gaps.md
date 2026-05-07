---
name: Gaps de Cobertura
description: Módulos sin coverage completa por capa y estado actual de gaps conocidos
type: project
---

# Testing Gaps — API Test Flow

Última actualización: 2026-05-06

## Cobertura por Módulo y Capa

| Módulo | Smoke | Regression | Integration | Contract |
|--------|-------|------------|-------------|----------|
| media | ✅ | ✅ | ✅ | ✅ |
| live-stream | ✅ | ✅ | ✅ | ✅ |
| schedule | ✅ | ✅ | ✅ | ⬜ |
| ad | ✅ | ⬜ | ⬜ | ✅ |
| category | ✅ | ⬜ | ⬜ | ✅ |
| playlist | ✅ | ✅ | ✅ | ✅ |
| article | ⬜ | ⬜ | ✅ | ⬜ |
| show | ✅ | ✅ | ✅ | ✅ |
| coupon | ✅ | ✅ | ⬜ | ⬜ |
| access-restriction | ✅ | ⬜ | ⬜ | ✅ |
| customer | ✅ | ⬜ | ⬜ | ⬜ |
| EPG | ✅ | ⬜ | ✅ | ✅ |
| webhooks | ⬜ | ⬜ | ⬜ | ⬜ |
| VMS | ⬜ | ⬜ | ⬜ | ⬜ |

## Gaps Prioritarios (P0/P1)

### ⬜ article — smoke + regression + contract
- El endpoint devuelve 404 en muchos envs — difícil de probar automáticamente
- Requiere `ensureEndpointAvailable` como prerequisito
- **Decisión**: dejar como `@quarantine` hasta que el endpoint sea estable

### ⬜ webhooks — todas las capas
- Auth con JWT diferente (`WEBHOOK_JWT` expira en ~24h)
- Requiere endpoint receptor para validar delivery
- Gap #1: crear suite básica smoke con endpoints configuración

### ⬜ VMS — todas las capas
- URL y token diferentes (`VMS_BASE_URL`, `VMS_TOKEN`)
- Módulo separado del rest de la API
- Gap #2: explorar endpoints disponibles + crear smoke suite

### ⬜ ad — regression + integration
- Bug conocido: `tags=[]` no limpia el array
- Falta: test de flujo ad en un live stream
- Gap #3: regression para campo `tags` + integration con live

### ⬜ customer — regression + integration + contract
- Comportamiento especial: DELETE desactiva, no elimina
- Falta: flujo de suscripción completo
- Gap #4: regression básica + contract schema

### ⬜ schedule — contract
- Smoke y regression existen
- Falta validación de schema Zod para schedule responses
- Gap #5: agregar `schedule.schema.js` + contract spec

## Bugs Conocidos (tests marcados @known-bug)

- `POST /api/ad/:id` con `tags=[]` → no limpia el array
- `POST /api/category/:id` con `description=''` → no limpia el campo

## Marcadores de Estado
- ✅ = cobertura completa (todos los casos P0/P1)
- ⬜ = sin cobertura o cobertura parcial conocida

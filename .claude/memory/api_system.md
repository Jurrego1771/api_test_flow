---
name: Sistema bajo test — API sm2
description: Módulos, endpoints, auth, quirks conocidos, DataFactory, ResourceCleaner tipos
type: project
---

# API sm2 — Referencia para QA

**Última verificación desde fuente**: 2026-05-06
**Base URL**: `https://dev.platform.mediastre.am` (env: `BASE_URL`)
**Auth**: Header `x-api-token: <token>` — ApiClient lo inyecta automáticamente

## Módulos y Rutas Base

| Módulo | Prefijo TC | Ruta base | Notas |
|--------|-----------|-----------|-------|
| media | TC_MED | `/api/media` | JSON body |
| live-stream | TC_LIV | `/api/live-stream` | JSON body |
| schedule | TC_SCH | `/api/live-stream/:id/schedule-job` | JSON body |
| ad | TC_AD | `/api/ad` | **Create usa `/api/ad/new` con `{ form: true }`** |
| category | TC_CAT | `/api/category` | GET by id NO devuelve `visible` |
| playlist | TC_PLS | `/api/playlist` | Manual y Smart playlists |
| article | TC_ART | `/api/article` | **Devuelve 404 — usar `ensureEndpointAvailable`** |
| show | TC_SHW | `/api/show` | **Requiere `{ form: true }` en POST** |
| coupon | TC_CPN | `/api/coupon` | Sin factory en dataFactory |
| access-restriction | TC_AR | `/api/settings/advanced-access-restrictions` | JSON body |
| customer | TC_CUS | `/api/customer` | Sin factory; `DELETE` desactiva, no elimina |
| EPG | TC_EPG | `/api/settings/epg-mask` | JSON body |
| webhooks | — | `/api/settings/webhooks` | Auth: JWT (`WEBHOOK_JWT`) |
| VMS | — | VMS API (`VMS_BASE_URL`) | Token distinto (`VMS_TOKEN`) |

## Quirks Conocidos de la API (críticos para los tests)

- **module:ad** — crear usa `POST /api/ad/new` con `{ form: true }` — NO `/api/ad` con JSON
- **module:show** — `POST /api/show` requiere `{ form: true }` — NO JSON
- **module:article** — devuelve 404 en todos sus endpoints — siempre `ensureEndpointAvailable(apiClient, '/api/article')` al inicio del test
- **module:category** — `GET /api/category/:id` NO devuelve el campo `visible` — no asertar `visible` en GET
- **module:ad** — `POST /api/ad/:id` con `tags=[]` NO limpia el array (bug confirmado) — marcar con `knownBugTest`
- **module:category** — `POST /api/category/:id` con `description=''` NO limpia el campo (bug confirmado) — marcar con `knownBugTest`
- **Persistencia** — verificar siempre con GET posterior — el backend puede retornar valores del request sin haberlos guardado realmente

## DataFactory — Métodos Disponibles

| Módulo | Método |
|--------|--------|
| media | `dataFactory.generateMediaPayload(overrides)` |
| live-stream | `dataFactory.generateLiveStreamPayload(overrides)` |
| show | `dataFactory.generateShowPayload(overrides)` / `generateShowMinimalPayload()` |
| playlist (manual) | `dataFactory.generateManualPlaylistPayload(mediaIds, overrides)` |
| playlist (smart) | `dataFactory.generateSmartPlaylistPayload(overrides)` |
| schedule | `dataFactory.generateSchedulePayload(overrides)` |
| access-restriction | `dataFactory.generateAccessRestrictionPayload(overrides)` |
| article | `dataFactory.generateArticlePayload(overrides)` |
| ad | ❌ Sin factory — construir inline |
| category | ❌ Sin factory — construir inline |
| coupon | ❌ Sin factory — construir inline |
| customer | ❌ Sin factory — construir inline |

**Patrón para módulos sin factory:**
```javascript
const payload = {
    name: `qa_ad_${faker.random.alphaNumeric(8)}`,
    type: 'vast',
    is_enabled: 'false',
};
```

## ResourceCleaner — Tipos Soportados

`media`, `playlist`, `ad`, `category`, `coupon`, `show`, `article`, `live-stream`, `accessRestriction`, `epg-origin`

Formato especial:
- `season` → id: `"showId/seasonId"`
- `episode` → id: `"showId/seasonId/episodeId"`
- `quiz` → id: `"liveId/quizId"`
- `customer` → desactiva en lugar de eliminar

## Schemas Zod Disponibles

`access_restriction`, `access_token`, `ad`, `article`, `category`, `coupon`, `coupon_group`, `customer`, `epg`, `episode`, `live`, `media`, `playlist`, `schedule`, `season`, `show`, `vms`, `webhook`

Importar desde `../../../../schemas/<module>.schema.js` (relativo a `tests/api/<layer>/<module>/`).

## ApiClient — Form Encoding

Varios endpoints requieren `application/x-www-form-urlencoded`:
```javascript
await apiClient.post('/api/ad/new', payload, { form: true });
await apiClient.post('/api/show', payload, { form: true });
```
JSON es el default para el resto.

## Patrones de Diseño Confirmados

- **Field clear (3 pasos)**: create → update (set value) → update (clear) → GET verify
- **Test de persistencia**: siempre verificar con GET posterior
- `ensureEndpointAvailable` va dentro del test, NO en beforeEach
- Prefijo `qa_` o `[QA-AUTO]` en todos los nombres/títulos de recursos creados

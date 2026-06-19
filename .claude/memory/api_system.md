---
name: Sistema bajo test — API sm2
description: Módulos, endpoints, auth, quirks conocidos, DataFactory, ResourceCleaner tipos
type: project
---

# API sm2 — Referencia para QA

**Última verificación desde fuente**: 2026-06-19
**Base URL dev**: `https://dev.platform.mediastre.am` (env: `BASE_URL`)
**Base URL prod**: US=`https://platform.mediastre.am`, EU=`https://eu.platform.mediastre.am` (ver D-010)
**Auth**: Header `x-api-token: <token>` — ApiClient lo inyecta automáticamente
**Health**: `GET /api/version` — público (sin auth), texto plano semver (ej. `7.0.65`). Canario de ambiente.

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
- **module:access-check** — `GET /api/access/check/play` retorna `{ status: "EXPIRED" }` SIN campo `message` cuando token expiró/inválido. Enum real: `OK | ERROR | EXPIRED`. Campo `message` es opcional.
- **module:coupon** — create response (`POST /api/coupon`) NO incluye `percent` ni `max_use`. Hacer GET para verificarlos.
- **module:access-restriction** — `POST` y `DELETE` requieren session auth (cookie), NO API token. En entornos API-token-only los writes fallan. Usar probe `arWriteAvailable` antes de tests de escritura.
- **module:coupon** — `POST /api/coupon` requiere `{ multipart: true }`. Requiere `group` existente — obtener via `GET /api/coupon-group`.
- **module:show** — DELETE show/season = **SOFT-delete**. `GET by-id` del hijo sigue devolviendo **200** tras borrar el padre; el cascade SOLO se observa en el **LISTADO** (`GET /api/show/:id/season` ya no lo incluye). Tests de cascade deben verificar vía listado, no esperar 404/500 by-id.
- **module:show** — `POST /api/show` funciona con JSON (la suite lo usa así), aunque el risk-register menciona `form:true`. Ambos sirven.
- **module:show** — episode `content[].value`: en CREATE es el id (string); en GET viene **populado** (objeto media completo con `show_info` que enlaza de vuelta a {showId,seasonId,episodeId}).
- **module:live-stream** — `POST /api/live-stream/:id` (update parcial) **PISA** `logo.live.position` (→`'top-right'`) y `logo.live.url` (→`''`) aunque no se envíen (update.js:480-485). `nowplaying` SÍ se preserva. Bug de pérdida de datos en updates parciales (LIVE-RISK-011 / finding F1).
- **module:live-stream** — `NOT_FOUND` inconsistente: devuelve **HTTP 200** con `status:ERROR` en toggle-online / record/start|stop / stop-record, pero **404** en toggle-bookmark / detail / update / delete (finding F4).
- **module:live-stream** — solapamiento de schedule-job: el overlap SÍ se detecta (`data: INVALID_DATE_ERROR_OVERLAPPED_DATES`) pero sale **HTTP 500** en vez de 400 — `runInTransaction` re-envuelve el CustomError y pierde su status (finding F7).
- **module:live-stream** — `record/start.js` y `record/stop.js` usan `findById` SIN filtro de account (riesgo cross-tenant, finding F2 — no probado end-to-end, requiere 2º token).
- **module:live-stream** — Moments (`/moment/*`) **DEPRECADO** → todos los endpoints devuelven `410 FEATURE_DEPRECATED`.
- **module:live-stream** — restream nace `status:'STOPPED'` → `stop()` resuelve sin llamar al recording server (delete de restream es seguro/determinista en tests).
- **module:category** — `POST /api/category/:id` (update) SIN el campo `parent` setea `parent=null` → huérfana al hijo. Editar solo el nombre de un hijo lo desconecta del padre (update.js:88-89). Solo reproducible vía API (la UI siempre reenvía parent).

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
| ad | `dataFactory.generateAdPayload(overrides)` |
| category | `dataFactory.generateCategoryPayload(overrides)` |
| coupon | `dataFactory.generateCouponPayload(groupId, overrides)` — requiere groupId existente |
| customer | `dataFactory.generateCustomerPayload(overrides)` |

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

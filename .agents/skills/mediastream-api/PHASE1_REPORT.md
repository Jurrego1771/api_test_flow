# Informe Fase 1 — API Observer
**Fecha:** 2026-04-02
**Fuente Swagger:** `d:\Dev\Repos\mediastream\sm2\docs\swagger\platform\*.yaml` (26 archivos)

---

## Resumen Ejecutivo

| Métrica | Valor |
|---------|-------|
| Archivos YAML procesados | 26 |
| Módulos ahora documentados | 19 |
| Archivos `.md` generados en esta fase | 10 nuevos |
| Archivos `.md` preexistentes (validados) | 9 |
| Módulos con tests pero sin documentación previa | 4 → ahora documentados |
| Módulos pendientes (sin Swagger ni tests) | 6 |
| Cobertura de documentación (módulos con tests) | **100%** |

---

## Archivos Generados en Esta Fase

| Archivo | Módulo | Basado en YAML |
|---------|--------|----------------|
| `ads.md` | Ads | `ads.yaml` |
| `article.md` | Article | `article.yaml` |
| `playlist.md` | Playlist | `playlist.yaml` |
| `access-restrictions.md` | Settings > Access Restrictions | `settings-access-restrictions.yaml` |
| `access-token.md` | Access Token (Closed Access) | `access-token.yaml` |
| `channel.md` | Channel | `channel.yaml` |
| `customer.md` | Customer | `customer.yaml` |
| `image.md` | Image | `image.yaml` |
| `lookup.md` | Lookup | `lookup.yaml` |
| `machine-learning.md` | Machine Learning | `machine-learning.yaml` |
| `cdn.md` | CDN | `cdn.yaml` |

---

## Documentación Preexistente — Estado de Validación

| Archivo | Módulo | Consistente con Swagger |
|---------|--------|-------------------------|
| `media.md` | Media (colección) | ✅ Consistente |
| `media-id.md` | Media (recurso) | ✅ Consistente |
| `live-stream.md` | Live Stream (colección) | ✅ Consistente |
| `live-stream-id.md` | Live Stream (recurso) | ✅ Consistente con `livestream.yaml` |
| `category.md` | Category | ✅ Consistente |
| `coupon.md` | Customer Coupon | ✅ Consistente con `customer-coupon.yaml` |
| `show.md` | Show (colección) | ✅ Consistente |
| `show-id.md` | Show (recurso) | ✅ Consistente con `show.yaml` |
| `show-season-episode.md` | Show Season/Episode | ✅ Consistente con `show-season.yaml` + `show-episode.yaml` |

---

## Inconsistencias y Puntos de Atención

### ⚠️ Inconsistencias Detectadas en Swagger

1. **`article.yaml`** — Error 404 al GET usa `"NOT_FOUND"` pero al DELETE usa `"ARTICLE_NOT_FOUND"`. Inconsistencia en mensajes de error dentro del mismo módulo.

2. **`access-token.yaml`** — El parámetro `accessRestrictionId` aparece como query param en la spec pero la ruta dice `/{accessRestrictionId}` en el path. Ambigüedad documentada — verificar con llamada real.

3. **`ads.yaml`** — La creación usa `POST /api/ad/new` (no el estándar `POST /api/ad`). Patrón inconsistente con el resto de la API.

4. **`channel.yaml`** — Mismo patrón: crear usa `POST /api/channel/new`, `POST /api/channel/{id}/template/new`, `POST /api/channel/{id}/page/new`. Patrón "new" en lugar del REST estándar.

5. **`customer.yaml`** — No hay endpoint de **DELETE** para clientes. No existe `GET /api/customer/{id}`. Solo hay búsqueda por filtros.

6. **`article.yaml`** — El campo `author` en la respuesta es un **array de objetos** populados pero en el request se acepta como string. Tipo inconsistente entre request y response.

7. **`settings-access-restrictions.yaml`** — Summary dice "Returns list of shows" en lugar de "Returns list of access restrictions". Error de copy-paste en el Swagger.

### 🔴 Endpoints No Documentados en Swagger (detectados en tests)

| Endpoint | Módulo de Tests | Notas |
|----------|-----------------|-------|
| `GET /api/settings/advanced-access-restrictions` | `tests/access_restriction/` | Sí documentado en YAML |
| Operaciones de escritura en Access Restrictions | `tests/access_restriction/` | **Solo lectura** en Swagger — escritura requiere sesión de browser |

### 🟡 Módulos con YAML Disponible pero No Documentados Aún

| YAML | Módulo | Observaciones |
|------|--------|---------------|
| `sale-reseller.yaml` | Sale / Reseller | YAML existe, pendiente de procesar |
| `sale-reseller-seller.yaml` | Sale Reseller Seller | Idem |
| `sale-reseller-seller-customer.yaml` | Sale Reseller Customer | Idem |
| `sale-reseller-logo.yaml` | Sale Reseller Logo | Idem |
| `customer-session.yaml` | Customer Session | Idem |
| `show-related.yaml` | Show Related | Idem |
| `show-image.yaml` | Show Image | Idem |
| `media-chunk-upload.yaml` | Media Chunk Upload | Idem |

### 🟡 Módulos en `inventary-endpoints.md` Sin YAML

Estos endpoints están listados en el inventario pero no tienen archivo YAML en el directorio Swagger:

| Endpoint | Categoría |
|----------|-----------|
| `/api/analytics` | Analíticas |
| `/api/audit` | Auditoría |
| `/api/webhooks` | Webhooks |
| `/api/admin` | Administración |
| `/api/integrators` | Integraciones |
| `/api/share` | Compartir |
| `/api/encoder` | Encoders |
| `/api/editor` | Editor |
| `/api/transcode` | Transcodificación |
| `/api/live-editor` | Live Editor |
| `/api/dvr` | DVR |
| `/api/playout` | Playout |
| `/api/token` | Tokens |
| `/api/payment` / `/api/purchase` | Pagos |
| `/api/metadata` | Metadatos |
| `/api/user` | Usuarios internos |
| `/api/device` | Dispositivos |

---

## Cobertura de Tests vs Documentación

| Módulo de Tests | Endpoint | Tiene Referencia |
|----------------|----------|-----------------|
| `tests/media/` | `/api/media` | ✅ `media.md` + `media-id.md` |
| `tests/live/` | `/api/live-stream` | ✅ `live-stream.md` + `live-stream-id.md` |
| `tests/ad/` | `/api/ad` | ✅ `ads.md` ← nuevo |
| `tests/article/` | `/api/article` | ✅ `article.md` ← nuevo |
| `tests/category/` | `/api/category` | ✅ `category.md` |
| `tests/playlist/` | `/api/playlist` | ✅ `playlist.md` ← nuevo |
| `tests/show/` | `/api/show` | ✅ `show.md` + `show-id.md` |
| `tests/cupones/` | `/api/coupon` | ✅ `coupon.md` |
| `tests/access_restriction/` | `/api/settings/advanced-access-restrictions` | ✅ `access-restrictions.md` ← nuevo |
| `tests/embed/` | embed URLs | Cubierto por skill `mediastream-embed` |

**Cobertura total de módulos con tests activos: 100%**

---

## Recomendaciones para Fase 2

1. **Prioridad alta**: Documentar `sale-reseller.yaml` — módulo de ventas/distribución importante para escenarios de monetización.
2. **Prioridad media**: Procesar `customer-session.yaml` — relevante para tests de autenticación de clientes.
3. **Verificar** el comportamiento real del endpoint `GET /api/settings/advanced-access-restrictions/{id}` (ambigüedad path vs query param).
4. **Agregar tests** para los módulos: `article`, `ads`, `access-restrictions` usando las referencias generadas.
5. **Revisar** si el módulo Machine Learning necesita tests (requiere que el módulo esté habilitado en el entorno).

# Referencia de Endpoint: Media (Colección)

**Base path:** `/api/media`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST/DELETE

---

## Modelo de Datos (Media)

```ts
Media {
  // Identidad
  _id:                    string       // ObjectID (24 chars) — solo lectura
  uuid:                   string       // UUID v4 — solo lectura
  slug:                   string       // URL-friendly, auto-generado desde title
  _title:                 string       // title en minúsculas — solo lectura
  title:                  string       // Título del media (requerido al crear)
  description:            string       // Descripción opcional
  type:                   "video"|"audio"  // Auto-detectado por extensión o field type

  // Estado y publicación
  status:                 "OK"|"TRASH"
  is_published:           boolean      // Visible públicamente
  is_pre_published:       boolean      // Pre-publicado (acceso con token)
  is_initialized:         boolean      // Tiene archivo de video cargado
  is_auto_publish:        boolean      // Publicación automática al terminar transcoding
  media_ready_notified:   boolean      // Ya se notificó que está listo

  // Fechas
  date_created:           string       // ISO 8601
  date_updated:           string       // ISO 8601
  date_recorded:          string|null  // Fecha de grabación

  // Disponibilidad temporal
  available_from: {
    date:       string    // ISO 8601 — fecha/hora de inicio de disponibilidad
    short_date: string    // "YYYY-MM-DD"
    hour:       number
    offset:     number    // Timezone offset en horas
  } | null
  available_until: { /* misma estructura */ } | null

  // Ads
  no_ad:        boolean    // Deshabilita todos los ads
  no_logo:      boolean    // Oculta el logo del player
  ad_preroll:   boolean    // Tiene preroll
  ad_postroll:  boolean    // Tiene postroll
  ads:          string[]   // IDs de ads directos
  adswizz:      string[]   // IDs de ads AdsWizz
  referer_ad:   object[]   // Ads por referer
  inherited_ads:     object[]  // Ads heredados de categorías
  inherited_adswizz: object[]  // AdsWizz heredados de categorías

  // Restricciones de acceso
  access_rules: {
    geo: {
      enabled:   boolean
      allow:     boolean  // true=whitelist, false=blacklist
      countries: string[] // Códigos ISO 3166-1 alpha-2
    }
    cellular:  { enabled: boolean, allow: boolean }
    referer:   { enabled: boolean, allow: boolean, referers: string[] }
    ip:        { enabled: boolean, allow: boolean, ips: string[] }
    devices: {
      deny_mobile:  boolean
      deny_tv:      boolean
      deny_desktop: boolean
    }
    drm: {
      enabled:                   boolean
      allow:                     boolean
      allow_incompatible_devices: boolean
    }
    closed_access: { enabled: boolean, allow: boolean }
  }
  access_restrictions: {
    enabled: boolean
    rule:    string|null  // ID de regla de acceso avanzada
  }

  // Contenido relacionado
  categories:    object[]  // Categorías populadas (name, image_url, custom)
  tags:          string[]
  meta:          object[]  // Versiones transcodificadas (MediaMeta)
  thumbnails:    object[]  // Miniaturas (Thumbnail)
  tracks:        object[]  // Chapter tracks (Track)
  subtitle:      object[]  // Subtítulos (Subtitle)
  playlist:      string[]  // Playlists que contienen este media

  // Protocolos y URLs
  protocols: {
    hls: string    // URL del playlist .m3u8
  }
  url:                  string|null    // URL directa de archivo (external CDN)
  third_party_cdn_url:  string|null    // CDN externo
  preview: {
    mp4:  string    // URL de preview MP4
    webm: string    // URL de preview WebM
  }

  // Info de Show/Serie
  show_info: {
    showId:    string|null
    seasonId:  string|null
    episodeId: string|null
    type:      string|null
  }

  // Companion Media
  companion_media: {
    is_enabled: boolean
    media:      string[]  // Máximo 1 media ID
  }

  // Otros
  duration:     number    // Segundos
  views:        number    // Total views
  custom:       object    // Datos arbitrarios
  google_dai:   string|null
  iab_categories: string[]
  genre:        string|null
  account:      string|object   // ID o objeto populado
}
```

---

## Endpoints de Colección

### 1. Listar Medias (Search básico)

```
GET /api/media/search
```

Búsqueda simple filtrada por cuenta. Solo retorna medias **publicadas y disponibles** (a menos que se use `all=true`).

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `title` | `string` | — | Filtro regex sobre `title` y `description` (case-insensitive) |
| `description` | `string` | — | Filtro regex solo sobre `description` |
| `tags` | `string \| string[]` | — | Filtro por tags. Array o string separado por espacios. |
| `category` | `string \| string[]` | — | Filtra por ID de categoría (puede ser múltiple) |
| `with_sub_categories` | `"true"` | — | Si `true`, incluye medias de sub-categorías cuando se filtra por `category` |
| `operator` | `"or" \| "and"` | `"and"` | Operador lógico entre filtros `title` y `description` |
| `all` | `"true"` | — | Si `true`, incluye medias en `TRASH` y sin filtro de fecha/publicación |
| `page` | `number` | `1` | Página actual (paginación) |
| `limit` | `number` | `10` | Resultados por página |
| `count` | `"true"` | — | Si `true`, retorna solo el total de resultados (number) |
| `lean` | `"true"` | — | Si `true`, excluye algunos campos populados (respuesta más liviana) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [ /* array de objetos Media */ ],
  "matches": 42
}
```

Con `count=true`:
```json
{ "status": "OK", "data": 42, "matches": 42 }
```

---

### 2. Búsqueda Avanzada (Full-Text + Atlas Search)

```
GET /api/media
```

Búsqueda full-text con soporte de **Atlas Search** (fuzzy, phrase, relevance score). Fallback automático a búsqueda regex si Atlas Search no retorna resultados.

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `title` | `string` | — | Texto a buscar en `title`, `_title`, `description`, `tags`. Si es un ObjectID válido, busca por `_id` directamente. |
| `status` | `"OK"\|"TRASH"` | `"OK"` | Estado del media |
| `skip` | `number` | `0` | Registros a omitir (offset) — máx efectivo junto con `limit` |
| `limit` | `number` | `10` | Resultados por página — **máximo 100** |
| `count` | `"true"` | — | Solo retorna el total (number) |
| `include_images` | `"true"` | — | Incluye también AI Images en los resultados |
| `admin` | `"true"` | — | Activa búsqueda en modo administrador (sin filtros de usuario) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5ee18728ccc0ce5debbebf36",
      "title": "Mi video",
      "description": "...",
      "type": "video",
      "duration": 120,
      "views": 0,
      "is_published": true,
      "date_created": "2020-06-11T01:21:44.913Z",
      "meta": [ { "_id": "...", "label": "720p", "status": "OK", "is_original": false } ],
      "thumbnails": [ { "_id": "...", "url": "https://...", "is_default": true } ],
      "thumbDefault": "https://platform.mediastre.am/thumbs/...",
      "preview": { "mp4": "...", "webm": "..." },
      "score": 5.2
    }
  ]
}
```

> El campo `score` indica relevancia (mayor = más relevante). Solo presente en resultados de Atlas Search.

---

### 3. Crear Media

```
POST /api/media
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Workflow:** Al crear, el servidor genera automáticamente los `MediaMeta` para todas las resoluciones configuradas en la cuenta y lanza el proceso de transcoding.

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | `string` | No* | Título. Si se omite, se usa el `_id` como título. Extensión de archivo en el título determina el `type` automáticamente. |
| `description` | `string` | No | Descripción del media |
| `type` | `"video"\|"audio"` | No | Fuerza el tipo. Sin este campo, se auto-detecta por extensión del `title`. |
| `is_published` | `boolean` | No | Publicar inmediatamente (default: `false`) |
| `is_pre_published` | `boolean` | No | Pre-publicar (default: `false`) |
| `categories` | `string \| string[]` | No | IDs de categorías. Pasar `"null"` para limpiar. |
| `tags` | `string \| string[]` | No | Tags. Pasar `"null"` para limpiar. |
| `no_ad` | `boolean` | No | Deshabilitar todos los ads |
| `no_logo` | `boolean` | No | Ocultar logo del player |
| `ad_preroll` | `boolean` | No | Habilitar preroll (campo: `adPreroll`) |
| `ad_postroll` | `boolean` | No | Habilitar postroll (campo: `adPostroll`) |
| `custom` | `object` | No | Datos personalizados arbitrarios |
| `date_recorded` | `string` | No | Fecha de grabación (ISO 8601). Pasar `"null"` para limpiar. |
| `duration` | `number` | No | Duración en segundos (útil para third-party CDN) |
| `url` | `string` | No | URL directa del archivo |
| `third_party_cdn_url` | `string` | No | URL de CDN externo (requiere módulo habilitado) |
| `original` | `string` | No | Resolución del archivo original, ej: `"720p"`, `"128kbps"`. Permite optimizar el proceso de transcoding. |
| `show_info` | `object` | No | Asociación a Show/Serie: `{ showId, seasonId, episodeId, type }` |
| `companion_media_enabled` | `boolean` | No | Habilitar Companion Media |
| `companion_media` | `string[]` | No | IDs de medias companion (máx 1). Enviar `[]` o `"null"` para limpiar. |
| `available_from` | `"true"` | No | Activar fecha de inicio de disponibilidad |
| `available_from_date` | `string` | No | Fecha inicio `"YYYY-MM-DD"` (requiere `available_from=true`) |
| `available_from_hour` | `number` | No | Hora de inicio (0-23) |
| `available_from_offset` | `number` | No | Timezone offset en horas |
| `available_until` | `"true"` | No | Activar fecha de fin de disponibilidad |
| `available_until_date` | `string` | No | Fecha fin `"YYYY-MM-DD"` |
| `available_until_hour` | `number` | No | Hora de fin (0-23) |
| `available_until_offset` | `number` | No | Timezone offset en horas |
| `geo_restriction` | `"allow"\|"deny"` | No | Geofencing: `"allow"` = whitelist, `"deny"` = blacklist |
| `geo_restriction_countries` | `string[]` | No | Códigos ISO 3166-1 alpha-2 para geofencing |
| `cellular_restriction` | `"allow"\|"deny"` | No | Restricción por red celular |
| `referer_restriction` | `"allow"\|"deny"` | No | Restricción por referer HTTP |
| `referer_restriction_list` | `string[]` | No | Lista de referers para la restricción |
| `ip_restriction` | `"allow"\|"deny"` | No | Restricción por IP |
| `ip_restriction_list` | `string[]` | No | Lista de IPs/CIDRs |
| `device_restriction_deny_mobile` | `boolean` | No | Bloquear dispositivos móviles |
| `device_restriction_deny_tv` | `boolean` | No | Bloquear Smart TVs |
| `drm_restriction` | `"all"\|"compatible"\|"deny"` | No | Configuración DRM |
| `closed_access_restriction` | `"allow"\|"deny"` | No | Acceso cerrado (paywall) |
| `access_restrictions_enabled` | `boolean` | No | Habilitar reglas de acceso avanzadas |
| `access_restrictions` | `string\|"null"` | No | ID de regla de acceso avanzada |

**Ejemplo:**

```json
{
  "title": "Mi video tutorial",
  "description": "Descripción del video",
  "is_published": true,
  "categories": ["5ee8fc94596117644ece0f00"],
  "tags": ["tutorial", "tech"],
  "geo_restriction": "allow",
  "geo_restriction_countries": ["CL", "AR", "PE"]
}
```

**Respuesta exitosa `200`:** Objeto `Media` completo con todos los `meta` generados.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_GEORESTRICTION"` | `geo_restriction` sin países o configuración inválida |
| `400` | `"COMPANION_MEDIA_CANNOT_BE_THE_SAME_AS_THE_CURRENT_MEDIA"` | companion media apunta a sí mismo |
| `404` | `"SHOW_NOT_FOUND"` / `"SEASON_NOT_FOUND"` / `"EPISODE_NOT_FOUND"` | show_info con ID inválido |
| `404` | `"ACCOUNT_NOT_FOUND"` | Cuenta no encontrada |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 4. Contar Medias

```
GET /api/media/count
```

Retorna el total de medias de la cuenta.

**Respuesta exitosa `200`:**

```json
{ "status": "OK", "data": 1542 }
```

---

## Resumen de Endpoints de Colección

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/media` | Búsqueda full-text (Atlas Search) | read |
| `GET` | `/api/media/search` | Búsqueda simple con filtros | read |
| `GET` | `/api/media/count` | Total de medias de la cuenta | read |
| `POST` | `/api/media` | Crear nuevo media | read+write |

---

## Notas de Paginación

**`/api/media/search`** usa paginación por `page` + `limit`:
```
page=1, limit=10  →  primeros 10 resultados
page=2, limit=10  →  resultados 11-20
```

**`/api/media`** (Atlas Search) usa `skip` + `limit`:
```
skip=0,  limit=10  →  primeros 10
skip=10, limit=10  →  siguientes 10
```
Máximo de `limit`: **100 resultados**.

# Referencia de Endpoint: Live Stream (Colección)

**Base path:** `/api/live-stream`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST/DELETE

---

## Modelo de Datos (LiveStream / Event)

```ts
LiveStream {
  // Identidad
  _id:              string        // ObjectID (24 chars) — solo lectura
  name:             string        // Nombre del live stream (requerido)
  slug:             string        // URL-friendly — solo lectura
  stream_id:        string        // ID de stream para el CDN — solo lectura
  publishing_token: string        // Token de publicación RTMP — solo lectura
  type:             "video"|"audio"  // Tipo de stream (default: "video")

  // Estado
  online:           boolean       // Si el stream está en vivo ahora
  bookmark:         boolean       // Marcado como favorito
  dvr:              boolean       // DVR habilitado

  // Zonas y perfiles
  cdn_zones:        string[]      // Zonas CDN activas, ej: ["us", "cl"]
  _encoding_profiles: EncodingProfile[]  // Perfiles de codificación habilitados

  // Protocolos
  preferred_protocol: "hls"|"rtmp"|"rtmpt"|"hds"  // Protocolo preferido
  entry_points: {                 // Puntos de publicación (solo en detail)
    rtmp?: string
    rtmps?: string
    srt?: string
  }

  // Ads
  ad:               string|null   // ID de configuración de ads
  ad_text:          string|null
  ad_insertion:     string|null   // URL VAST para ad insertion
  referer_ad:       object[]

  // Restricciones de acceso
  access_rules: {
    geo: { enabled: boolean, allow: boolean, countries: string[] }
    cellular: { enabled: boolean, allow: boolean, use_client_side: boolean }
    referer: { enabled: boolean, allow: boolean, referers: string[] }
    ip: { enabled: boolean, allow: boolean, ips: string[] }
    asn: { enabled: boolean, allow: boolean, asns: string[] }
    devices: { deny_mobile: boolean, deny_tv: boolean, deny_desktop: boolean, use_client_side: boolean }
    concurrency: { enabled: boolean, limit: number|null }
  }
  access_restrictions: { enabled: boolean, rule: string|null }
  closed_access:    boolean       // Acceso cerrado (paywall)

  // Límite de tiempo de visualización
  viewing_time_limit: {
    enabled:    boolean
    seconds:    number
    user_time:  number
    user_unit:  "seconds"|"minutes"|"hours"
  }

  // Cloud Transcoding (MediaLive)
  medialive: {
    enabled:    boolean
    jobEnabled: boolean
    profile:    string    // "HD 1080p", "HD 720p", "SD", etc.
    channel: {
      id:     string
      state:  "IDLE"|"START"
      inputs: { _id, id, endpoint, streamKey, type }[]
    }
  }

  // Logo
  logo: {
    live: { enabled: boolean, url: string, position: string }
  }

  // Mobile
  mobile: { enabled: boolean, url: string }

  // Grabación
  recording:            boolean
  recording_start_date: string|null

  // Playout
  playout: { enabled: boolean, playout: string|null }

  // Zoom Webinar
  zoom: { streaming: boolean }

  // Metadata (Icecast/Now Playing)
  metadata: { enabled: boolean, icecast_mask: string|null }
  nowplaying: boolean

  // Live Transcription (AI)
  liveTranscription: { enabled: boolean, language: string }

  // CDN DVR
  cdn: {
    dvr_retention_time:         number
    dvr_time:                   number
    dvr_retention_time_account: number
    dvr_time_account:           number
  }

  // Otros
  custom:          object         // Datos personalizados arbitrarios
  thumbnails:      object[]       // Miniaturas
  player_skin:     string         // Skin del player (default: "default")
  player:          string|null    // ID del player configurado
  priority:        number
  views:           number
  date_created:    string         // ISO 8601
  account:         string|object
}

EncodingProfile {
  enabled:    boolean
  label:      string      // "1080p", "720p", "480p", "360p", "240p", "144p"
  video: { bitrate: number, codec: string }
  audio: { bitrate: number, codec: string }
  resolution: { width: number, height: number }
  recording:  boolean
}
```

---

## Endpoints de Colección

### 1. Listar Live Streams

```
GET /api/live-stream
```

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `query` | `string` | — | Filtro por nombre (regex, case-insensitive) |
| `id` | `string` | — | Filtrar por ID específico de un live stream |
| `online` | `"true"\|"false"` | — | Filtrar por estado online/offline |
| `mobile` | `"true"\|"false"` | — | Filtrar si tiene móvil habilitado |
| `monitor` | `"true"\|"false"` | — | `"true"` = solo con monitor ONLINE, `"false"` = solo OFFLINE/sin monitor |
| `bookmark` | `"true"\|"false"` | — | Filtrar por bookmark |
| `type` | `"video"\|"audio"` | — | Filtrar por tipo de stream |
| `account` | `string` | — | Filtrar por cuenta (solo admins de plataforma) |
| `sort` | `string` | `"-bookmark -date_created"` | Campo de ordenamiento. Prefijo `-` = descendente. Ej: `"-date_created"`, `"name"` |
| `limit` | `number` | sin límite | Máximo de resultados |
| `skip` | `number` | `0` | Registros a omitir (offset) |
| `count` | `"true"` | — | Si `true`, retorna solo el total (number) |

**Nota de permisos:** Si el usuario solo tiene acceso a `live_audio` o `live` (no ambos), el filtro por `type` se aplica automáticamente.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5eed13896e391357faf52e08",
      "name": "Mi Live Stream",
      "online": false,
      "type": "video",
      "dvr": false,
      "cdn_zones": ["us"],
      "stream_id": "1bed80e86dc61a0b663d664e623e8994",
      "publishing_token": "6fc2c0da3e487e41a15b3d2974cdfaa0",
      "preferred_protocol": "hls",
      "date_created": "2020-06-19T12:00:00.000Z"
    }
  ]
}
```

Con `count=true`:
```json
{ "status": "OK", "data": 12 }
```

**Ejemplos:**

```bash
# Todos los live streams
GET /api/live-stream

# Solo los que están online
GET /api/live-stream?online=true

# Buscar por nombre
GET /api/live-stream?query=noticias

# Con paginación
GET /api/live-stream?limit=10&skip=0&sort=-date_created

# Solo audio streams
GET /api/live-stream?type=audio

# Contar total
GET /api/live-stream?count=true
```

---

### 2. Crear Live Stream

```
POST /api/live-stream
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre del live stream |
| `cdn_zones` | `string[]` | **Sí** | Zonas CDN. Valores posibles: `"us"`, `"cl"`. Ej: `["us"]` |
| `encodingProfiles` | `object[]` | **Sí*** | Perfiles de codificación (ver estructura abajo). *Alternativa: usar `profile` con Cloud Transcoding. |
| `type` | `"video"\|"audio"` | No | Tipo de stream (default: `"video"`) |
| `online` | `boolean` | No | Iniciar online (default: `false`) |
| `preferred_protocol` | `"hls"\|"rtmp"\|"rtmpt"\|"hds"` | No | Protocolo preferido (default: `"hls"`) |
| `dvr` | `boolean` | No | Habilitar DVR |
| `closed_access` | `boolean` | No | Habilitar acceso cerrado (paywall) |
| `player_skin` | `string` | No | Skin del player (default: `"default"`) |
| `player` | `string` | No | ID del player configurado |
| `ad` | `string` | No | ID de configuración de ads |
| `ad_insertion` | `string` | No | URL VAST para ad insertion |
| `custom` | `object` | No | Datos personalizados arbitrarios |
| `nowplaying` | `boolean` | No | Habilitar Now Playing |
| `geo_restriction` | `"allow"\|"deny"` | No | Restricción geográfica |
| `geo_restriction_countries` | `string[]` | No | Países ISO 3166-1 alpha-2 |
| `cellular_restriction` | `"allow"\|"deny"` | No | Restricción por red celular |
| `cellular_restriction_use_client_side` | `boolean` | No | Detectar celular en el cliente |
| `referer_restriction` | `"allow"\|"deny"` | No | Restricción por HTTP referer |
| `referer_restriction_list` | `string[]` | No | Lista de referers |
| `ip_restriction` | `"allow"\|"deny"` | No | Restricción por IP/CIDR |
| `ip_restriction_list` | `string[]` | No | Lista de IPs/CIDRs |
| `asn_restriction` | `"allow"\|"deny"` | No | Restricción por ASN |
| `asn_restriction_list` | `string[]` | No | Lista de ASNs |
| `device_restriction_deny_mobile` | `boolean` | No | Bloquear móviles |
| `device_restriction_deny_tv` | `boolean` | No | Bloquear Smart TVs |
| `device_restriction_use_client_side` | `boolean` | No | Detectar dispositivo en el cliente |
| `concurrency_limit_enable` | `boolean` | No | Habilitar límite de concurrencia |
| `concurrency_limit` | `number\|"null"` | No | Máximo de viewers simultáneos |
| `time_limit_enabled` | `"true"` | No | Habilitar límite de tiempo por usuario |
| `time_limit` | `number` | No | Valor del límite de tiempo |
| `time_limit_unit` | `"seconds"\|"minutes"\|"hours"` | No | Unidad del límite de tiempo (default: `"seconds"`) |
| `access_restrictions_enabled` | `boolean` | No | Habilitar reglas de acceso avanzadas |
| `access_restrictions` | `string\|"null"` | No | ID de regla de acceso avanzada |
| `rendition_rules` | `string\|"null"` | No | ID de reglas de rendition |
| `playout` | `object` | No | `{ enabled: boolean, id: string }` — Habilitar playout |
| `metadata` | `object` | No | `{ enabled: boolean, icecast_mask: string }` — Habilitar metadata Icecast |
| `liveTranscription` | `object` | No | `{ enabled: boolean, language: string }` — Live transcripción AI (requiere módulo) |
| `epg_mask` | `string\|"null"` | No | ID de máscara EPG |
| `gracenote_live_id` | `string` | No | ID Gracenote (requiere módulo Gracenote) |
| `gracenote_record_all` | `boolean` | No | Grabar todo con Gracenote |
| `logo_live_position` | `string` | No | Posición del logo: `"top-right"`, `"top-left"`, `"bottom-right"`, `"bottom-left"` |
| `logo_live_url` | `string` | No | URL del logo |
| `external_cdn_enabled` | `"true"\|"false"` | No | Habilitar CDN externo |
| `external_cdn_edge_url` | `string` | No | URL del edge CDN externo |
| `external_cdn_dash_enabled` | `"true"\|"false"` | No | Habilitar DASH en CDN externo |
| `external_cdn_dash_edge_url` | `string` | No | URL DASH del CDN externo |

**Estructura de `encodingProfiles`:**

```json
[
  {
    "enabled": true,
    "profile": "720p",
    "video_bitrate": 1500000,
    "audio_bitrate": 96000,
    "audio_codec": "mp4a.40.2",
    "video_codec": "avc1.42001f",
    "resolution": { "width": 1280, "height": 720 }
  },
  {
    "enabled": true,
    "profile": "480p",
    "video_bitrate": 800000,
    "audio_bitrate": 96000,
    "audio_codec": "mp4a.40.2",
    "video_codec": "avc1.42001f",
    "resolution": { "width": 854, "height": 480 }
  }
]
```

Perfiles válidos: `"1080p"`, `"720p"`, `"480p"`, `"360p"`, `"240p"`, `"144p"`

**Respuesta exitosa `200`:** Objeto `LiveStream` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_GEORESTRICTION"` | Geofencing mal configurado |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

## Resumen de Endpoints de Colección

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/live-stream` | Listar/buscar live streams | read |
| `POST` | `/api/live-stream` | Crear live stream | read+write |

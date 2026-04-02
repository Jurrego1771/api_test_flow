# Referencia de Endpoint: Live Stream (Recurso Individual)

**Base path:** `/api/live-stream/{live_stream_id}`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST/DELETE

> `{live_stream_id}` es siempre un ObjectID MongoDB de 24 caracteres.

---

## Endpoints del Recurso

### 1. Obtener Live Stream por ID

```
GET /api/live-stream/{live_stream_id}
```

Retorna el objeto LiveStream completo con todos sus sub-recursos populados incluyendo `entry_points` (puntos de publicación RTMP/RTMPS/SRT).

**Respuesta exitosa `200`:** Objeto `LiveStream` completo con:
- `entry_points` — URLs de publicación para el encoder
- `_encoding_profiles` — perfiles de codificación activos
- `medialive.channel` — configuración de Cloud Transcoding (sin `sourceArn` ni `sourceUrl` por seguridad)
- `recording_errors[]` — errores de configuración que impiden grabar: `"ERROR_ONLINE"`, `"ERROR_ZONE"`, `"ERROR_ENCODING"`
- `cdn.dvr_retention_time_account` / `cdn.dvr_time_account` — valores DVR de la cuenta

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `403` | `"FORBIDDEN"` | Live Editor sin acceso al tipo de stream |
| `404` | `"NOT_FOUND"` | Live stream no existe |

---

### 2. Actualizar Live Stream

```
POST /api/live-stream/{live_stream_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismos campos que Crear. Todos opcionales. Retorna el objeto `LiveStream` actualizado.

---

### 3. Eliminar Live Stream

```
DELETE /api/live-stream/{live_stream_id}
```

Elimina permanentemente el live stream y limpia los recursos asociados en el CDN.

**Respuesta exitosa `200`:** `{ "status": "OK", "data": null }`

---

### 4. Toggle Online / Offline

```
POST /api/live-stream/{live_stream_id}/toggle-online
```

Cambia el estado online/offline del live stream.

**Respuesta exitosa `200`:**

```json
{ "status": "OK", "data": "ONLINE" }   // o "OFFLINE"
```

**Errores comunes:**

| `data` | Causa |
|--------|-------|
| `"NO_AVAILABLE_CDN_ZONE"` | No hay zonas CDN disponibles |
| `"NO_AVAILABLE_PROFILES"` | Sin perfiles de codificación activos |

---

### 5. Toggle Bookmark

```
POST /api/live-stream/{live_stream_id}/toggle-bookmark
```

Alterna el marcado como favorito del live stream.

**Respuesta `200`:** `{ "status": "OK", "data": null }`

---

## Sub-recursos de Live Stream

### Thumbnails (Miniaturas)

#### Listar Thumbnails

```
GET /api/live-stream/{live_stream_id}/thumb
```

**Respuesta `200`:** `{ "status": "OK", "data": { "thumbnails": [...] } }`

#### Subir Thumbnail

```
POST /api/live-stream/{live_stream_id}/thumb
Content-Type: multipart/form-data
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | `binary` | Sí | Archivo de imagen |
| `fileName` | `string` | No | Nombre del archivo |
| `width` | `number` | No | Ancho de la imagen |
| `height` | `number` | No | Alto de la imagen |
| `fileSize` | `number` | No | Tamaño en bytes |

#### Actualizar Thumbnail

```
POST /api/live-stream/{live_stream_id}/thumb/{thumb_id}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `isDefault` | `boolean` | Marcar como thumbnail por defecto |

#### Eliminar Thumbnail

```
DELETE /api/live-stream/{live_stream_id}/thumb/{thumb_id}
```

---

### Schedule Jobs (EPG / Programación)

Los Schedule Jobs definen la programación del live stream (bloques horarios). Pueden ser **one-time** o **recurrentes**.

#### Listar Schedule Jobs

```
GET /api/live-stream/{live_stream_id}/schedule-job
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | `number` | Máximo de resultados |
| `skip` | `number` | Offset |
| `is_auto_publish` | `boolean` | Filtrar por auto-publicación |
| `for_recording` | `boolean` | Filtrar por grabación |
| `is_featured` | `boolean` | Filtrar por destacados |
| `is_blackout` | `boolean` | Filtrar por blackouts |

#### Crear Schedule Job

```
POST /api/live-stream/{live_stream_id}/schedule-job
Content-Type: application/json  |  application/x-www-form-urlencoded
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre del schedule |
| `type` | `"onetime"\|"recurrent"` | **Sí** | Tipo de schedule |
| `date_start` | `string` | **Sí** | Fecha de inicio `"YYYY-MM-DD"` |
| `date_end` | `string` | **Sí** | Fecha de fin `"YYYY-MM-DD"` |
| `date_start_hour` | `number` | **Sí** | Hora de inicio (0-23) |
| `date_start_minute` | `number` | **Sí** | Minuto de inicio (0-59) |
| `date_end_hour` | `number` | **Sí** | Hora de fin (0-23) |
| `date_end_minute` | `number` | **Sí** | Minuto de fin (0-59) |
| `tz_offset` | `number` | No | Offset UTC en horas (default: `0`) |
| `code` | `string` | No | Código identificador para scripting |
| `for_recording` | `boolean` | No | Crear media al terminar el schedule |
| `is_auto_publish` | `boolean` | No | Publicar media automáticamente al terminar |
| `is_featured` | `boolean` | No | Marcar como destacado |
| `is_blackout` | `boolean` | No | Blackout: kickear a todos los viewers |
| `not_sellable` | `boolean` | No | No comercializable |
| `inherit_geo_restrictions` | `boolean` | No | El media grabado hereda las restricciones geo del live stream |
| `categories` | `string[]` | No | Categorías a asignar al media grabado |
| `geo_restriction` | `"allow"\|"deny"\|"disable"` | No | Restricción geográfica durante el schedule |
| `geo_restriction_countries` | `string[]` | No | Países afectados |
| `next_event_id` | `string` | No | ID del siguiente evento en cadena |
| `recurrency` | `object` | **Sí si `type=recurrent"`** | Configuración de recurrencia (ver abajo) |

**Estructura de `recurrency` (solo para `type=recurrent`):**

```json
{
  "days": ["monday", "wednesday", "friday"],
  "start_hour": 20,
  "start_minute": 0,
  "duration_hours": 2
}
```

Valores válidos para `days`: `"monday"`, `"tuesday"`, `"wednesday"`, `"thursday"`, `"friday"`, `"saturday"`, `"sunday"`

**Ejemplo completo one-time:**

```json
{
  "name": "Noticiero Central",
  "type": "onetime",
  "date_start": "2024-09-29",
  "date_end": "2024-09-29",
  "date_start_hour": 20,
  "date_start_minute": 0,
  "date_end_hour": 21,
  "date_end_minute": 0,
  "tz_offset": -3,
  "for_recording": true,
  "is_auto_publish": true,
  "categories": ["5ee8fc94596117644ece0f00"]
}
```

#### Obtener Schedule Job

```
GET /api/live-stream/{live_stream_id}/schedule-job/{schedule_job_id}
```

#### Actualizar Schedule Job

```
POST /api/live-stream/{live_stream_id}/schedule-job/{schedule_job_id}
```

Mismos campos que crear. Todos opcionales.

#### Eliminar Schedule Job

```
DELETE /api/live-stream/{live_stream_id}/schedule-job/{schedule_job_id}
```

---

### Schedule (Vista de Calendario)

Vista de schedules en rango de fechas (solo lectura, usada para EPG/calendario).

#### Listar Schedules en Rango

```
GET /api/live-stream/{live_stream_id}/schedule
```

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `date_start` | `string` | Fecha inicio del rango `"YYYY-MM-DD"` |
| `date_end` | `string` | Fecha fin del rango `"YYYY-MM-DD"` |

#### Obtener Schedule por ID

```
GET /api/live-stream/{live_stream_id}/schedule/{schedule_id}
```

---

### Recordings (Grabaciones)

Las grabaciones son las instancias de grabación asociadas a un live stream (distintas de los schedule jobs).

#### Listar Recordings

```
GET /api/live-stream/{live_stream_id}/recording
```

#### Crear Recording (iniciar grabación manual)

```
POST /api/live-stream/{live_stream_id}/recording
Content-Type: application/json
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `start` | `string` | No | Fecha/hora de inicio ISO 8601 (default: ahora) |

**Respuesta `200`:** Objeto `EventRecording` con `_id`, `event`, `account`, `date_start`, `recording: true`.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"EVENT_NOT_FOUND"` | Live stream no existe |
| `500` | `"DB_ERROR"` | Error de base de datos |

#### Actualizar Recording

```
POST /api/live-stream/{live_stream_id}/recording/{recording_id}
```

#### Eliminar Recording

```
DELETE /api/live-stream/{live_stream_id}/recording/{recording_id}
```

---

### Record (Control de Grabación Rápida)

Acceso rápido para iniciar/detener la grabación del stream activo.

#### Iniciar Grabación

```
POST /api/live-stream/{live_stream_id}/start-record
```

#### Detener Grabación

```
POST /api/live-stream/{live_stream_id}/stop-record
```

**Respuesta `200`:** `{ "status": "OK", "data": "STARTED" }` o `{ "status": "OK", "data": "STOPPED" }`

---

### Restreaming (Multi-destino)

Retransmisión del stream a plataformas externas (YouTube, Facebook, Twitch, etc.). Requiere módulo `live_restreaming` habilitado.

#### Listar Restreams

```
GET /api/live-stream/{live_stream_id}/restream
```

#### Crear Restream

```
POST /api/live-stream/{live_stream_id}/restream
Content-Type: application/json
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre identificador del restream |
| `type` | `string` | **Sí** | Tipo de destino: `"rtmp"`, `"youtube"`, `"facebook"`, `"twitch"`, etc. |
| `publishing_point` | `string` | **Sí** | URL RTMP del destino |
| `stream_id` | `string` | **Sí** | Stream key del destino |
| `social_id` | `string` | No | ID de la red social asociada |
| `social_type` | `string` | No | Tipo de red social |
| `title` | `string` | No | Título del stream en el destino |
| `description` | `string` | No | Descripción del stream en el destino |
| `stream_profile` | `string` | No | Perfil de calidad (default: `"default"`) |

> **Límite:** El número máximo de restreams simultáneos está definido en `account.ops.live_restreaming.max_count`.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"LIMIT_REACHED"` | Límite de restreams alcanzado |
| `400` | `"VALIDATION_ERROR"` | Campos requeridos faltantes |
| `500` | `"DB_ERROR"` | Error de base de datos |

#### Obtener Restream

```
GET /api/live-stream/{live_stream_id}/restream/{restream_id}
```

#### Actualizar Restream

```
POST /api/live-stream/{live_stream_id}/restream/{restream_id}
```

#### Eliminar Restream

```
DELETE /api/live-stream/{live_stream_id}/restream/{restream_id}
```

#### Iniciar Restream

```
POST /api/live-stream/{live_stream_id}/restream/{restream_id}/start
```

#### Detener Restream

```
POST /api/live-stream/{live_stream_id}/restream/{restream_id}/stop
```

---

### Ad Insertion (Inserción de Publicidad)

Inserta un corte publicitario SCTE-35 en el stream en vivo.

#### Crear Ad Insertion

```
POST /api/live-stream/{live_stream_id}/ad-insertion
Content-Type: application/json
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `duration` | `number` | **Sí** | Duración del corte en **milisegundos** |
| `date` | `string` | No | Fecha/hora de inicio. Sin valor = inmediatamente |
| `dynamic` | `boolean` | No | Si es inserción dinámica |

**Respuesta `200`:** `{ "status": "OK", "data": null }`

---

### Ad Breaks

Puntos de corte publicitario predefinidos en el stream.

#### Listar Ad Breaks

```
GET /api/live-stream/{live_stream_id}/ad-break
```

#### Crear Ad Break

```
POST /api/live-stream/{live_stream_id}/ad-break
```

#### Eliminar Ad Break

```
DELETE /api/live-stream/{live_stream_id}/ad-break/{ad_break_id}
```

---

### Logo

Gestión del logo superpuesto en el player del live stream.

#### Subir Logo

```
POST /api/live-stream/{live_stream_id}/logo
Content-Type: multipart/form-data
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `attach` | `binary` | **Sí** | Archivo de imagen del logo (PNG recomendado) |

#### Eliminar Logo

```
DELETE /api/live-stream/{live_stream_id}/logo
```

---

### Background (Fondo de Pantalla)

Imagen de fondo mostrada cuando el stream está offline.

#### Subir Background

```
POST /api/live-stream/{live_stream_id}/background
Content-Type: multipart/form-data
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `file` | `binary` | Archivo de imagen de fondo |

#### Eliminar Background

```
DELETE /api/live-stream/{live_stream_id}/background
```

---

### DRM (Digital Rights Management)

#### Obtener Token DRM

```
POST /api/live-stream/{live_stream_id}/drm/token
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `expireMinutes` | `number` | Minutos de validez del token |

**Respuesta `200`:** `{ "status": "OK", "data": "eyJhbGciOi..." }`

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `500` | `"DRM_NOT_CONFIGURED"` | Sin DRM configurado en la cuenta |
| `404` | `"NOT_FOUND"` | Live stream no existe |

---

### Metadata (Now Playing / Icecast)

Información del contenido actualmente en reproducción (para radio/audio).

#### Obtener Metadata Actual

```
GET /api/live-stream/{live_stream_id}/metadata
```

**Respuesta `200`:** Objeto con datos de la canción/contenido actual.

#### Crear/Actualizar Metadata

```
POST /api/live-stream/{live_stream_id}/metadata
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Título del contenido actual |
| `subtitle` | `string` | Subtítulo |
| `type` | `string` | Tipo: `"SONG"`, `"ADVERTISEMENT"`, etc. |
| `image` | `string` | URL de imagen de portada |
| `dateStart` | `string` | Inicio ISO 8601 |
| `dateEnd` | `string` | Fin ISO 8601 |
| `extradata` | `object` | Datos adicionales arbitrarios (ej: `{ "year": 2002 }`) |

---

### Quizzes

Encuestas/quizzes interactivos durante el live stream.

#### Listar Quizzes

```
GET /api/live-stream/{live_stream_id}/quizzes
```

#### Crear Quiz

```
POST /api/live-stream/{live_stream_id}/quizzes
```

#### Actualizar Quiz

```
POST /api/live-stream/{live_stream_id}/quizzes/{quiz_id}
```

#### Enviar Quiz (activar para audiencia)

```
POST /api/live-stream/{live_stream_id}/quizzes/{quiz_id}/send
```

#### Eliminar Quiz

```
DELETE /api/live-stream/{live_stream_id}/quizzes/{quiz_id}
```

---

### Transcripción Live (AI)

Subtitulado en tiempo real por IA durante la transmisión.

#### Obtener Estado de Transcripción

```
GET /api/live-stream/{live_stream_id}/transcription
```

#### Activar/Configurar Transcripción

```
POST /api/live-stream/{live_stream_id}/transcription
```

---

### Audio Exclusions

Exclusiones de audio por segmentos del stream.

#### Listar Exclusiones

```
GET /api/live-stream/{live_stream_id}/audio-exclusion
```

#### Obtener Exclusión

```
GET /api/live-stream/{live_stream_id}/audio-exclusion/{exclusion_id}
```

#### Crear Exclusión

```
POST /api/live-stream/{live_stream_id}/audio-exclusion
```

#### Actualizar Exclusión

```
POST /api/live-stream/{live_stream_id}/audio-exclusion/{exclusion_id}
```

#### Eliminar Exclusión

```
DELETE /api/live-stream/{live_stream_id}/audio-exclusion/{exclusion_id}
```

---

### EPG (Electronic Program Guide)

Sincronización y gestión de guía de programación electrónica.

#### Obtener EPG

```
GET /api/live-stream/{live_stream_id}/epg
```

#### Sincronizar EPG

```
POST /api/live-stream/{live_stream_id}/epg/sync
```

---

### Gracenote

Integración con metadatos Gracenote (requiere módulo habilitado).

#### Obtener Metadata Gracenote

```
GET /api/live-stream/{live_stream_id}/gracenote
```

---

### Moments (DEPRECATED)

> ⚠️ **Feature deprecada.** Retorna HTTP `410 Gone` con `data: "FEATURE_DEPRECATED"`.

---

## Resumen Completo de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/live-stream/{id}` | Obtener live stream | read |
| `POST` | `/api/live-stream/{id}` | Actualizar | read+write |
| `DELETE` | `/api/live-stream/{id}` | Eliminar | read+write |
| `POST` | `/api/live-stream/{id}/toggle-online` | Toggle online/offline | read+write |
| `POST` | `/api/live-stream/{id}/toggle-bookmark` | Toggle bookmark | read+write |
| **Thumbnails** | | | |
| `GET` | `/api/live-stream/{id}/thumb` | Listar | read |
| `POST` | `/api/live-stream/{id}/thumb` | Subir | read+write |
| `POST` | `/api/live-stream/{id}/thumb/{thumb_id}` | Actualizar | read+write |
| `DELETE` | `/api/live-stream/{id}/thumb/{thumb_id}` | Eliminar | read+write |
| **Schedule Jobs** | | | |
| `GET` | `/api/live-stream/{id}/schedule-job` | Listar | read |
| `GET` | `/api/live-stream/{id}/schedule-job/{sjid}` | Obtener | read |
| `POST` | `/api/live-stream/{id}/schedule-job` | Crear | read+write |
| `POST` | `/api/live-stream/{id}/schedule-job/{sjid}` | Actualizar | read+write |
| `DELETE` | `/api/live-stream/{id}/schedule-job/{sjid}` | Eliminar | read+write |
| **Schedule (EPG)** | | | |
| `GET` | `/api/live-stream/{id}/schedule` | Listar por rango | read |
| `GET` | `/api/live-stream/{id}/schedule/{sid}` | Obtener | read |
| **Recordings** | | | |
| `GET` | `/api/live-stream/{id}/recording` | Listar | read |
| `POST` | `/api/live-stream/{id}/recording` | Crear (manual) | read+write |
| `POST` | `/api/live-stream/{id}/recording/{rid}` | Actualizar | read+write |
| `DELETE` | `/api/live-stream/{id}/recording/{rid}` | Eliminar | read+write |
| `POST` | `/api/live-stream/{id}/start-record` | Iniciar grabación rápida | read+write |
| `POST` | `/api/live-stream/{id}/stop-record` | Detener grabación rápida | read+write |
| **Restreaming** | | | |
| `GET` | `/api/live-stream/{id}/restream` | Listar | read |
| `GET` | `/api/live-stream/{id}/restream/{rid}` | Obtener | read |
| `POST` | `/api/live-stream/{id}/restream` | Crear | read+write |
| `POST` | `/api/live-stream/{id}/restream/{rid}` | Actualizar | read+write |
| `DELETE` | `/api/live-stream/{id}/restream/{rid}` | Eliminar | read+write |
| `POST` | `/api/live-stream/{id}/restream/{rid}/start` | Iniciar restream | read+write |
| `POST` | `/api/live-stream/{id}/restream/{rid}/stop` | Detener restream | read+write |
| **Ad Insertion** | | | |
| `POST` | `/api/live-stream/{id}/ad-insertion` | Insertar corte SCTE-35 | read+write |
| **Ad Breaks** | | | |
| `GET` | `/api/live-stream/{id}/ad-break` | Listar | read |
| `POST` | `/api/live-stream/{id}/ad-break` | Crear | read+write |
| `DELETE` | `/api/live-stream/{id}/ad-break/{abid}` | Eliminar | read+write |
| **Logo** | | | |
| `POST` | `/api/live-stream/{id}/logo` | Subir logo | read+write |
| `DELETE` | `/api/live-stream/{id}/logo` | Eliminar logo | read+write |
| **Background** | | | |
| `POST` | `/api/live-stream/{id}/background` | Subir fondo | read+write |
| `DELETE` | `/api/live-stream/{id}/background` | Eliminar fondo | read+write |
| **DRM** | | | |
| `POST` | `/api/live-stream/{id}/drm/token` | Generar token DRM | read+write |
| **Metadata** | | | |
| `GET` | `/api/live-stream/{id}/metadata` | Obtener now playing | read |
| `POST` | `/api/live-stream/{id}/metadata` | Actualizar now playing | read+write |
| **Quizzes** | | | |
| `GET` | `/api/live-stream/{id}/quizzes` | Listar | read |
| `POST` | `/api/live-stream/{id}/quizzes` | Crear | read+write |
| `POST` | `/api/live-stream/{id}/quizzes/{qid}` | Actualizar | read+write |
| `POST` | `/api/live-stream/{id}/quizzes/{qid}/send` | Enviar a audiencia | read+write |
| `DELETE` | `/api/live-stream/{id}/quizzes/{qid}` | Eliminar | read+write |
| **Transcripción** | | | |
| `GET` | `/api/live-stream/{id}/transcription` | Estado | read |
| `POST` | `/api/live-stream/{id}/transcription` | Activar/configurar | read+write |
| **Audio Exclusions** | | | |
| `GET` | `/api/live-stream/{id}/audio-exclusion` | Listar | read |
| `GET` | `/api/live-stream/{id}/audio-exclusion/{eid}` | Obtener | read |
| `POST` | `/api/live-stream/{id}/audio-exclusion` | Crear | read+write |
| `POST` | `/api/live-stream/{id}/audio-exclusion/{eid}` | Actualizar | read+write |
| `DELETE` | `/api/live-stream/{id}/audio-exclusion/{eid}` | Eliminar | read+write |
| **EPG** | | | |
| `GET` | `/api/live-stream/{id}/epg` | Obtener EPG | read |
| `POST` | `/api/live-stream/{id}/epg/sync` | Sincronizar EPG | read+write |
| **Gracenote** | | | |
| `GET` | `/api/live-stream/{id}/gracenote` | Metadata Gracenote | read |

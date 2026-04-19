# Referencia de Endpoint: Media (Recurso Individual)

**Base path:** `/api/media/{media_id}`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST/DELETE

> `{media_id}` es siempre un ObjectID MongoDB de 24 caracteres.

---

## Endpoints del Recurso

### 1. Obtener Media por ID

```
GET /api/media/{media_id}
```

Retorna el objeto Media completo con todos sus sub-recursos populados.

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `media_id` | `string` | Sí | ObjectID del media |

**Respuesta exitosa `200`:** Objeto `Media` completo incluyendo:
- `meta[]` — versiones transcodificadas con resolución, codec, bitrate, status
- `thumbnails[]` — miniaturas con URLs CDN
- `tracks[]` — chapter tracks con posición y thumbnail
- `categories[]` — categorías populadas con name e image_url
- `episodes[]` — episodios de Show/Serie que referencian este media
- `ads`, `adswizz`, `inherited_ads` — configuración de publicidad
- `access_rules` — todas las restricciones de acceso
- `protocols.hls` — URL del stream HLS
- `preview.mp4` / `preview.webm` — URLs de preview
- `assistedAi[]` — servicios AI usados (transcripción, metadata)

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `403` | `"ACCESS_DENIED"` | Usuario sin acceso a las categorías del media |
| `404` | `"NOT_FOUND"` | Media no existe |

---

### 2. Actualizar Media

```
POST /api/media/{media_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismo conjunto de parámetros que el endpoint de Creación. Todos son opcionales.

**Campos más usados en actualización:**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Nuevo título |
| `description` | `string` | Nueva descripción |
| `is_published` | `boolean` | Cambiar estado de publicación |
| `categories` | `string[]` | Reemplazar categorías |
| `tags` | `string[]` | Reemplazar tags |
| `no_ad` | `boolean` | Habilitar/deshabilitar ads |
| `available_from` / `available_until` | `"true"\|"false"` | Cambiar ventana de disponibilidad |
| `geo_restriction` | `"allow"\|"deny"` | Actualizar geofencing |
| `companion_media` | `string[]` | Actualizar companion media (enviar `[]` o `"null"` para limpiar) |
| `companion_media_enabled` | `boolean` | Activar/desactivar companion media |

**Respuesta exitosa `200`:** Objeto `Media` completo actualizado.

**Errores:** Mismos que creación.

---

### 3. Eliminar Media

```
DELETE /api/media/{media_id}
```

Mueve el media a estado `TRASH` (soft-delete). No elimina permanentemente.

**Respuesta exitosa `200`:**

```json
{ "status": "OK", "data": null }
```

---

## Sub-recursos de Media

### Thumbnails (Miniaturas)

#### Listar Thumbnails

```
GET /api/media/{media_id}/thumb
```

**Respuesta `200`:**

```json
{
  "status": "OK",
  "data": {
    "thumbnails": [
      {
        "_id": "5ee187e9ccc0ce5debbebf53",
        "size": "original",
        "url": "https://platform.mediastre.am/thumbs/account_id/thumb_media_id_timestamp.jpg",
        "name": "thumb_media_id_timestamp.jpg",
        "cdn_zone": "us",
        "is_default": false
      }
    ]
  }
}
```

#### Subir Thumbnail

```
POST /api/media/{media_id}/thumb
Content-Type: multipart/form-data
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | `binary` | Sí | Archivo de imagen |
| `isDefault` | `boolean` | No | Marcar como thumbnail por defecto |

**Respuesta `200`:**

```json
{ "status": "OK", "data": { "_id": "...", "url": "...", "size": "original", "is_default": true } }
```

#### Actualizar Thumbnail

```
POST /api/media/{media_id}/thumb/{thumb_id}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `isDefault` | `boolean` | Cambiar si es el thumbnail por defecto |

#### Generar Thumbnail desde Frame

```
POST /api/media/{media_id}/thumb/{position}
```

Genera un thumbnail en el segundo `{position}` del video.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `position` | `number` | Segundo del video donde capturar el frame |

#### Recortar (Crop) Thumbnail

```
POST /api/media/{media_id}/thumb/{thumb_id}/crop
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `x` | `number` | Offset X del recorte |
| `y` | `number` | Offset Y del recorte |
| `width` | `number` | Ancho del recorte |
| `height` | `number` | Alto del recorte |

#### Eliminar Thumbnail

```
DELETE /api/media/{media_id}/thumb/{thumb_id}
```

---

### Tracks (Marcadores de Capítulos)

Los tracks definen puntos de interés en el video para crear capítulos o marcadores de publicidad.

#### Listar Tracks

```
GET /api/media/{media_id}/track
```

**Respuesta `200`:**

```json
{
  "status": "OK",
  "data": {
    "tracks": [
      {
        "_id": "...",
        "name": "Capítulo 1",
        "position": 30.5,
        "thumbnail": "https://...",
        "isAd": false
      }
    ]
  }
}
```

#### Crear Track

```
POST /api/media/{media_id}/track
Content-Type: application/json  |  application/x-www-form-urlencoded
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | No | Nombre del capítulo o marcador |
| `position` | `number` | No | Posición en segundos en el video |
| `isAd` | `"true"` | No | Si `"true"`, este track marca un corte para ad. Genera thumbnail del frame mínimo. |

> Para videos, el servidor captura automáticamente el thumbnail del frame en la posición indicada vía VMS.

**Respuesta `200`:** `{ "status": "OK", "data": null }`

#### Actualizar Track

```
POST /api/media/{media_id}/track/{track_id}
```

Mismos campos que crear.

#### Eliminar Track

```
DELETE /api/media/{media_id}/track/{track_id}
```

---

### Subtítulos

#### Listar Subtítulos

```
GET /api/media/{media_id}/subtitle
```

**Respuesta `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "...",
      "language": "es-CL",
      "language_name": "Español (Chile)",
      "url": "https://..."
    }
  ]
}
```

#### Crear Subtítulo

```
POST /api/media/{media_id}/subtitle
Content-Type: multipart/form-data
```

**Modo 1 — Subir archivo VTT/SRT:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `subtitle` | `binary` | Sí | Archivo de subtítulo (.vtt, .srt) |
| `language` | `string` | Sí | Código de idioma, ej: `"es-CL"`, `"en-US"` |
| `language_name` | `string` | Sí | Nombre legible del idioma |

**Modo 2 — Speech-to-Text (AI automático):**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `speech_to_text` | `"true"` | Sí | Activa generación automática por AI |
| `main_language` | `string` | Sí | Idioma principal del audio, ej: `"es-ES"` |
| `secondary_languages` | `string[]` | No | Idiomas secundarios (máx 3) |
| `name` | `string` | No | Nombre del subtítulo generado |

> Límite: máximo **20 subtítulos** por media.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_LANGUAGE_OR_LANGUAGE_NAME"` | Idioma faltante en modo archivo |
| `400` | `"SUBTITLE_FILE_REQUIRED"` | No se adjuntó archivo en modo archivo |
| `400` | `"SUBTITLE_LIMIT_REACHED"` | Límite de 20 subtítulos alcanzado |
| `404` | `"MEDIA_NOT_FOUND"` | Media no existe |

#### Actualizar Subtítulo

```
POST /api/media/{media_id}/subtitle/{subtitle_id}
```

#### Eliminar Subtítulo

```
DELETE /api/media/{media_id}/subtitle/{subtitle_id}
```

---

### Chapters (AI-Generated)

Capítulos generados automáticamente por IA a partir de la transcripción del media. Requiere módulo AI habilitado y transcripción previa.

#### Listar Chapters

```
GET /api/media/{media_id}/chapters
```

**Respuesta `200`:**

```json
{
  "status": "OK",
  "data": {
    "chapters": [
      { "_id": "...", "title": "Introducción", "start": 0, "end": 120 }
    ]
  }
}
```

#### Generar Chapters con AI

```
POST /api/media/{media_id}/chapters
Content-Type: application/json
```

> **Prerequisito:** El media debe tener una transcripción generada (`ai.transcription.jsonUrl` presente).
> Elimina automáticamente chapters existentes antes de generar nuevos.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `accountPrompt` | `string` | No | Prompt personalizado a nivel cuenta para la generación |
| `mediaPrompt` | `string` | No | Prompt personalizado a nivel media para la generación |

**Respuesta `200`:** Objeto con el resultado de la generación AI.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"MISSING_ACCOUNT"` | Sin cuenta en contexto |
| `403` | `"AI_MODULE_NOT_ENABLED"` | Módulo AI no habilitado |
| `400` | `"MISSING_MEDIA_INFO"` | Media no encontrado |
| `400` | `"MISSING_TRANSCRIPTION_JSON_URL"` | Sin transcripción previa |

#### Actualizar Chapter

```
POST /api/media/{media_id}/chapters/{chapter_id}
```

#### Eliminar Chapter

```
DELETE /api/media/{media_id}/chapters/{chapter_id}
```

---

### Meta (Versiones Transcodificadas)

#### Listar Metas

```
GET /api/media/{media_id}/meta
```

**Respuesta `200`:** Array de `MediaMeta` con:
- `label` — Resolución: `"Original"`, `"720p"`, `"480p"`, `"360p"`, `"240p"`, `"144p"`, `"128kbps"` (audio)
- `status` — `"OK"`, `"PROGRESS"`, `"NEW"`, `"ERROR"`, `"TRASH"`
- `url` — URL directa del archivo MP4/M4A
- `is_original` — Si es la versión original
- `resolution` — `{ width, height }` (solo video)
- `codec` — Info de codec video y audio
- `file_size` — Tamaño en MB
- `transcoding_progress` — 0-100 durante transcoding

#### Crear Meta (Nueva resolución)

```
POST /api/media/{media_id}/meta
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `label` | `string` | Resolución a generar, ej: `"720p"`, `"360p"` |

#### Lanzar Transcoding de Meta

```
POST /api/media/{media_id}/meta/{meta_id}/transcode
```

Relanza el trabajo de transcoding para una resolución específica.

#### Actualizar Meta

```
POST /api/media/{media_id}/meta/{meta_id}
```

#### Eliminar Meta

```
DELETE /api/media/{media_id}/meta/{meta_id}
```

---

### DRM (Digital Rights Management)

#### Obtener Token DRM

```
POST /api/media/{media_id}/drm/token
Content-Type: application/json
```

Genera un JWT de autorización DRM para el media. Requiere que la cuenta tenga DRM configurado.

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `expireMinutes` | `number` | No | Minutos de validez del token (default del sistema si se omite) |

**Respuesta `200`:**

```json
{
  "status": "OK",
  "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `500` | `"DRM_NOT_CONFIGURED"` | La cuenta no tiene DRM configurado |
| `500` | `"ERROR_GENERATING_MEDIA_IV"` | Error generando IV del media |
| `500` | `"ERROR_CREATING_TOKEN"` | Error creando el JWT |
| `404` | `"NOT_FOUND"` | Media no existe |

---

### Highlights (Momentos Destacados)

#### Listar Highlights

```
GET /api/media/{media_id}/highlights
```

#### Crear Highlight

```
POST /api/media/{media_id}/highlights
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Nombre del highlight |
| `start` | `number` | Segundo de inicio |
| `end` | `number` | Segundo de fin |

#### Actualizar Highlight

```
POST /api/media/{media_id}/highlights/{highlight_id}
```

#### Eliminar Highlight

```
DELETE /api/media/{media_id}/highlights/{highlight_id}
```

---

### Rating

#### Obtener Rating

```
GET /api/media/{media_id}/rating
```

#### Crear/Actualizar Rating (por usuario)

```
POST /api/media/{media_id}/rating
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `value` | `number` | Valor del rating (1-5) |

---

### Transcripción (AI Speech-to-Text)

#### Lanzar Transcripción

```
POST /api/media/{media_id}/transcription
```

#### Actualizar Transcripción

```
POST /api/media/{media_id}/transcription/update
```

---

### Preview (Video Preview)

#### Generar Preview

```
POST /api/media/{media_id}/preview
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `keep_audio` | `boolean` | Si `true`, el preview conserva el audio original. Por defecto se genera sin audio. |

---

### Ad Breaks (Cortes Publicitarios)

#### Crear Ad Break

```
POST /api/media/{media_id}/adbreaks
Content-Type: application/json
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `position` | `number` | Segundo del video donde insertar el corte |
| `duration` | `number` | Duración del corte en segundos |

---

### Upload (Carga de Archivo)

#### Iniciar Upload

```
POST /api/media/{media_id}/upload
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `type` | `"s3"\|"remote"` | Tipo de upload. Sin valor = upload chunked al servidor |
| `file_name` | `string` | Nombre del archivo incluyendo extensión (ej: `"video.mp4"`) |
| `size` | `number` | Tamaño del archivo en bytes |
| `fileUrl` | `string` | URL del archivo remoto (`type=remote`) |
| `key` | `string` | Key en S3 Bucket (`type=s3`) |
| `bucket` | `string` | ID del S3 Bucket (`type=s3`) |
| `accessKey` | `string` | Access key S3 (`type=s3`) |
| `secretAccessKey` | `string` | Secret access key S3 (`type=s3`) |
| `region` | `string` | Región del bucket S3 (`type=s3`) |
| `media_id` | `string` | Si se especifica, reemplaza el video de un media existente |

---

### Quizzes

#### Listar Quizzes

```
GET /api/media/{media_id}/quizzes
```

#### Crear Quiz

```
POST /api/media/{media_id}/quizzes
```

#### Actualizar Quiz

```
POST /api/media/{media_id}/quizzes/{quiz_id}
```

#### Eliminar Quiz

```
DELETE /api/media/{media_id}/quizzes/{quiz_id}
```

---

### Metadata (Enriquecimiento AI)

#### Obtener Metadata AI

```
GET /api/media/{media_id}/metadata
```

#### Generar Metadata con AI

```
POST /api/media/{media_id}/metadata
```

---

## Resumen Completo de Endpoints de Media

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/media/{id}` | Obtener media completo | read |
| `POST` | `/api/media/{id}` | Actualizar media | read+write |
| `DELETE` | `/api/media/{id}` | Eliminar media (soft) | read+write |
| **Thumbnails** | | | |
| `GET` | `/api/media/{id}/thumb` | Listar thumbnails | read |
| `POST` | `/api/media/{id}/thumb` | Subir thumbnail | read+write |
| `POST` | `/api/media/{id}/thumb/{thumb_id}` | Actualizar thumbnail | read+write |
| `POST` | `/api/media/{id}/thumb/{position}` | Generar desde frame | read+write |
| `POST` | `/api/media/{id}/thumb/{thumb_id}/crop` | Recortar thumbnail | read+write |
| `DELETE` | `/api/media/{id}/thumb/{thumb_id}` | Eliminar thumbnail | read+write |
| **Tracks** | | | |
| `GET` | `/api/media/{id}/track` | Listar tracks | read |
| `POST` | `/api/media/{id}/track` | Crear track | read+write |
| `POST` | `/api/media/{id}/track/{track_id}` | Actualizar track | read+write |
| `DELETE` | `/api/media/{id}/track/{track_id}` | Eliminar track | read+write |
| **Subtítulos** | | | |
| `GET` | `/api/media/{id}/subtitle` | Listar subtítulos | read |
| `POST` | `/api/media/{id}/subtitle` | Crear subtítulo | read+write |
| `POST` | `/api/media/{id}/subtitle/{subtitle_id}` | Actualizar | read+write |
| `DELETE` | `/api/media/{id}/subtitle/{subtitle_id}` | Eliminar | read+write |
| **Chapters** | | | |
| `GET` | `/api/media/{id}/chapters` | Listar chapters | read |
| `POST` | `/api/media/{id}/chapters` | Generar con AI | read+write |
| `POST` | `/api/media/{id}/chapters/{chapter_id}` | Actualizar | read+write |
| `DELETE` | `/api/media/{id}/chapters/{chapter_id}` | Eliminar | read+write |
| **Meta/Transcoding** | | | |
| `GET` | `/api/media/{id}/meta` | Listar versiones | read |
| `POST` | `/api/media/{id}/meta` | Crear versión | read+write |
| `POST` | `/api/media/{id}/meta/{meta_id}` | Actualizar | read+write |
| `POST` | `/api/media/{id}/meta/{meta_id}/transcode` | Relanzar transcoding | read+write |
| `DELETE` | `/api/media/{id}/meta/{meta_id}` | Eliminar versión | read+write |
| **DRM** | | | |
| `POST` | `/api/media/{id}/drm/token` | Generar token DRM | read+write |
| **Highlights** | | | |
| `GET` | `/api/media/{id}/highlights` | Listar highlights | read |
| `POST` | `/api/media/{id}/highlights` | Crear highlight | read+write |
| `POST` | `/api/media/{id}/highlights/{id}` | Actualizar | read+write |
| `DELETE` | `/api/media/{id}/highlights/{id}` | Eliminar | read+write |
| **Rating** | | | |
| `GET` | `/api/media/{id}/rating` | Obtener rating | read |
| `POST` | `/api/media/{id}/rating` | Crear/actualizar rating | read+write |
| **Transcripción** | | | |
| `POST` | `/api/media/{id}/transcription` | Lanzar transcripción | read+write |
| **Preview** | | | |
| `POST` | `/api/media/{id}/preview` | Generar preview | read+write |
| **Ad Breaks** | | | |
| `POST` | `/api/media/{id}/adbreaks` | Crear ad break | read+write |
| **Upload** | | | |
| `POST` | `/api/media/{id}/upload` | Iniciar upload de archivo | read+write |
| **Quizzes** | | | |
| `GET` | `/api/media/{id}/quizzes` | Listar quizzes | read |
| `POST` | `/api/media/{id}/quizzes` | Crear quiz | read+write |
| `POST` | `/api/media/{id}/quizzes/{quiz_id}` | Actualizar | read+write |
| `DELETE` | `/api/media/{id}/quizzes/{quiz_id}` | Eliminar | read+write |
| **Metadata AI** | | | |
| `GET` | `/api/media/{id}/metadata` | Obtener metadata AI | read |
| `POST` | `/api/media/{id}/metadata` | Generar metadata AI | read+write |

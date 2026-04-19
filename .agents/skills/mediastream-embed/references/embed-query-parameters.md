# Documentación del sistema Embed - SM2 Mediastream Platform

## Descripción general

El sistema **Embed** de SM2 es el servicio público que sirve contenido de video/audio a sitios externos mediante iframes, URLs directas y APIs. Se ejecuta con `app_embed.coffee` (dev.mdstrm.com) y expone rutas para:

- Reproductores embebidos (VOD y Live)
- Playlists HLS/DASH/MP4
- Feeds RSS/Atom
- APIs de metadata
- Compartir contenido

---

## Formato alternativo: parámetros en la URL (Query Override)

Para rutas que aceptan `:options` en el path, los parámetros pueden pasarse como **segmentos en la URL** en lugar de query string:

**Formato:** `/{base_path}/{id}/{key1}/{value1}/{key2}/{value2}/...`

**Ejemplo:**
```
/embed/507f1f77bcf86cd799439011/autoplay/true/player/abc123
```
Equivale a: `/embed/507f1f77bcf86cd799439011?autoplay=true&player=abc123`

Los pares `key/value` se extraen de los segmentos impares/pares del path.

---

# Parámetros por endpoint

## 1. Embed VOD (Video/Audio bajo demanda)

**Rutas:** `/embed/{media_id}` | `/embed/{media_id}/{options}`

### Autenticación y acceso

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `acc_token` | string | Token de cuenta para acceso autenticado |
| `access_token` | string | Token de acceso al contenido |
| `admin_token` | string | Token de admin (bypasea restricciones de acceso) |
| `no_ad` | boolean | Si es admin, deshabilita anuncios (`true`/`1`) |

### Reproducción

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `autoplay` | boolean | Inicia reproducción automáticamente (`true`/`1`) |
| `position` | number | Segundos donde iniciar (alternativa: `starttime`) |
| `starttime` | number | Alias de `position` |
| `loop` | boolean | Repetir el video al finalizar |
| `controls` | string | Mostrar controles (`false` para ocultar) |
| `volume` | number | Volumen inicial (0-100) |
| `source` | string | URL alternativa del stream (override) |
| `type` | string | Tipo de contenido: `recorded`, `dvr` |
| `dash` | boolean | Forzar DASH en place de HLS |
| `hls` | boolean | Forzar HLS |
| `mse` | boolean | Habilitar Media Source Extensions |
| `mse_buffer_length` | number | Longitud del buffer MSE |
| `mse_buffer_size` | number | Tamaño del buffer MSE |

### Player y estilos

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `player` | string | ID del player (24 chars hex) |
| `player_skin` | string | Skin del player: `solidOne`, `lightning`, `reels`, etc. |
| `pip` | boolean | Habilitar Picture-in-Picture |
| `poster` | string | URL de imagen de portada |
| `title` | string | Título a mostrar |
| `description` | string | Descripción a mostrar |
| `playlist` | string | ID de playlist asociada |
| `playlist_id` | string | ID de playlist (cuando viene de playlist) |

### Analytics y tracking

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `property` | string | Nombre de la propiedad (Comscore/analytics) |
| `an` | string | Alias de `property` |
| `c` | string | Customer ID |
| `ds` | string | Distributor ID |
| `ac` | string | Custom attribute |
| `listenerid` | string | ID del listener (Google IMA) |
| `ref` | string | Referrer override |
| `dnt` | boolean | Do Not Track |
| `without_cookies` | boolean | Modo sin cookies |

### Anuncios

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `no_ad` | boolean | Sin anuncios (solo con admin_token) |
| `ads.map` | string | URL del VAST/VMAP personalizado |
| `ads.overlay` | string | Tag de overlay ad |
| `ads.overlayPosition` | number | Posición del overlay (segundos o %) |
| `ads.pausead` | string | Tag de pause ad |
| `ads.pauseadDuration` | number | Duración del pause ad |
| `ads.pauseadMobile` | string | Tag de pause ad móvil |
| `ads.pauseadDurationMobile` | number | Duración del pause ad móvil |
| `ads.volume` | number | Volumen de anuncios (0 silencia) |
| `cust_params` | string | Parámetros custom para Google IMA |
| `googleImaPpid` | string | Publisher Provided ID para IMA |
| `adLoadVideoTimeout` | number | Timeout de carga de ads |
| `adTagParametersForDAI` | object | Parámetros para Dynamic Ad Insertion |

### UI y controles

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `show_title` | boolean | Mostrar título |
| `show_status` | boolean | Mostrar estado |
| `show_timeline_time` | boolean | Mostrar tiempo en timeline |
| `show_content_info_on_pause` | boolean | Info del contenido al pausar |
| `show_controls_on_ad` | boolean | Mostrar controles durante ads |
| `show_previews` | boolean | Habilitar thumbnails de preview |
| `pause_ad_on_click` | boolean | Pausar ad al hacer clic |
| `pause_on_screen_click` | boolean | Pausar al clic en pantalla |
| `skip_ad_on_touch` | boolean | Permitir saltar ad con touch |
| `speed_in_control_bar` | boolean | Mostrar selector de velocidad |
| `centered_ad` | boolean | Centrar anuncios |
| `controls_bar` | object | Config de controles: `showChapters`, `showRelatedRecords`, etc. |

### Watermark

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `watermark.show_watermark` | boolean | Mostrar watermark |
| `watermark.position` | string | `top-left`, `top-right`, `bottom-left`, `bottom-right` |
| `watermark.content` | string | Contenido del watermark |

### Logo

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `style.logo.url` | string | URL del logo (o `false` para ocultar) |
| `style.logo.href` | string | URL del enlace al clic en logo |
| `style.logo.position` | string | Posición: `control-bar`, etc. |

### Estilos visuales

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `style.base_color` | string | Color base del player |
| `style.background_color` | string | Color de fondo |
| `style.border_radius` | string | Radio del borde |
| `style.css` | string | CSS personalizado (URL-encoded) |
| `style.margin_left` | string | Margen izquierdo |
| `style.margin_right` | string | Margen derecho |
| `style.margin_top` | string | Margen superior |
| `style.margin_bottom` | string | Margen inferior |
| `style.bandwidth_alert` | boolean | Mostrar alerta de ancho de banda |

### CDN y perfiles

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `profile` | string | Perfil de calidad: `max`, `min`, o altura (ej: `720`) |
| `max_profile` | number | Altura máxima de perfil permitida |
| `rendition_rule` | string | Regla de selección de bitrate |
| `first_profile` | number | Primer perfil a mostrar en master playlist |
| `forceMdstrmCDN` | boolean | Forzar CDN Mediastream (solo admin) |

### Otros

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `debug` | boolean | Modo debug del player |
| `ima_debug` | boolean | Debug de Google IMA |
| `custom` | object | Parámetros custom (`custom.key=value` o `custom[key]=value`) |
| `playAnywhereEnv` | string | Entorno Play Anywhere |
| `validate` | string | Validar acceso cerrado (`true`/`1`) |
| `system73` | boolean | Habilitar peering System73 |

---

## 2. Video/Audio directo (streams m3u8, mpd, mp4, etc.)

**Rutas:** `/{video|audio}/{media_id}.{m3u8|mpd|mp4|m4a|mp3|f4m}`  
**Con playlist:** `/{video|audio}/p/{playlist_id}/{media_id}.{type}`

Parámetros heredan de Embed VOD. Adicionalmente:

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `download` | boolean | Descargar archivo (solo admin) |
| `max_use` | number | Usos máximos del access_token |
| `AppMF` | string | Identificador de app "Modo Football" (telefónica) |

---

## 3. Live Stream (eventos en vivo)

**Rutas:** `/live-stream/{live_stream_id}` | `/live-stream/{live_stream_id}/{options}`

Comparte la mayoría de parámetros del Embed VOD. Específicos de Live:

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `player` | string | ID del player o `dynamic`, `screen` |
| `no_ad` | boolean | Deshabilitar anuncios (con admin) |
| `dvr` | boolean | Activar modo DVR si está disponible |
| `ref` | string | Referer para matching de ads |
| `autoplay` | boolean | Por defecto `true` (inverso a VOD) |

---

## 4. Live Stream Playlist (HLS/F4M/SMIL)

**Rutas:**
- `/live-stream-playlist/{live_stream_id}.m3u8`
- `/live-stream-playlist/{live_stream_id}.f4m`
- `/live-stream-playlist/{live_stream_id}.smil`
- `/live-stream-playlist/{live_stream_id}/master.m3u8`
- `/live-stream-playlist/{live_stream_id}/{width}-{height}-{bitrate}/media.m3u8`

### Parámetros generales

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `access_token` | string | Token de acceso (closed access) |
| `c` | string | Customer ID (tracking) |
| `rtmpt` | boolean | Usar RTMP sobre TCP (`true`) |
| `rendition_rule` | string | Regla de selección de bitrate |
| `AppMF` | string | Identificador app Modo Football |
| `dvr` | boolean | Habilitar DVR (con admin bypasea distribution policy) |

---

## 5. Live Stream DVR (timeshift)

**Rutas:**
- `/live-stream-playlist/{live_stream_id}/master.m3u8` (con params DVR)
- `/live-stream-playlist/{live_stream_id}/{width}-{height}-{bitrate}/media.m3u8`
- `.../media_{bitrate}.m3u8` (solo desde Origin)

### Parámetros DVR

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `start` | string (ISO-8601) | Fecha/hora de inicio del DVR |
| `end` | string (ISO-8601) | Fecha/hora de fin del DVR |
| `dvrOffset` | number | Segundos desde "ahora" hacia atrás |
| `offset` | number | Offset alternativo (30s base) |
| `delay` | number | Retraso en segundos para ventana reciente |
| `cz` | string | CDN zone |
| `es` | string | Edge server (requerido para media DVR) |
| `pz` | string | Publishing zone |
| `type` | string | `live`, `recorded`, `dvr` |
| `_HLS_skip` | boolean | Solicitud delta/skip |
| `add_timestamps` | boolean | Agregar timestamps (no usado en lógica final) |

**Ejemplo DVR:**
```
/live-stream-playlist/507f.../master.m3u8?start=2024-01-15T10:00:00Z&end=2024-01-15T11:00:00Z
```

---

## 6. Playlist

**Rutas:** `/playlist/{playlist_id}` | `/playlist/{playlist_id}/{options}`

Usa los mismos parámetros que Embed VOD (player, autoplay, etc.). La playlist redirige al primer video con los query params conservados.

---

## 7. Share (redirección a embed)

**Rutas:** `/share/media/{media_id}` | `/share/live/{live_id}`

Redirige al embed o live correspondiente. Acepta `QUERY_OVERRIDE` para pasar params vía path.

---

## 8. Feed (RSS/Atom style)

**Ruta:** `/feed/apps/{account_id}/{feedType}/{feedTypeId?}`

**Tipos de feed:** `category`, `media`, `show`, `season`, `episode`

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `page` | number | Página (default: 1) |
| `limit` | number | Items por página (1-100, default: 20) |
| `sort` | string | Orden (ej: `-date_created`) |
| `tags` | string | Filtro por tags (comma-separated) |
| `format` | string | Formato de respuesta |
| `property` | string | Nombre de propiedad |
| `category` | string | ID de categoría (para feed media) |

---

## 9. Watch (unificado Live/Media)

**Ruta:** `/watch/{schedule_job_id}`

Resuelve si el `schedule_job_id` corresponde a un evento live o a un media VOD y aplica los middlewares y parámetros correspondientes a cada caso.

---

## 10. OEmbed

**Ruta:** `/oembed`

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `url` | string | URL del embed a describir |
| `format` | string | `json` o `xml` |
| `maxwidth` | number | Ancho máximo |
| `maxheight` | number | Alto máximo |

---

## 11. Programmatic (ads)

**Rutas:** `/programmatic/{live_stream_id}`, `/programmatic/tappx/{live_stream_id}`, `/programmatic/tappx/{live_stream_id}/{cookie}`

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `drm` | boolean | Contenido con DRM |
| `format` | string | `mpd` para DASH |
| `ref` | string | Referer (URL) |
| `listenerid` | string | ID de listener |
| `custom` | object | Parámetros custom para ads |

---

## 12. Live Clips

**Ruta:** `/live-clips/{live_stream_id}`

Hereda parámetros de live. Genera URL de clips `.m3u8` con los query params actuales.

---

## 13. Error handler (fallback)

Cuando no hay ruta que coincida, el handler de error recibe la petición. Parámetros usados para metadata:

| Parámetro | Tipo | Descripción |
|----------|------|-------------|
| `metadata` | boolean | Incluir metadata en respuesta |
| `property` / `an` | string | Propiedad |
| `at` | string | Tipo de propiedad |
| `av` | string | Versión |
| `c` | string | User ID |
| `res` | string | Resolución de pantalla |
| `ds` | string | Distributor ID |
| `sc` | string | `1` si viene de share |
| `acc_token` | string | Token de cuenta |
| `type` | string | `live`, `recorded`, `dvr` |
| `title` | string | Título |
| `source` | string | URL del stream |

---

## Cookies utilizadas por el Embed

- `MDSTRMUID` – User ID
- `MDSTRMSID` – Session ID  
- `MDSTRMPID` – Player ID
- `MDSTRMDID` – Device ID (programmatic)
- `MDSTRMTAPPX` – Tappx (ads)

---

## Ejemplos de URLs completas

### Embed VOD con autoplay y token
```
https://embed.mdstrm.com/embed/507f1f77bcf86cd799439011?autoplay=true&acc_token=xxx&player=abc123
```

### Live con DVR
```
https://embed.mdstrm.com/live-stream-playlist/507f1f77bcf86cd799439011/master.m3u8?start=2024-03-17T12:00:00Z&end=2024-03-17T13:00:00Z
```

### Query override en path
```
https://embed.mdstrm.com/embed/507f1f77bcf86cd799439011/autoplay/true/poster/https%3A%2F%2Fexample.com%2Fthumb.jpg
```

### Feed de medios por categoría
```
https://embed.mdstrm.com/feed/apps/507f.../media/507f...?page=1&limit=10&sort=-date_created
```

---

# Batería de pruebas - Sistema Embed

| L | Área / Módulo | Caso de Prueba (Qué revisar) | Pasos a ejecutar (Acción en UI) | Resultado Esperado (Validabilidad de Persistencia) |
|---|---------------|------------------------------|---------------------------------|---------------------------------------------------|
| EMB-01 | Embed VOD | Carga básica de video en reproductor | Abrir navegador. Ir a `https://{EMBED_HOST}/embed/{media_id}` sustituyendo `media_id` por un ID de medio válido (24 caracteres hex). Cargar la página. | Página con reproductor cargado. Video visible con poster por defecto. Barra de controles visible. Sin errores en consola. |
| EMB-02 | Embed VOD | Autoplay sin intervención del usuario | Ir a `https://{EMBED_HOST}/embed/{media_id}?autoplay=true`. Esperar carga completa. | El video inicia reproducción automáticamente sin que el usuario pulse play. |
| EMB-03 | Embed VOD | Inicio en posición específica | Ir a `https://{EMBED_HOST}/embed/{media_id}?position=60`. Reproducir el video. | El video comienza en el segundo 60 (1 minuto), no desde el inicio. |
| EMB-04 | Embed VOD | Loop al finalizar | Ir a `https://{EMBED_HOST}/embed/{media_id}?loop=true`. Dejar que el video termine. | Al finalizar, el video se reinicia automáticamente sin intervención. |
| EMB-05 | Embed VOD | Ocultar controles del player | Ir a `https://{EMBED_HOST}/embed/{media_id}?controls=false`. | Reproductor sin barra de controles visible. El video sigue reproduciéndose. |
| EMB-06 | Embed VOD | Volumen inicial personalizado | Ir a `https://{EMBED_HOST}/embed/{media_id}?volume=50`. Reproducir y revisar volumen. | Volumen inicial al 50%. El indicador de volumen del player lo refleja. |
| EMB-07 | Embed VOD | Título y descripción personalizados | Ir a `https://{EMBED_HOST}/embed/{media_id}?title=Mi+Título&description=Mi+Descripción`. | Título "Mi Título" y descripción personalizada visibles en el player. |
| EMB-08 | Embed VOD | Ocultar título del contenido | Ir a `https://{EMBED_HOST}/embed/{media_id}?show_title=false`. | Título del video no visible en el player. |
| EMB-09 | Embed VOD | Ocultar indicador de estado | Ir a `https://{EMBED_HOST}/embed/{media_id}?show_status=false`. | Indicador de estado (live/recorded) no visible. |
| EMB-10 | Embed VOD | Poster personalizado | Ir a `https://{EMBED_HOST}/embed/{media_id}?poster=https://ejemplo.com/imagen.jpg` (URL de imagen válida). | Imagen de portada personalizada visible antes de reproducir. |
| EMB-11 | Embed VOD | Player específico por ID | Ir a `https://{EMBED_HOST}/embed/{media_id}?player={player_id}`. Usar un `player_id` de 24 caracteres hex válido. | Player con la skin, logo y estilos configurados para ese player en la plataforma. |
| EMB-12 | Embed VOD | Skin del player (lightning) | Ir a `https://{EMBED_HOST}/embed/{media_id}?player_skin=lightning`. | Player con skin "lightning" aplicada (alternativas: reels, solidOne). |
| EMB-13 | Embed VOD | Sin anuncios con admin_token | Generar o recuperar un admin_token. Ir a `https://{EMBED_HOST}/embed/{media_id}?admin_token={token}&no_ad=true`. | Video se reproduce sin prerolls, midrolls ni postrolls. |
| EMB-14 | Embed VOD | Acceso con token de cuenta | Ir a `https://{EMBED_HOST}/embed/{media_id}?acc_token={token}` con un token válido para contenido restringido. | Acceso permitido. Contenido se reproduce. Sin mensaje de restricción. |
| EMB-15 | Embed VOD | Query Override en path | Ir a `https://{EMBED_HOST}/embed/{media_id}/autoplay/true/volume/80`. | Comportamiento equivalente a `?autoplay=true&volume=80`. Autoplay activo y volumen al 80%. |
| EMB-16 | Embed VOD | Modo debug del player | Ir a `https://{EMBED_HOST}/embed/{media_id}?debug=true`. Abrir consola del navegador (F12 > Console). | Logs de debug del player visibles en la consola. |
| EMB-17 | Embed VOD | Modo sin cookies | Ir a `https://{EMBED_HOST}/embed/{media_id}?without_cookies=true`. Revisar pestaña Application > Cookies. | Player funciona correctamente. No se crean/leen cookies MDSTRM* (o el modo sin cookies se respeta). |
| EMB-18 | Embed VOD | DNT (Do Not Track) | Ir a `https://{EMBED_HOST}/embed/{media_id}?dnt=true`. | Player carga. Tracking reducido según configuración del account. |
| EMB-19 | Embed VOD | Perfil de calidad máximo | Ir a la URL del stream: `https://{EMBED_HOST}/video/{media_id}.m3u8?profile=max`. | Redirect a master playlist con solo el perfil de mayor calidad disponible. |
| EMB-20 | Embed VOD | Perfil de calidad mínimo | Ir a `https://{EMBED_HOST}/video/{media_id}.m3u8?profile=min`. | Redirect a master playlist con solo el perfil de menor calidad. |
| EMB-21 | Video directo | Stream HLS (m3u8) | Ir a `https://{EMBED_HOST}/video/{media_id}.m3u8`. | Redirect 302 a URL del stream HLS. Contenido tipo text/plain o application/vnd.apple.mpegurl con playlist m3u8 válida. |
| EMB-22 | Video directo | Stream DASH (mpd) | Ir a `https://{EMBED_HOST}/video/{media_id}.mpd`. | Redirect a manifest DASH o URL firmada. |
| EMB-23 | Video directo | Archivo MP4 directo | Ir a `https://{EMBED_HOST}/video/{meta_id}.mp4`. | Redirect 302 a URL del archivo MP4 en CDN. |
| EMB-24 | Live Stream | Carga básica de evento en vivo | Ir a `https://{EMBED_HOST}/live-stream/{live_stream_id}` con un evento activo. | Reproductor de live cargado. Señal en vivo reproduciéndose (o buffering si hay delay). |
| EMB-25 | Live Stream | Autoplay por defecto en live | Ir a `https://{EMBED_HOST}/live-stream/{live_stream_id}` sin parámetros. | El live inicia reproducción automáticamente. |
| EMB-26 | Live Stream | Desactivar autoplay en live | Ir a `https://{EMBED_HOST}/live-stream/{live_stream_id}?autoplay=false`. | Player en pausa. El usuario debe pulsar play para iniciar. |
| EMB-27 | Live Stream | Playlist HLS del live | Ir a `https://{EMBED_HOST}/live-stream-playlist/{live_stream_id}.m3u8`. | Respuesta m3u8 válida o redirect a edge con playlist master del stream en vivo. |
| EMB-28 | Live Stream | Manifest SMIL para RTMP | Ir a `https://{EMBED_HOST}/live-stream-playlist/{live_stream_id}.smil`. | Manifest SMIL XML válido para conexión RTMP. |
| EMB-29 | Live Stream | RTMP sobre TCP (rtmpt) | Ir a `https://{EMBED_HOST}/live-stream-playlist/{live_stream_id}.smil?rtmpt=true`. | URL o manifest con protocolo `rtmpt` en lugar de `rtmp`. |
| EMB-30 | Live DVR | Rango DVR por fechas | Ir a `https://{EMBED_HOST}/live-stream-playlist/{id}/master.m3u8?start=2024-03-17T10:00:00Z&end=2024-03-17T11:00:00Z`. Usar fechas dentro de la ventana de retención. | Playlist DVR con segmentos del rango horario indicado. Contenido reproducible. |
| EMB-31 | Live DVR | DVR por offset en segundos | Ir a `.../master.m3u8?dvrOffset=300` (5 minutos atrás). | Playlist DVR comenzando 5 minutos antes del momento actual. |
| EMB-32 | Live DVR | Parámetro delay | Ir a la ruta DVR con `?delay=60`. | Ventana DVR reciente según configuración de delay aplicada. |
| EMB-33 | Playlist | Redirección a primer video | Ir a `https://{EMBED_HOST}/playlist/{playlist_id}`. | Redirect 302 a `/embed/{first_media_id}?playlist_id={id}` conservando query original. |
| EMB-34 | Share | Share media (VOD) | Ir a `https://{EMBED_HOST}/share/media/{media_id}`. | Redirect al embed del video correspondiente. |
| EMB-35 | Share | Share live | Ir a `https://{EMBED_HOST}/share/live/{live_id}`. | Redirect al live stream correspondiente. |
| EMB-36 | Feed | Feed de medios por categoría | Ir a `https://{EMBED_HOST}/feed/apps/{account_id}/media?category={cat_id}&page=1&limit=10`. | JSON con estructura feed (id, type, title, entry, etc.). Entradas filtradas por categoría. |
| EMB-37 | Feed | Feed con ordenamiento | Ir a `https://{EMBED_HOST}/feed/apps/{account_id}/media?sort=-date_created&limit=5`. | Medios ordenados por fecha de creación descendente. Máximo 5 ítems. |
| EMB-38 | Feed | Feed filtrado por tags | Ir a la ruta feed con `?tags=tag1,tag2`. | Solo medios que contengan esos tags en la respuesta. |
| EMB-39 | Feed | Límite máximo permitido | Ir a la ruta feed con `?limit=100`. | Hasta 100 ítems en la respuesta. Límite aplicado correctamente. |
| EMB-40 | Feed | Límite excedido | Ir a la ruta feed con `?limit=200`. | Solo 100 ítems devueltos. Límite máximo de 100 se mantiene. |
| EMB-41 | OEmbed | Metadata en JSON | Ir a `https://{EMBED_HOST}/oembed?url={url_embed}&format=json`. Sustituir `url_embed` por URL del embed codificada. | JSON válido con campos html, width, height, title del embed. |
| EMB-42 | OEmbed | Metadata en XML | Ir a la misma URL con `?format=xml`. | Respuesta XML válida con metadata del embed. |
| EMB-43 | OEmbed | Dimensiones maxwidth/maxheight | Ir a oembed con `?maxwidth=400&maxheight=300`. | Dimensiones del embed en la respuesta respetando los límites indicados. |
| EMB-44 | Watch | Resolución live por schedule_job | Ir a `https://{EMBED_HOST}/watch/{schedule_job_id}` cuando el job corresponde a un evento live. | Reproductor de live cargado correctamente. |
| EMB-45 | Watch | Resolución VOD por schedule_job | Ir a `https://{EMBED_HOST}/watch/{schedule_job_id}` cuando el job corresponde a un media VOD. | Reproductor VOD (embed) cargado. |
| EMB-46 | API | Detalle de video en JSON | Ir a `https://{EMBED_HOST}/video/{media_id}.json`. | JSON con metadata del video (título, duración, account, thumbnails, etc.). |
| EMB-47 | API | Medios relacionados | Ir a `https://{EMBED_HOST}/api/media/{media_id}/related`. | JSON con lista de medios relacionados. |
| EMB-48 | API | Contenido de playlist | Ir a `https://{EMBED_HOST}/api/playlist/{playlist_id}/content`. | JSON con ítems de la playlist. |
| EMB-49 | API | Verificación de restricciones de acceso | Ir a `https://{EMBED_HOST}/api/access-restrictions/media/{id}`. | JSON indicando si el acceso al media está permitido o restringido. |
| EMB-50 | Error | URL con ID inexistente | Ir a `https://{EMBED_HOST}/embed/000000000000000000000000` o ID inválido. | Página de error 404 o handler de error con mensaje apropiado. Sin crash del servidor. |


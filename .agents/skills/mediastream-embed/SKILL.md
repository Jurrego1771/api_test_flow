---
name: mediastream-embed
description: This skill should be used when the user asks about embedding Mediastream content, iframe embed URLs, embed query parameters, player configuration via URL, live stream embed, VOD embed, DVR playback, feed API, oEmbed, stream URLs (m3u8, mpd, mp4), or how to integrate the Mediastream player in an external website. Also activates when the user mentions "embed", "iframe", "player params", "query string del player", "autoplay", "player_skin", "acc_token", "DVR params", or "feed de medias".
version: 1.0.0
---

# Mediastream Embed System

Skill de referencia para integrar el player de Mediastream en sitios externos mediante iframes, URLs directas y APIs públicas.

> **Diferencia clave con la Platform API:** El sistema Embed es **público** — no requiere token de autenticación para contenido sin restricciones. Los parámetros se pasan por **query string** o como **segmentos en el path**.

## Base URL

```
https://embed.mdstrm.com
```

## URLs Principales

| Tipo | Patrón | Uso |
|------|--------|-----|
| **VOD Embed** | `/embed/{media_id}` | Player embebido de video/audio |
| **Live Embed** | `/live-stream/{live_stream_id}` | Player embebido de live |
| **Stream HLS** | `/video/{media_id}.m3u8` | Playlist HLS directa |
| **Stream DASH** | `/video/{media_id}.mpd` | Manifest DASH directo |
| **Stream MP4** | `/video/{meta_id}.mp4` | Archivo MP4 directo |
| **Live HLS** | `/live-stream-playlist/{id}.m3u8` | Playlist HLS del live |
| **Live DVR** | `/live-stream-playlist/{id}/master.m3u8?start=...&end=...` | Timeshift / DVR |
| **Playlist** | `/playlist/{playlist_id}` | Redirección al primer video |
| **Watch** | `/watch/{schedule_job_id}` | Resuelve live o VOD por schedule |
| **Feed** | `/feed/apps/{account_id}/{type}` | Feed RSS/JSON de contenido |
| **oEmbed** | `/oembed?url={embed_url}` | Metadata oEmbed estándar |
| **Share** | `/share/media/{id}` · `/share/live/{id}` | Redirección a embed |

## Formato de Parámetros en Path (Query Override)

Para rutas que aceptan `/{options}`, los parámetros pueden ir en el path:

```
/embed/{media_id}/{key1}/{value1}/{key2}/{value2}/...
```

**Equivalencia:**
```
/embed/507f.../autoplay/true/volume/80
# es igual a:
/embed/507f...?autoplay=true&volume=80
```

## Parámetros Más Comunes

| Parámetro | Aplica a | Descripción |
|-----------|----------|-------------|
| `autoplay` | VOD, Live | Iniciar automáticamente. Default VOD: `false`, Live: `true` |
| `acc_token` | Todos | Token de cuenta para contenido restringido |
| `access_token` | Todos | Token de acceso a contenido cerrado |
| `player` | VOD, Live | ID del player (24 chars hex) o preset: `dynamic`, `screen` |
| `player_skin` | VOD, Live | Skin: `lightning`, `solidOne`, `reels`, `podcast`, `radio` |
| `controls` | VOD, Live | `false` oculta controles |
| `volume` | VOD, Live | Volumen inicial 0-100 |
| `position` | VOD | Inicio en segundos (alias: `starttime`) |
| `loop` | VOD | Repetir al finalizar |
| `poster` | VOD, Live | URL de imagen de portada |
| `no_ad` | VOD, Live | Deshabilitar ads (requiere `admin_token`) |

## Ejemplos de iframe

```html
<!-- VOD básico -->
<iframe
  src="https://embed.mdstrm.com/embed/{media_id}?autoplay=false"
  width="640" height="360"
  allow="autoplay; fullscreen; encrypted-media"
  frameborder="0" allowfullscreen>
</iframe>

<!-- Live con player custom -->
<iframe
  src="https://embed.mdstrm.com/live-stream/{live_id}?player={player_id}"
  width="1280" height="720"
  allow="autoplay; fullscreen"
  frameborder="0" allowfullscreen>
</iframe>

<!-- DVR por rango de fechas -->
<iframe
  src="https://embed.mdstrm.com/live-stream-playlist/{id}/master.m3u8?start=2024-03-17T10:00:00Z&end=2024-03-17T11:00:00Z"
  width="1280" height="720" frameborder="0">
</iframe>

<!-- VOD con parámetros en path -->
<iframe
  src="https://embed.mdstrm.com/embed/{media_id}/autoplay/true/volume/80/player_skin/lightning"
  width="640" height="360" frameborder="0">
</iframe>
```

## Referencias Detalladas

| Documento | Contenido |
|-----------|-----------|
| [embed-query-parameters.md](references/embed-query-parameters.md) | **Todos los query params** por endpoint (90+): auth, reproducción, player, analytics, ads, UI, watermark, logo, estilos, CDN, DVR — más batería de 50 casos de prueba |
| [api-feed.md](references/api-feed.md) | **Feed API** pública: categorías, medias, shows — con ejemplos de request y respuesta JSON |

## Instrucciones para el Agente

1. **Para query params del player** → leer `embed-query-parameters.md` sección correspondiente al tipo de embed (VOD, Live, DVR, Feed, etc.)
2. **Para el Feed API** → leer `api-feed.md` que incluye ejemplos de respuesta completos
3. **Para DVR** → usar siempre fechas ISO 8601 con timezone, ej: `2024-03-17T10:00:00Z`
4. **Para contenido restringido** → `acc_token` en query string o como segmento en path
5. **Los parámetros de estilo** (`style.*`, `watermark.*`, `ads.*`) usan notación punto tanto en query string como en path

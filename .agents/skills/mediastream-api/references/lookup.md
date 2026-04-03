# Referencia de Endpoint: Lookup (Catálogos y Referencias)

**Base path:** `/api/lookup`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read`
**Uso:** Obtener listas de valores válidos para usar en otros endpoints (países, idiomas, géneros, etc.)

---

## Endpoints

### 1. Lista de Países

```
GET /api/lookup/country
```

Retorna todos los países con sus códigos ISO 3166-1 alpha-2.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "value": "BR", "text": "Brazil" },
    { "value": "CL", "text": "Chile" },
    { "value": "CO", "text": "Colombia" },
    { "value": "US", "text": "United States" }
  ]
}
```

> Los valores `value` son los códigos usados en `geo_restriction_countries` de Media y Live Stream.

---

### 2. Lista de Idiomas

```
GET /api/lookup/language
```

Retorna todos los idiomas soportados.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "value": "en", "text": "English" },
    { "value": "es", "text": "Spanish" },
    { "value": "pt", "text": "Portuguese" }
  ]
}
```

---

### 3. Lista de Idiomas para Transcripción (Speech)

```
GET /api/lookup/speech_language
```

Retorna idiomas disponibles para Live Transcription AI.

**Respuesta exitosa `200`:**

```json
[
  { "value": "en-US", "text": "English (United States)" },
  { "value": "es-ES", "text": "Spanish (Spain)" },
  { "value": "pt-BR", "text": "Portuguese (Brazil)" }
]
```

> Usado en el campo `liveTranscription.language` de Live Stream.

---

### 4. Lista de Sistemas Operativos

```
GET /api/lookup/os
```

Retorna todos los sistemas operativos reconocidos por la plataforma para analíticas.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": ["Android", "Chrome OS", "iOS", "Mac OS X", "tvOS", "Windows 10", "webOS", ...]
}
```

---

### 5. Lista de Categorías de YouTube

```
GET /api/lookup/youtube-categories
```

Retorna las categorías de YouTube para clasificación de contenido.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "id": "1", "name": "Film & Animation" },
    { "id": "2", "name": "Autos & Vehicles" },
    { "id": "10", "name": "Music" },
    { "id": "17", "name": "Sports" },
    { "id": "28", "name": "Science & Technology" }
  ]
}
```

---

### 6. Lista de Géneros

```
GET /api/lookup/genre
```

Retorna todos los géneros disponibles para Shows y Playlists.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    "action", "adventure", "animation", "comedy", "crime",
    "documentary", "drama", "education", "fantasy", "history",
    "horror", "music", "mystery", "news", "romance",
    "sci-fi", "sports & recreation", "thriller", "tv & film", "other"
  ]
}
```

> Lista completa: `action`, `adventure`, `alternative health`, `amateur`, `animation`, `arts`, `automotive`, `aviation`, `biography`, `buddhism`, `business news`, `business`, `careers`, `christianity`, `college & high school`, `comedy`, `crime`, `design`, `documentary`, `drama`, `educational technology`, `education`, `fantasy`, `fashion & beauty`, `film noir`, `fitness & nutrition`, `food`, `gadgets`, `games & hobbies`, `government & organizations`, `health`, `higher education`, `hinduism`, `history`, `hobbies`, `horror`, `investing`, `islam`, `judaism`, `k-12`, `kids & family`, `language courses`, `local`, `management & marketing`, `medicine`, `music`, `musical`, `mystery`, `national`, `natural sciences`, `news & politics`, `news`, `non-profit`, `outdoor`, `performing arts`, `personal journals`, `philosophical`, `philosophy`, `places & travel`, `podcasting`, `political`, `professional`, `regional`, `religion & spirituality`, `romance`, `satire`, `sci-fi`, `science & medicine`, `self-help`, `sexuality`, `shopping`, `social sciences`, `software how-to`, `speculative`, `spirituality`, `sports & recreation`, `superhero`, `talk show`, `tech news`, `technology`, `thriller`, `training`, `tv & film`, `urban`, `video games`, `visual arts`, `war`, `western`, `other games`, `other`

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/lookup/country` | Lista de países (ISO codes) | read |
| `GET` | `/api/lookup/language` | Lista de idiomas | read |
| `GET` | `/api/lookup/speech_language` | Lista de idiomas para transcripción | read |
| `GET` | `/api/lookup/os` | Lista de sistemas operativos | read |
| `GET` | `/api/lookup/youtube-categories` | Categorías de YouTube | read |
| `GET` | `/api/lookup/genre` | Lista de géneros | read |

---

## Uso recomendado en tests

Los endpoints de Lookup son de **solo lectura** y no crean recursos. Son ideales para:
- Validar que los valores aceptados por otros endpoints coinciden con el catálogo
- Obtener valores válidos para usar en datos de prueba (ej: códigos de país para geo-restriction)
- Tests de smoke testing — verifican que la API está respondiendo correctamente

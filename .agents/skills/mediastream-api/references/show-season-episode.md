# Referencia de Endpoint: Show — Season y Episode

**Base paths:**
- Seasons: `/api/show/{showId}/season`
- Episodes: `/api/show/{showId}/season/{seasonId}/episode`
- Search Season: `/api/show/season/search`
- Search Episode: `/api/show/episode/search`

**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST · `delete` para DELETE

---

## Modelos de Datos

```ts
Season {
  _id:           string        // ObjectID — solo lectura
  title:         string        // Nombre de la temporada (requerido)
  description:   string        // Descripción
  show:          string        // ID del show padre — solo lectura
  order:         number        // Orden de la temporada — solo lectura
  first_emision: string        // Fecha de primera emisión (ISO 8601)
  featuring:     string[]      // IDs de ShowRelated tipo `featuring` o `any`
  hosts:         string[]      // IDs de ShowRelated tipo `host` o `any`
  episodes:      { _id: string }[]   // Episodios (al listar; detalle con populate)
  images:        { _id: string, path: string }[]
  account:       string        // solo lectura
}

Episode {
  _id:           string        // ObjectID — solo lectura
  title:         string        // Nombre del episodio (requerido)
  description:   string        // Descripción
  show:          string        // ID del show padre — solo lectura
  season:        string        // ID de la temporada padre — solo lectura
  order:         number        // Orden del episodio — solo lectura
  first_emision: string        // Fecha de primera emisión (ISO 8601)
  featuring:     string[]      // IDs de ShowRelated tipo `featuring` o `any`
  hosts:         string[]      // IDs de ShowRelated tipo `host` o `any`
  content:       EpisodeContent[]  // Contenido vinculado (requerido en creación)
  images:        { _id: string, path: string }[]
  account:       string        // solo lectura
}

EpisodeContent {
  _id:          string         // solo lectura
  content_type: "Media"|"Schedule"   // Tipo de contenido (requerido)
  type:         "full"|"recap"|"preview"  // Tipo de episodio
  value:        string         // ID del contenido (Media ID o Schedule ID) (requerido)
}
```

---

## Endpoints de Temporada (Season)

### 1. Listar Temporadas de un Show

```
GET /api/show/{showId}/season
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `all` | `boolean` | `true` = retornar todas sin límite |
| `emision_after` | `string` | Filtrar temporadas con emisión posterior a esta fecha |
| `emision_before` | `string` | Filtrar temporadas con emisión anterior a esta fecha |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset de paginación (default: 0) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5eebcebebdb686369fe8d6c3",
      "title": "Season 1",
      "show": "5eebceb9bdb686369fe8d6b7",
      "episodes": [{ "_id": "5eebcec0bdb686369fe8d6cf" }],
      "order": 1
    }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"SHOW_NOT_FOUND"` | Show no existe |

---

### 2. Crear Temporada

```
POST /api/show/{showId}/season
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | `string` | **Sí** | Nombre de la temporada |
| `description` | `string` | No | Descripción |
| `first_emision` | `string` | No | Fecha de primera emisión (YYYY-MM-DD) |
| `featuring` | `string[]` | No | IDs de ShowRelated tipo `featuring` o `any` |
| `hosts` | `string[]` | No | IDs de ShowRelated tipo `host` o `any` |

**Respuesta exitosa `200`:** Objeto `Season` creado.

```json
{
  "version": "1.0.23",
  "_id": "5ef232cfd5e8e1376044efcf",
  "title": "Season 1",
  "description": "Description season 1",
  "show": "5eebceb9bdb686369fe8d6b7",
  "order": 2
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"SHOW_NOT_FOUND"` | Show no existe |

---

### 3. Obtener Temporada

```
GET /api/show/{showId}/season/{seasonId}
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `populate` | `"true"\|"episode"\|"content"` | Incluir datos de episodios: `true`/`episode` = info básica, `content` = info detallada |
| `episodes_dir` | `"asc"\|"desc"\|"1"\|"-1"` | Orden de episodios (requiere `populate`). `asc`/`1` = orden guardado, `desc`/`-1` = inverso |

**Respuesta exitosa `200`:** Objeto `Season` con `episodes` si se usa `populate`.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Show o temporada no existe |

---

### 4. Actualizar Temporada

```
POST /api/show/{showId}/season/{seasonId}
```

**Body Parameters:** Mismos campos que en creación (todos opcionales).

**Respuesta exitosa `200`:** Objeto `Season` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Show o temporada no existe |

---

### 5. Eliminar Temporada

```
DELETE /api/show/{showId}/season/{seasonId}
```

**Respuesta exitosa `200`:**

```json
{ "version": "1.0.23" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Show o temporada no existe |

---

### 6. Buscar Temporadas (Cross-Show)

```
GET /api/show/season/search
```

Búsqueda de temporadas en todos los shows (no limitada a un show específico).

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `title` | `string` | Filtrar por título |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset de paginación |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "_id": "5e4ef04cecb6030a95852992", "title": "Como dice el dicho > Season 1" },
    { "_id": "5e5858551d34890d0ac4a788", "title": "Plaza Sésamo > Season 1" }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `500` | `"DB_ERROR"` | Error de base de datos |

---

## Endpoints de Episodio (Episode)

### 1. Listar Episodios de una Temporada

```
GET /api/show/{showId}/season/{seasonId}/episode
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `format` | `string` | Filtrar por formato del media vinculado. Ej: `"MP4"` |
| `emision_after` | `string` | Filtrar episodios con emisión posterior a esta fecha |
| `emision_before` | `string` | Filtrar episodios con emisión anterior a esta fecha |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset de paginación (default: 0) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5eebcec0bdb686369fe8d6cf",
      "title": "MasterChef Episodio 1",
      "description": "...",
      "first_emision": "2020-06-19T23:30:00Z",
      "content": [
        {
          "content_type": "schedule",
          "type": "full",
          "_id": "5eebcee9bdb686369fe8d743"
        }
      ],
      "show": "5eebceb9bdb686369fe8d6b7",
      "season": "5eebcebebdb686369fe8d6c3",
      "order": 1
    }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"SEASON_NOT_FOUND"` | Temporada no existe |

---

### 2. Crear Episodio

```
POST /api/show/{showId}/season/{seasonId}/episode
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | `string` | **Sí** | Nombre del episodio |
| `content` | `EpisodeContent[]` | **Sí** | Array de contenido vinculado |
| `content[].content_type` | `"Media"\|"Schedule"` | **Sí** | Tipo de contenido |
| `content[].value` | `string` | **Sí** | ID del contenido (Media ID o Schedule ID) |
| `content[].type` | `"full"\|"recap"\|"preview"` | No | Tipo de episodio |
| `description` | `string` | No | Descripción |
| `first_emision` | `string` | No | Fecha de primera emisión |
| `featuring` | `string[]` | No | IDs de ShowRelated tipo `featuring` |
| `hosts` | `string[]` | No | IDs de ShowRelated tipo `host` |

**Respuesta exitosa `200`:** Objeto `Episode` creado.

```json
{
  "version": "1.0.23",
  "_id": "5ef26945ff35667f899df6b8",
  "title": "Episode 1",
  "description": "Description episode 1",
  "show": "5eebceb9bdb686369fe8d6b7",
  "season": "5eebcebebdb686369fe8d6c3",
  "order": 1
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"SEASON_NOT_FOUND"` | Temporada no existe |

**Ejemplo de request:**

```json
{
  "title": "Episode 1",
  "description": "Description episode 1",
  "first_emision": "2020-02-01",
  "content": [
    {
      "content_type": "Media",
      "type": "full",
      "value": "5ee18728ccc0ce5debbebf36"
    }
  ]
}
```

---

### 3. Obtener Episodio

```
GET /api/show/{showId}/season/{seasonId}/episode/{episodeId}
```

**Respuesta exitosa `200`:** Objeto `Episode` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Temporada o episodio no existe |

---

### 4. Actualizar Episodio

```
POST /api/show/{showId}/season/{seasonId}/episode/{episodeId}
```

**Body Parameters:** Mismos campos que en creación (todos opcionales).

**Respuesta exitosa `200`:** Objeto `Episode` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Temporada o episodio no existe |

---

### 5. Eliminar Episodio

```
DELETE /api/show/{showId}/season/{seasonId}/episode/{episodeId}
```

**Respuesta exitosa `200`:**

```json
{ "version": "1.0.23" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Temporada o episodio no existe |

---

### 6. Buscar Episodios (Cross-Show)

```
GET /api/show/episode/search
```

Búsqueda de episodios en todas las temporadas (no limitada a un show específico).

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `title` | `string` | Filtrar por título |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset de paginación |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "_id": "5e4ef04cecb6030a958529a2", "title": "La Rosa de Guadalupe" },
    { "_id": "5e4ef04becb6030a95852978", "title": "Punto noticias" }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `500` | `"DB_ERROR"` | Error de base de datos |

---

## Resumen de Endpoints

### Temporadas

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/show/{showId}/season` | Listar temporadas | read |
| `POST` | `/api/show/{showId}/season` | Crear temporada | read+write |
| `GET` | `/api/show/{showId}/season/{seasonId}` | Obtener temporada | read |
| `POST` | `/api/show/{showId}/season/{seasonId}` | Actualizar temporada | read+write |
| `DELETE` | `/api/show/{showId}/season/{seasonId}` | Eliminar temporada | delete |
| `GET` | `/api/show/season/search` | Buscar temporadas (cross-show) | read |

### Episodios

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/show/{showId}/season/{seasonId}/episode` | Listar episodios | read |
| `POST` | `/api/show/{showId}/season/{seasonId}/episode` | Crear episodio | read+write |
| `GET` | `/api/show/{showId}/season/{seasonId}/episode/{episodeId}` | Obtener episodio | read |
| `POST` | `/api/show/{showId}/season/{seasonId}/episode/{episodeId}` | Actualizar episodio | read+write |
| `DELETE` | `/api/show/{showId}/season/{seasonId}/episode/{episodeId}` | Eliminar episodio | read+write |
| `GET` | `/api/show/episode/search` | Buscar episodios (cross-show) | read |

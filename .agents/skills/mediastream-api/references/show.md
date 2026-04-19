# Referencia de Endpoint: Show (Colección)

**Base path:** `/api/show`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST

---

## Modelo de Datos (Show)

```ts
Show {
  // Identidad
  _id:           string        // ObjectID (24 chars) — solo lectura
  title:         string        // Título del show (requerido)
  slug:          string        // URL-friendly — solo lectura
  type:          "tvshow"|"radioshow"|"podcast"|"mixed"  // Tipo (requerido)
  description:   string        // Descripción
  first_emision: string        // Fecha de primera emisión (ISO 8601)
  rating:        number        // Rating del 1 al 10

  // Taxonomía
  genres:        string[]      // Géneros (ver lista completa abajo)
  categories:    { category: string, order?: number }[]  // Categorías con orden opcional

  // Personas relacionadas (IDs de ShowRelated)
  featuring:     string[]      // Protagonistas / personajes destacados
  distributors:  string[]      // Distribuidores
  producers:     string[]      // Productores
  hosts:         string[]      // Presentadores / hosts

  // Contenido
  seasons:       { _id: string }[]   // Temporadas asociadas
  images:        { _id: string, path: string, basePath: string }[]

  // Ads
  ads:           string[]      // IDs de configuraciones de ads

  // RSS / Podcast Feed
  rss: {
    ids_url:   string    // Feed por ID de show
    named_url: string    // Feed por nombre de cuenta
  }

  // RSS personalizado
  custom_feed_data: {
    owner_name:  string
    owner_email: string
    copyright:   string
    link:        string
  }

  // Metadata
  date_created:  string        // ISO 8601 — solo lectura
  date_updated:  string        // ISO 8601 — solo lectura
  account:       string        // ID de cuenta — solo lectura
}
```

**Géneros disponibles:** `action`, `adventure`, `alternative health`, `amateur`, `animation`, `arts`, `automotive`, `aviation`, `biography`, `buddhism`, `business news`, `business`, `careers`, `christianity`, `college & high school`, `comedy`, `crime`, `design`, `documentary`, `drama`, `education technology`, `education`, `fantasy`, `fashion & beauty`, `film noir`, `fitness & nutrition`, `food`, `gadgets`, `games & hobbies`, `government & organizations`, `health`, `higher education`, `hinduism`, `history`, `hobbies`, `horror`, `investing`, `islam`, `judaism`, `k-12`, `kids & family`, `language courses`, `local`, `management & marketing`, `medicine`, `music`, `musical`, `mystery`, `national`, `natural sciences`, `news`, `non-profit`, `outdoor`, `performing arts`, `personal journals`, `philosophy`, `places & travel`, `podcasting`, `political`, `professional`, `regional`, `romance`, `satire`, `sci-fi`, `science & medicine`, `self-help`, `sexuality`, `shopping`, `social sciences`, `software how-to`, `sports & recreation`, `superhero`, `talk show`, `tech news`, `technology`, `thriller`, `training`, `tv & film`, `urban`, `video games`, `visual arts`, `war`, `western`, `other`

---

## Endpoints de Colección

### 1. Listar / Buscar Shows

```
GET /api/show
```

**Query Parameters — Filtros de texto:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `title` | `string` | — | Filtro por título (según `title_rule`) |
| `title_rule` | `"is"\|"contains"\|"starts_with"\|"ends_with"` | `"contains"` | Regla de comparación para `title` |
| `description` | `string` | — | Filtro por descripción (según `description_rule`) |
| `description_rule` | `"is"\|"contains"\|"starts_with"\|"ends_with"` | `"contains"` | Regla de comparación para `description` |
| `type` | `string` | — | Filtro por tipo (según `type_rule`) |
| `type_rule` | `"is"\|"contains"\|"starts_with"\|"ends_with"` | `"is"` | Regla de comparación para `type` |

**Query Parameters — Filtros de array:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `genres` | `string` | Géneros separados por coma. Ej: `"action,comedy"` |
| `genres_filter` | `"in_any"\|"in_all"\|"not_in_any"\|"not_in_all"\|"without_genres"` | Regla para géneros (default: `in_any`) |
| `categories` | `string` | IDs de categoría separados por coma |
| `categories_filter` | `"in_any"\|"in_all"\|"not_in_any"\|"not_in_all"\|"without_category"` | Regla para categorías (default: `in_any`) |
| `distributors` | `string` | IDs de distribuidores separados por coma |
| `producers` | `string` | IDs de productores separados por coma |
| `featuring` | `string` | IDs de featurings separados por coma |

**Query Parameters — Filtros de relación:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `show` | `string` | Filtrar por ID de show específico |
| `season` | `string` | Filtrar por ID de temporada |

**Query Parameters — Paginación y orden:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `sort` | `string` | `"-date_created"` | Campo de orden. Prefijo `-` = descendente. Ej: `"title"`, `"-first_emision"` |
| `limit` | `number` | `100` | Máximo de resultados (máx: 100) |
| `skip` | `number` | `0` | Registros a omitir (offset) |

**Query Parameters — Smart Search avanzado:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `globalRule` | `"in_any"\|"in_all"` | Regla global para aplicar sobre `filterData` (default: `in_all`) |
| `filterData[n][filter]` | `string` | Nombre del filtro para el índice `n` (comenzar en 0) |
| `filterData[n][rule]` | `string` | Regla del filtro |
| `filterData[n][value]` | `string` | Valor del filtro |

Filtros disponibles en Smart Search:
- `title` — reglas: `is`, `contains`, `starts_with`, `ends_with`
- `description` — reglas: `is`, `contains`, `starts_with`, `ends_with`
- `type` — reglas: `is`, `contains`, `starts_with`, `ends_with`
- `genres` — reglas: `in_any`, `not_in_any`, `without_genres`
- `categories` — reglas: `in_any`, `in_all`, `not_in_any`, `not_in_all`, `without_category`

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5eebceb9bdb686369fe8d6b7",
      "title": "MasterChef",
      "description": "Un programa que se ha realizado...",
      "first_emision": "2014-10-26T00:00:00Z",
      "date_created": "2020-06-18T20:29:45Z",
      "date_updated": "2020-06-18T20:29:45Z",
      "type": "tvshow",
      "seasons": [{ "_id": "5eebcebebdb686369fe8d6c3" }],
      "rss": {
        "ids_url": "https://platform.mediastre.am/feeds/5a83600298649173f39357a3/5eebceb9bdb686369fe8d6b7",
        "named_url": "https://platform.mediastre.am/feeds/account/masterchef"
      }
    }
  ]
}
```

**Ejemplos:**

```bash
# Todos los shows
GET /api/show

# Buscar por título
GET /api/show?title=masterchef

# Filtrar por tipo
GET /api/show?type=podcast

# Por géneros (que tenga action O comedy)
GET /api/show?genres=action,comedy&genres_filter=in_any

# Por categoría
GET /api/show?categories=5ee18728ccc0ec8debbeb9i4

# Paginado ordenado por fecha
GET /api/show?limit=20&skip=0&sort=-date_created

# Smart search: título contiene "chef" Y género es comedy
GET /api/show?filterData[0][filter]=title&filterData[0][rule]=contains&filterData[0][value]=chef&filterData[1][filter]=genres&filterData[1][rule]=in_any&filterData[1][value]=comedy&globalRule=in_all
```

---

### 2. Crear Show

```
POST /api/show
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | `string` | **Sí** | Título del show |
| `type` | `"tvshow"\|"radioshow"\|"podcast"\|"mixed"` | **Sí** | Tipo de show |
| `description` | `string` | No | Descripción |
| `genres` | `string[]` | No | Array de géneros |
| `first_emision` | `string` | No | Fecha de primera emisión (YYYY-MM-DD o ISO 8601) |
| `rating` | `number` | No | Rating del 1 al 10 |
| `featuring` | `string[]` | No | IDs de ShowRelated tipo `featuring` o `any` |
| `distributors` | `string[]` | No | IDs de ShowRelated tipo `distributor` o `any` |
| `producers` | `string[]` | No | IDs de ShowRelated tipo `producer` o `any` |
| `hosts` | `string[]` | No | IDs de ShowRelated tipo `host` o `any` |
| `ads` | `string[]` | No | IDs de configuraciones de ads |
| `categories` | `{ category: string, order?: number }[]` | No | Categorías con orden opcional para OTT |
| `custom_feed_data` | `object` | No | Datos personalizados del feed RSS/Podcast |
| `custom_feed_data.owner_name` | `string` | No | Nombre del propietario para RSS |
| `custom_feed_data.owner_email` | `string` | No | Email del propietario para RSS |
| `custom_feed_data.copyright` | `string` | No | Copyright |
| `custom_feed_data.link` | `string` | No | URL del sitio |

**Respuesta exitosa `200`:** Objeto `Show` completo.

**Ejemplos de request:**

```json
// Básico
{
  "title": "My Show",
  "type": "tvshow",
  "genres": ["action", "history"],
  "description": "My show description",
  "rating": 4,
  "first_emision": "2020-02-10"
}

// Con categorías y feed personalizado
{
  "title": "My Podcast",
  "type": "podcast",
  "categories": [
    { "category": "5f22f8aaae54bc37faa52961" },
    { "category": "5f177c6c1628324219ca4d70", "order": 2 }
  ],
  "custom_feed_data": {
    "owner_name": "Owner Name",
    "owner_email": "owner@site.com",
    "copyright": "All Rights Reserved",
    "link": "www.somesite.com"
  }
}
```

---

## Resumen de Endpoints de Colección

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/show` | Listar/buscar shows | read |
| `POST` | `/api/show` | Crear show | read+write |

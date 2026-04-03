# Referencia de Endpoint: Article (Artículos)

**Base path:** `/api/article`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST · `delete` para DELETE

---

## Modelo de Datos (Article)

```ts
Article {
  _id:            string        // ObjectID — solo lectura
  account:        string        // ObjectID de la cuenta — solo lectura
  title:          string        // Título del artículo (requerido)
  slug:           string        // URL-friendly — solo lectura
  sanitizedTitle: string        // Título sin caracteres especiales — solo lectura
  author:         object[]      // Array de autores populados: { _id, name, sanitizedName, account }
  synopsis:       string        // Descripción / resumen
  content:        string        // Contenido HTML del artículo
  image_preview:  string        // URL de imagen principal (CDN)
  is_published:   boolean       // Estado de publicación (default: false)

  // Disponibilidad temporal
  available_from:        boolean    // Activa fecha de inicio de disponibilidad
  available_from_date:   string     // Fecha ISO 8601
  available_from_hour:   number     // Hora de inicio (0-23)
  available_from_offset: number     // Timezone offset en horas
  available_until:        boolean
  available_until_date:   string
  available_until_hour:   number
  available_until_offset: number

  date_created:   string        // ISO 8601 — solo lectura
  date_updated:   string        // ISO 8601 — solo lectura
  date_published: string        // ISO 8601 — solo lectura (cuando is_published=true)

  tags:       { tag: string }[]      // Tags del artículo
  keywords:   { keyword: string }[]  // Palabras clave para SEO
  categories: string[] | object[]    // IDs de categorías (o populados)

  medias: Array<{
    _id:    string
    media:  string    // ID del media asociado
    isMain: boolean   // Si es el media principal
    order:  number    // Orden de aparición
  }>

  images: Array<{
    _id:    string
    image:  string    // ID de imagen (módulo Image)
    isMain: boolean
    order:  number
  }>
}
```

---

## Endpoints

### 1. Listar / Buscar Artículos

```
GET /api/article
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` | No | Filtrar por ID específico |
| `title` | `string` | No | Filtrar por título (texto libre) |
| `author` | `string` | No | Filtrar por ID de autor |
| `filter_categories` | `string` | No | Filtrar por IDs de categoría (separados por coma) |
| `published` | `"published"\|"not-published"` | No | Filtrar por estado de publicación |
| `tags` | `string` | No | Filtrar por tags (separados por coma) |
| `keywords` | `string` | No | Filtrar por keywords (separados por coma) |
| `sort` | `string` | `"-date_created"` | Ordenamiento. Prefijo `-` = descendente |
| `limit` | `number` | `100` | Máximo de resultados (máx: 100) |
| `skip` | `number` | `0` | Offset para paginación |
| `count` | `boolean` | No | Si `true`, retorna solo el total |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5eebceb9bdb686369fe8d6b7",
      "account": "5a83600298649173f39357a3",
      "title": "Star Wars",
      "slug": "star-wars",
      "synopsis": "Es una franquicia...",
      "content": "<p>...</p>",
      "image_preview": "//platform.mediastre.am/article/.../image.jpg",
      "author": [{ "_id": "...", "name": "Anakin" }],
      "date_created": "2020-06-18T20:29:45Z",
      "date_updated": "2020-06-18T20:29:45Z",
      "medias": [{ "isMain": true, "order": 1, "media": "629e5cd..." }],
      "images": [{ "isMain": true, "order": 1, "image": "629e5cd..." }],
      "categories": ["62a890b1e7d6af3111da00n4"],
      "tags": "ObiWan"
    }
  ]
}
```

**Ejemplos:**

```bash
# Todos los artículos
GET /api/article

# Buscar por título
GET /api/article?title=Star Wars

# Solo publicados
GET /api/article?published=published

# Con paginación
GET /api/article?limit=10&skip=0&sort=-date_created

# Contar total
GET /api/article?count=true
```

---

### 2. Búsqueda Avanzada (Smart Search)

```
GET /api/article/search
```

**Query Parameters básicos:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `title` | `string` | Filtrar por título |
| `titleRules` | `"is"\|"contains"` | Regla de comparación (default: `"contains"`) |
| `author` | `string` | Filtrar por autor |
| `authorRules` | `"in_any"\|"not_in_any"\|"without_author"` | Regla para autor (default: `"in_any"`) |
| `tags` | `string` | Tags separados por coma |
| `tagsRules` | `"in_any"\|"in_all"\|"not_in_any"\|"not_in_all"` | Regla para tags |
| `categories` | `string` | IDs de categorías separados por coma |
| `categoriesRules` | `"in_any"\|"in_all"\|"not_in_any"\|"not_in_all"\|"without_category"` | Regla para categorías |
| `createdFrom` | `string` | Fecha ISO 8601 — mínima de creación |
| `createdTo` | `string` | Fecha ISO 8601 — máxima de creación |
| `published` | `boolean` | Filtrar publicados |
| `filter_categories` | `string` | IDs para usar con `without_category` |
| `without_category` | `boolean` | Artículos sin categoría |
| `count` | `boolean` | Solo retorna el total |
| `limit` | `number` | Máx: 100, default: 100 |
| `skip` | `number` | Offset, default: 0 |
| `globalRule` | `"in_any"\|"in_all"` | Regla global para filterData (default: `"in_all"`) |

**Smart Search con `filterData`:**

```bash
# título contiene "wars" Y tags son "ObiWan"
GET /api/article/search?filterData[0][filter]=title&filterData[0][rule]=contains&filterData[0][value]=wars&filterData[1][filter]=tags&filterData[1][rule]=in_any&filterData[1][value]=ObiWan&globalRule=in_all
```

Filtros disponibles en `filterData`:
- `title` — reglas: `is`, `contains`
- `author` — reglas: `in_any`, `not_in_any`, `without_author`
- `tags` — reglas: `in_any`, `in_all`, `not_in_any`, `not_in_all`
- `categories` — reglas: `in_any`, `in_all`, `not_in_any`, `not_in_all`, `without_category`
- `dateCreated` — reglas: `createdFrom`, `createdTo`

**Respuesta exitosa `200`:** Mismo formato que listar artículos.

---

### 3. Crear Artículo

```
POST /api/article
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `title` | `string` | **Sí** | Título del artículo |
| `author` | `string` | No | Nombre o ID del autor |
| `synopsis` | `string` | No | Resumen del artículo |
| `content` | `string` | No | Contenido HTML |
| `image_preview` | `string` | No | URL de imagen principal |
| `slug` | `string` | No | Slug personalizado (auto-generado desde `title` si se omite) |
| `is_published` | `boolean` | No | Publicar inmediatamente (default: `false`) |
| `available_from` | `boolean` | No | Activar fecha de inicio |
| `available_from_date` | `string` | No | Fecha inicio `"YYYY-MM-DD"` |
| `available_from_hour` | `number` | No | Hora de inicio (0-23) |
| `available_from_offset` | `number` | No | Timezone offset |
| `available_until` | `boolean` | No | Activar fecha de fin |
| `available_until_date` | `string` | No | Fecha fin `"YYYY-MM-DD"` |
| `available_until_hour` | `number` | No | Hora de fin (0-23) |
| `available_until_offset` | `number` | No | Timezone offset |
| `tags` | `string\|string[]` | No | Tags: `"[tag1, tag2]"` o array |
| `keywords` | `string\|string[]` | No | Keywords para SEO |
| `categories` | `string\|string[]` | No | IDs de categorías: `"[id1, id2]"` o array |
| `medias` | `object[]` | No | Medias: `[{ media: "id", isMain: true, order: 1 }]` |
| `images` | `string\|object[]` | No | Imágenes: ID o `[{ image: "id", isMain: true, order: 1 }]` |

**Ejemplo de request:**

```json
{
  "title": "My Article",
  "author": "QA Tester",
  "is_published": true,
  "content": "<p>Contenido del artículo</p>",
  "categories": ["61b783a18cbc633cc6f10650"],
  "medias": [{ "isMain": true, "order": 1, "media": "62d55ad3cb912a0e89836c18" }],
  "tags": ["Anakin", "Obiwan"]
}
```

**Respuesta exitosa `200`:** Objeto `Article` completo.

---

### 4. Obtener Artículo por ID

```
GET /api/article/{article_id}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `article_id` | `string` | Sí | ObjectID del artículo |

**Respuesta exitosa `200`:** Objeto `Article` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Artículo no existe |

---

### 5. Actualizar Artículo

```
POST /api/article/{article_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismos campos que Crear. Todos opcionales. Retorna el objeto `Article` actualizado.

---

### 6. Eliminar Artículo

```
DELETE /api/article/{article_id}
```

**Respuesta exitosa `200`:**

```json
{ "status": "OK" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"ARTICLE_NOT_FOUND"` | Artículo no existe |

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/article` | Listar/buscar artículos | read |
| `GET` | `/api/article/search` | Búsqueda avanzada (Smart Search) | read |
| `GET` | `/api/article/{id}` | Obtener artículo por ID | read |
| `POST` | `/api/article` | Crear artículo | write |
| `POST` | `/api/article/{id}` | Actualizar artículo | write |
| `DELETE` | `/api/article/{id}` | Eliminar artículo | delete |

---

## Edge Cases y Casos de Prueba Sugeridos

| Escenario | Esperado |
|-----------|----------|
| Crear sin `title` | Error de validación (`title` requerido) |
| GET con ID inexistente | `404` con `NOT_FOUND` |
| DELETE con ID inexistente | `404` con `ARTICLE_NOT_FOUND` |
| `available_from_date` sin `available_from=true` | Campo ignorado |
| `medias` con ID de media inexistente | Verificar comportamiento |
| Buscar con `published=published` | Solo artículos publicados |
| Buscar con `published=not-published` | Solo borradores |

> **Nota:** El error 404 al obtener usa `"NOT_FOUND"` pero al eliminar usa `"ARTICLE_NOT_FOUND"` — inconsistencia documentada en Swagger.

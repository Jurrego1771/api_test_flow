# Referencia de Endpoint: Playlist

**Base path:** `/api/playlist`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST · `delete` para DELETE

---

## Tipos de Playlist

| Tipo | Descripción |
|------|-------------|
| `manual` | Lista fija de medias seleccionadas manualmente |
| `smart` | Lista dinámica generada por reglas (filtros de título, tags, categorías, fechas, duración, vistas) |
| `series` | Organizada en temporadas y episodios |
| `playout` | Generada por reglas de playout para transmisión lineal |

---

## Modelo de Datos (Playlist)

```ts
Playlist {
  _id:          string        // ObjectID — solo lectura
  account:      string        // ObjectID de la cuenta — solo lectura
  name:         string        // Nombre de la playlist (requerido)
  description:  string        // Descripción opcional
  slug:         string        // URL-friendly — solo lectura
  image_url:    string|null   // URL de imagen de portada (CDN)
  featured:     boolean       // Marcada como destacada
  no_ad:        boolean       // Deshabilitar ads en la playlist
  type:         "manual"|"smart"|"series"|"playout"
  date_created: string        // ISO 8601 — solo lectura
  custom:       object        // Datos personalizados arbitrarios

  categories: Array<{         // Categorías populadas
    _id: string
    name: string
    image_url: string|null
  }>

  access_rules: {
    ip:           { ips: string[], allow: boolean, enabled: boolean }
    referer:      { referers: string[], allow: boolean, enabled: boolean }
    devices:      { deny_tv: boolean, deny_desktop: boolean, deny_mobile: boolean }
    cellular:     { allow: boolean, enabled: boolean }
    geo:          { countries: string[], allow: boolean, enabled: boolean }
    closed_access: { allow: boolean, enabled: boolean }
  }

  access_restrictions: { rule: string|null, enabled: boolean }

  custom_html: Array<{ name: string, html: string }>

  access_tokens: Array<{
    _id:    string
    name:   string    // Email del usuario
    token:  string    // Token de acceso
    notify: boolean   // Notificar por email
  }>

  rules: {
    manual: {
      medias: string[]    // IDs de medias (tipo: manual)
    }
    smart: {
      sort_asc:       boolean
      categories:     string[]
      tags:           string[]
      tags_rule:      string
      categories_rule: string
      created_after:  string|null
      created_before: string|null
      recorded_after: string|null
      recorded_before: string|null
      limit:          number|null
      sort_by:        string|null
      min_views:      number|null
      max_views:      number|null
      min_duration:   number|null
      max_duration:   number|null
    }
    series: {
      seasons: Array<{
        number:   number
        description: string
        episodes: Array<{ number: number, media: string }>
      }>
    }
    playout: Array<{
      categories:      string[]
      categories_rule: string
      tags:            string[]
      tags_rule:       string
      limit:           number
      sort_by:         string
      sort_asc:        boolean
    }>
  }

  // Solo en GET /{id} — medias populadas
  medias: Media[]
}
```

---

## Endpoints

### 1. Listar Playlists

```
GET /api/playlist
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` | No | Filtrar por ID específico |
| `query` | `string` | No | Filtrar por nombre (texto libre) |
| `slug` | `string` | No | Filtrar por slug |
| `featured` | `boolean` | No | Solo playlists destacadas |
| `category_id` | `string[]` | No | Filtrar por ID de categoría |
| `category_name` | `string[]` | No | Filtrar por nombre de categoría |
| `sort` | `string` | `"-date_created"` | Ordenamiento (prefijo `-` = descendente) |
| `limit` | `number` | `100` | Máximo de resultados (máx: 100) |
| `skip` | `number` | `0` | Offset para paginación |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "60e785823c3d6c28513afcf1",
      "name": "My manual playlist",
      "description": "My manual playlist description",
      "slug": "my-manual-playlist",
      "featured": false,
      "type": "manual",
      "date_created": "2021-07-08T23:08:50.209Z",
      "no_ad": false,
      "categories": [{ "_id": "5ea0c336b5ef0e58e238372b", "name": "TV Action" }],
      "rules": { "manual": { "medias": ["5b58e500a106126be9c669b7"] }, "smart": {...} }
    }
  ]
}
```

---

### 2. Crear Playlist

```
POST /api/playlist
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre de la playlist |
| `type` | `"manual"\|"smart"\|"series"\|"playout"` | No | Tipo (default: `"manual"`) |
| `description` | `string` | No | Descripción |
| `featured` | `boolean` | No | Marcar como destacada |
| `no_ad` | `boolean` | No | Deshabilitar ads |
| `categories` | `string[]` | No | IDs de categorías |
| `custom` | `object` | No | Datos personalizados |
| `access_tokens` | `object[]` | No | `[{ name: "email", token: "...", notify: true }]` |
| `custom_html` | `object[]` | No | `[{ name: "...", html: "<html>" }]` |
| `closed_access_restriction` | `"allow"\|"deny"\|"default"` | No | Acceso cerrado |
| `geo_restriction` | `"allow"\|"deny"\|"default"` | No | Restricción geo |
| `geo_restriction_countries` | `string[]` | No | Países ISO 3166-1 alpha-2 |
| `cellular_restriction` | `"allow"\|"deny"\|"default"` | No | Restricción cellular |
| `device_restriction_deny_mobile` | `boolean` | No | Bloquear móviles |
| `device_restriction_deny_tv` | `boolean` | No | Bloquear Smart TVs |
| `referer_restriction` | `"allow"\|"deny"\|"default"` | No | Restricción por referer |
| `referer_restriction_list` | `string[]` | No | Lista de referers |
| `ip_restriction` | `"allow"\|"deny"\|"default"` | No | Restricción por IP |
| `ip_restriction_list` | `string[]` | No | Lista de IPs |

**Parámetros exclusivos por tipo:**

**`type: "manual"`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `medias` | `string[]` | IDs de medias en orden |

**`type: "smart"`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Filtrar medias por título |
| `title_rule` | `"starts_with"\|"ends_with"\|"contains"\|"is"` | Regla para el título |
| `smart_categories` | `string[]` | IDs de categorías de medias |
| `categories_rule` | `"in_any"\|"in_all"\|"not_in_any"\|"not_in_all"` | Regla de categorías |
| `tags` | `string[]` | Tags de medias |
| `tags_rule` | `"in_any"\|"in_all"\|"not_in_any"\|"not_in_all"` | Regla de tags |
| `created_after` | `string` | Fecha ISO 8601 — creados después de |
| `created_before` | `string` | Fecha ISO 8601 — creados antes de |
| `recorded_after` | `string` | Fecha ISO 8601 — grabados después de |
| `recorded_before` | `string` | Fecha ISO 8601 — grabados antes de |
| `min_duration` | `number` | Duración mínima |
| `min_duration_unit` | `"s"\|"m"\|"h"` | Unidad de duración mínima |
| `max_duration` | `number` | Duración máxima |
| `max_duration_unit` | `"s"\|"m"\|"h"` | Unidad de duración máxima |
| `min_views` | `number` | Mínimo de vistas |
| `max_views` | `number` | Máximo de vistas |
| `limit` | `number` | Límite de medias en la playlist |
| `sort_by` | `"title"\|"description"\|"date_created"\|"date_recorded"\|"views"` | Campo de ordenamiento |
| `sort_asc` | `boolean` | Orden ascendente |

**`type: "series"`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `seasons` | `object[]` | `[{ number: 1, description: "...", episodes: [{ number: 1, media: "id" }] }]` |

**`type: "playout"`**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `playout_rules` | `object[]` | `[{ categories: [], categories_rule: "in_any", tags: [], limit: 10, sort_by: "views", sort_asc: true }]` |

**Respuesta exitosa `200`:** Objeto `Playlist` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"ACCOUNT_NOT_FOUND"` | Cuenta no encontrada |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 3. Obtener Playlist por ID

```
GET /api/playlist/{playlist_id}
```

Retorna el objeto `Playlist` completo con las **medias populadas** en `data.medias[]` (solo para tipo `manual`).

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Playlist no existe |

---

### 4. Actualizar Playlist

```
POST /api/playlist/{playlist_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismos campos que Crear. Todos opcionales. Retorna el objeto `Playlist` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Playlist no existe |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 5. Eliminar Playlist

```
DELETE /api/playlist/{playlist_id}
```

**Respuesta exitosa `200`:**

```json
{ "status": "OK", "data": "null" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Playlist no existe |

---

### 6. Subir Imagen de Playlist

```
POST /api/playlist/{playlist_id}/image
Content-Type: multipart/form-data
```

**Form Data:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | `binary` | Sí | Imagen (JPG, PNG, etc.) |

**Respuesta exitosa `200`:**

```json
{ "status": "OK", "data": "//platform.mediastre.am/playlist/60ef65464643612b55604488.png" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_PLAYLIST"` | Playlist no existe |
| `400` | `"INVALID_FILE"` | Formato o tamaño inválido |
| `400` | `"IMAGE_PROCESS_ERROR"` | Error procesando imagen |
| `400` | `"S3_ERROR"` | Error subiendo al storage |

---

### 7. Eliminar Imagen de Playlist

```
DELETE /api/playlist/{playlist_id}/image
```

**Respuesta exitosa `200`:** Objeto `Playlist` con `image_url: null`.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"MISSING_DATA"` | `playlist_id` vacío |
| `404` | `"NOT_FOUND"` | Playlist no existe |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/playlist` | Listar playlists | read |
| `POST` | `/api/playlist` | Crear playlist | write |
| `GET` | `/api/playlist/{id}` | Obtener playlist (con medias) | read |
| `POST` | `/api/playlist/{id}` | Actualizar playlist | write |
| `DELETE` | `/api/playlist/{id}` | Eliminar playlist | delete |
| `POST` | `/api/playlist/{id}/image` | Subir imagen | write |
| `DELETE` | `/api/playlist/{id}/image` | Eliminar imagen | write |

---

## Edge Cases y Casos de Prueba Sugeridos

| Escenario | Esperado |
|-----------|----------|
| Crear sin `name` | Error de validación |
| GET con ID inexistente | `404` con `NOT_FOUND` |
| DELETE con ID inexistente | `404` con `NOT_FOUND` |
| Crear tipo `smart` con `min_views > max_views` | Verificar comportamiento |
| Crear tipo `manual` con IDs de media inexistentes | Verificar si valida o ignora |
| Subir imagen con formato no soportado | `400` con `INVALID_FILE` |
| Playlist con `access_tokens` — acceso sin token | Verificar restricción |
| Playlist tipo `series` con `seasons` vacías | Verificar comportamiento |

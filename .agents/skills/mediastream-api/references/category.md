# Referencia de Endpoint: Category

**Base path:** `/api/category`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST/DELETE

---

## Modelo de Datos

```ts
Category {
  _id:               string       // ObjectID MongoDB (24 chars) — solo lectura
  name:              string       // Nombre visible (requerido al crear)
  _name:             string       // Nombre en minúsculas, generado automáticamente
  slug:              string       // Slug URL-friendly, generado desde name
  description:       string       // Descripción opcional
  parent:            string|null  // ObjectID de categoría padre (null = raíz)
  track:             boolean      // Si analytics trackea esta categoría
  visible:           boolean      // Visibilidad en el frontend
  drm: {
    enabled:                  boolean  // DRM habilitado
    allow:                    boolean  // Permite reproducción
    allow_incompatible_devices: boolean
  }
  image_url:         string|null  // URL de imagen CDN (null si no tiene)
  app_feed:          any          // Configuración de feed para apps
  custom:            any          // Datos personalizados arbitrarios
  filter_categories: string[]    // IDs para filtrado interno (incluye self)
  date_created:      string       // ISO 8601 timestamp
  account:           string       // ObjectID de la cuenta dueña
  __v:               number       // Versión Mongoose (solo lectura)
  // Solo presente con with_count=true:
  count_children:    number       // Cantidad de sub-categorías directas
  has_children:      boolean      // True si tiene hijos
  // Solo presente con full=true:
  // name contiene el path completo, e.g. "Deportes / Fútbol / Liga"
}
```

---

## Endpoints

### 1. Listar / Buscar Categorías

```
GET /api/category
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_name` | `string \| string[]` | No | Filtro por nombre exacto (case-insensitive). Se puede pasar múltiples veces para OR. Sin valor = devuelve todas. |
| `parent` | `string \| string[] \| "null"` | No | Filtra por ID de padre. Pasar `"null"` para obtener solo categorías raíz (sin padre). Múltiples IDs para OR. |
| `full` | `boolean` | No | Si `true`, retorna el path completo en el campo `name` (ej. `"Deportes / Fútbol"`). Habilita el parámetro `name` adicional. |
| `name` | `string` | No | **Solo funciona con `full=true`.** Filtro regex sobre el nombre del path completo. |
| `with_count` | `boolean` | No | Si `true`, agrega los campos `count_children` y `has_children` a cada categoría. Útil para construir árboles. |

> **Nota de permisos:** Si el usuario autenticado tiene categorías restringidas (no es admin), la respuesta filtra automáticamente para mostrar solo las categorías accesibles.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5ee7d68727bd6a32b42f8ede",
      "name": "Videos",
      "slug": "videos",
      "description": "Mi categoría de videos",
      "parent": null,
      "track": true,
      "visible": true,
      "drm": { "enabled": true, "allow": true, "allow_incompatible_devices": false },
      "image_url": null,
      "filter_categories": ["5ee7d68727bd6a32b42f8ede"],
      "date_created": "2020-06-15T20:13:59.813Z",
      "account": "5e4d40208299556e040333e3"
    }
  ]
}
```

**Ejemplos:**

```bash
# Todas las categorías
GET /api/category

# Buscar por nombre
GET /api/category?category_name=Videos

# Buscar múltiples nombres
GET /api/category?category_name=Videos&category_name=Audios

# Solo categorías raíz
GET /api/category?parent=null

# Hijos directos de una categoría
GET /api/category?parent=5ee7d68727bd6a32b42f8ede

# Con conteo de hijos para árbol
GET /api/category?with_count=true

# Árbol completo con path completo
GET /api/category?full=true
```

---

### 2. Obtener Categoría por ID

```
GET /api/category/{category_id}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | `string` | Sí | ObjectID de la categoría (24 chars) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": {
    "_id": "5ee7d68727bd6a32b42f8ede",
    "slug": "videos",
    "description": "Mi categoría de videos",
    "name": "Videos"
  }
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | ID no existe en la cuenta |

---

### 3. Crear Categoría

```
POST /api/category
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre de la categoría. Se convierte automáticamente en `slug` y `_name` (lowercase). |
| `description` | `string` | No | Descripción legible |
| `drm` | `"all" \| "compatible" \| "deny" \| null` | No | Configuración DRM: `"all"` habilita para todos, `"compatible"` solo dispositivos compatibles, `"deny"` bloquea, `null` deshabilita DRM |
| `parent` | `string` | No | ObjectID de categoría padre. Omitir o dejar vacío para categoría raíz |
| `track` | `boolean` | No | Activar tracking de analytics para esta categoría (default: `false`) |
| `visible` | `boolean` | No | Marcar como visible en el frontend (default: `false`) |

**Ejemplo de request:**

```json
{
  "name": "Deportes",
  "description": "Contenido deportivo",
  "drm": "all",
  "track": true,
  "visible": true
}
```

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": {
    "__v": 0,
    "_id": "5ee7d68727bd6a32b42f8ede",
    "name": "Deportes",
    "_name": "deportes",
    "slug": "deportes",
    "description": "Contenido deportivo",
    "parent": null,
    "track": true,
    "visible": false,
    "drm": { "enabled": true, "allow": true, "allow_incompatible_devices": false },
    "filter_categories": ["5ee7d68727bd6a32b42f8ede"],
    "date_created": "2020-06-15T20:13:59.813Z",
    "account": "5e4d40208299556e040333e3"
  }
}
```

> **Nota:** `visible` en la respuesta puede ser `false` incluso si se envió `true` — es comportamiento esperado del servidor.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"NAME_IS_REQUIRED"` | Campo `name` ausente o vacío |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 4. Actualizar Categoría

```
POST /api/category/{category_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | `string` | Sí | ObjectID de la categoría a actualizar |

**Body Parameters:** Mismos campos que Crear (todos opcionales en actualización).

**Ejemplo de request:**

```json
{
  "name": "Deportes Premium",
  "visible": true,
  "track": false
}
```

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": {
    "_id": "5ee7d68727bd6a32b42f8ede",
    "name": "Deportes Premium",
    "_name": "deportes premium",
    "slug": "deportes-premium",
    "drm": { "enabled": true, "allow": true, "allow_incompatible_devices": false },
    "track": false,
    "visible": false,
    "account": "5e4d40208299556e040333e3"
  }
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Categoría no encontrada |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 5. Eliminar Categoría

```
DELETE /api/category/{category_id}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | `string` | Sí | ObjectID de la categoría a eliminar |

> **Restricción:** No se puede eliminar una categoría que tenga sub-categorías hijas. Eliminar primero los hijos.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": null
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"CANT_DELETE_PARENT"` | La categoría tiene sub-categorías hijas |
| `404` | `"NOT_FOUND"` | Categoría no encontrada |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 6. Subir Imagen de Categoría

```
POST /api/category/{category_id}/image
Content-Type: multipart/form-data
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | `string` | Sí | ObjectID de la categoría |

**Form Data:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | `binary` | Sí | Archivo de imagen (JPG, PNG, etc.) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": "//platform.mediastre.am/category/5ee9187f6e87796eb1ff73cc-1592334625149.png"
}
```

El campo `data` contiene la URL pública de la imagen subida al CDN.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_CATEGORY"` | La categoría no existe |
| `400` | `"INVALID_FILE"` | Formato o tamaño de archivo inválido |
| `400` | `"IMAGE_PROCESS_ERROR"` | Error procesando la imagen |
| `400` | `"S3_ERROR"` | Error subiendo al storage S3 |

---

### 7. Eliminar Imagen de Categoría

```
DELETE /api/category/{category_id}/image
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | `string` | Sí | ObjectID de la categoría |

**Respuesta exitosa `200`:** Retorna el objeto categoría completo con `image_url: null`.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"MISSING_DATA"` | `category_id` vacío o nulo |
| `404` | `"NOT_FOUND"` | Categoría no encontrada |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 8. Asignar Medias a Categoría

```
POST /api/category/{category_id}/media
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `category_id` | `string` | Sí | ObjectID de la categoría |

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `media_id` | `string \| string[]` | **Sí** | ID o array de IDs de medias a asignar a esta categoría |

**Ejemplo de request:**

```json
{
  "media_id": ["5ee18728ccc0ce5debbebf36", "5ee15a97824d815cb66e27bf"]
}
```

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": 2
}
```

El campo `data` indica cuántas medias fueron asignadas exitosamente.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"MISSING_DATA"` | `media_id` ausente o vacío |
| `404` | `"NOT_FOUND"` | Categoría no encontrada |

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/category` | Listar/buscar categorías | read |
| `GET` | `/api/category/{id}` | Obtener categoría | read |
| `POST` | `/api/category` | Crear categoría | read+write |
| `POST` | `/api/category/{id}` | Actualizar categoría | read+write |
| `DELETE` | `/api/category/{id}` | Eliminar categoría | read+write |
| `POST` | `/api/category/{id}/image` | Subir imagen | read+write |
| `DELETE` | `/api/category/{id}/image` | Eliminar imagen | read+write |
| `POST` | `/api/category/{id}/media` | Asignar medias | read+write |

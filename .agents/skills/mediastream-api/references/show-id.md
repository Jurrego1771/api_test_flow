# Referencia de Endpoint: Show (Recurso + Sub-recursos)

**Base path:** `/api/show/{showId}`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `read+write` para POST · `delete` para DELETE

---

## 1. Endpoints del Recurso Show

### GET /api/show/{showId}

Obtiene los datos completos de un show.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `showId` | `string` | ObjectID del show (24 chars hex) |

**Respuesta exitosa `200`:** Objeto `Show` completo (ver modelo en [show.md](show.md)).

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Show no existe |

---

### POST /api/show/{showId}

Actualiza un show existente. Solo se actualizan los campos enviados.

**Body Parameters:** Mismos campos que en la creación (todos opcionales para update).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `title` | `string` | Título del show |
| `type` | `"tvshow"\|"radioshow"\|"podcast"\|"mixed"` | Tipo |
| `description` | `string` | Descripción |
| `genres` | `string[]` | Géneros |
| `first_emision` | `string` | Fecha de primera emisión |
| `rating` | `number` | Rating 1–10 |
| `featuring` | `string[]` | IDs de ShowRelated |
| `distributors` | `string[]` | IDs de ShowRelated |
| `producers` | `string[]` | IDs de ShowRelated |
| `hosts` | `string[]` | IDs de ShowRelated |
| `ads` | `string[]` | IDs de ads |
| `categories` | `{ category: string, order?: number }[]` | Categorías con orden |
| `custom_feed_data` | `object` | Datos personalizados del feed RSS |

**Respuesta exitosa `200`:** Objeto `Show` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Show no existe |

---

### DELETE /api/show/{showId}

Elimina un show.

**Respuesta exitosa `200`:**

```json
{ "version": "1.0.23" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Show no existe |

---

## 2. Sub-recurso: Imágenes

Endpoint genérico para subir/eliminar imágenes en entidades del módulo Show.

### POST /api/show/data/{module}/{moduleId}/image

Sube una imagen a un módulo (show, temporada, episodio o related).

**Path Parameters:**

| Parámetro | Tipo | Valores | Descripción |
|-----------|------|---------|-------------|
| `module` | `string` | `show`, `season`, `episode`, `showrelated` | Tipo de módulo |
| `moduleId` | `string` | ObjectID | ID del recurso |

**Content-Type:** `multipart/form-data` o `application/x-www-form-urlencoded`

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `image` | `object` | **Sí** | Objeto de imagen |
| `image.file` | `binary` | **Sí** | Archivo de imagen |
| `image.contentType` | `string` | No | MIME type. Ej: `"image/jpeg"` |
| `image.filename` | `string` | No | Nombre del archivo. Ej: `"picture.jpg"` |

**Respuesta exitosa `200`:** Objeto del módulo actualizado con el array `images`.

```json
{
  "version": "1.0.23",
  "account": "5addfca114d58c2a94bd1842",
  "_id": "5c62630a40c988548ea69b4f",
  "images": [
    {
      "path": "/showrelated/images/5addfca114d58c2a94bd1842_5c62630a40c988548ea69b4f_1549956163900.jpg",
      "_id": "5c6274437b58205c64c51a49"
    }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Módulo no existe |

---

### DELETE /api/show/data/{module}/{moduleId}/image/{imageId}

Elimina una imagen de un módulo.

**Path Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `module` | `string` | Tipo de módulo: `show`, `season`, `episode`, `showrelated` |
| `moduleId` | `string` | ID del recurso |
| `imageId` | `string` | ID de la imagen a eliminar |

**Respuesta exitosa `200`:**

```json
{ "version": "1.0.23" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Módulo o imagen no existe |

**Ejemplos:**

```bash
# Subir imagen a un show
POST /api/show/data/show/5eebceb9bdb686369fe8d6b7/image
Content-Type: multipart/form-data
# image.file = <binary>

# Subir imagen a una temporada
POST /api/show/data/season/5ef232cfd5e8e1376044efcf/image

# Subir imagen a un related
POST /api/show/data/showrelated/5ef36e1fff35667f899df6be/image

# Eliminar imagen
DELETE /api/show/data/show/5eebceb9bdb686369fe8d6b7/image/5c6274437b58205c64c51a49
```

---

## 3. Sub-recurso: Related (Productores, Distribuidores, Hosts, Featurings)

Los "Related" son entidades asociadas a shows: productores, distribuidores, presentadores y protagonistas.

### GET /api/show/data/related

Busca/lista todos los related de la cuenta.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` | Filtrar por ID específico |
| `name` | `string` | Filtrar por nombre |
| `email` | `string` | Filtrar por email |
| `type` | `"producer"\|"distributor"\|"host"\|"featuring"\|"any"` | Filtrar por tipo |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset de paginación (default: 0) |

**Nota:** Se requiere al menos un filtro de búsqueda de longitud suficiente; de lo contrario retorna `SEARCH_PARAMS_TOO_SHORT`.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5d76b7c2df2f9d0beb57f4bd",
      "name": "Producer",
      "email": "email@producer.com",
      "website": "www.domain.com",
      "type": "producer",
      "status": "OK",
      "images": [],
      "metadata": {}
    }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"SEARCH_PARAMS_TOO_SHORT"` | Parámetros de búsqueda demasiado cortos |

---

### POST /api/show/data/related

Crea un nuevo related.

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre del related |
| `type` | `"producer"\|"distributor"\|"host"\|"featuring"\|"any"` | **Sí** | Tipo |
| `email` | `string` | No | Email |
| `website` | `string` | No | URL del sitio web |
| `metadata` | `object` | No | Datos personalizados arbitrarios |

**Respuesta exitosa `200`:** Objeto `ShowRelated` creado.

```json
{
  "version": "1.0.23",
  "_id": "5ef36e1fff35667f899df6be",
  "name": "Producer",
  "type": "producer",
  "status": "OK",
  "metadata": {},
  "images": []
}
```

---

### GET /api/show/data/related/{relatedId}

Obtiene datos de un related específico.

**Respuesta exitosa `200`:** Objeto `ShowRelated` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Related no existe |

---

### POST /api/show/data/related/{relatedId}

Actualiza un related existente.

**Body Parameters:** Mismos campos que en creación (todos opcionales para update).

**Respuesta exitosa `200`:** Objeto `ShowRelated` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Related no existe |

---

### DELETE /api/show/data/related/{relatedId}

Elimina un related.

**Respuesta exitosa `200`:**

```json
{ "version": "1.0.23" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Related no existe |

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/show/{showId}` | Obtener show | read |
| `POST` | `/api/show/{showId}` | Actualizar show | read+write |
| `DELETE` | `/api/show/{showId}` | Eliminar show | delete |
| `POST` | `/api/show/data/{module}/{moduleId}/image` | Subir imagen | read+write |
| `DELETE` | `/api/show/data/{module}/{moduleId}/image/{imageId}` | Eliminar imagen | read+write |
| `GET` | `/api/show/data/related` | Buscar related | read |
| `POST` | `/api/show/data/related` | Crear related | read+write |
| `GET` | `/api/show/data/related/{relatedId}` | Obtener related | read |
| `POST` | `/api/show/data/related/{relatedId}` | Actualizar related | read+write |
| `DELETE` | `/api/show/data/related/{relatedId}` | Eliminar related | read+write |

# Referencia de Endpoint: Channel (Canales Web)

**Base path:** `/api/channel`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST · `delete` para DELETE

---

## Modelo de Datos (Channel)

```ts
Channel {
  _id:         string      // ObjectID — solo lectura
  account:     string      // ObjectID de la cuenta — solo lectura
  name:        string      // Nombre del canal
  public:      boolean     // Si es público
  index_page:  string      // ID de la página principal (PageID)
  domains:     string[]    // Dominios configurados para el canal
  twitter: {
    app_id:        string
    app_secret:    string
    admin_username: string
  }
  facebook: {
    app_id:        string
    app_secret:    string
    admin_username: string
  }
}

Page {
  _id:      string
  channel:  string | { _id: string, index_page: string }
  title:    string      // Título de la página
  path:     string      // Ruta URL (ej: "video", "")
  template: string | { _id: string, name: string }
  content:  string      // Contenido HTML de la página
  __v:      number
}

Template {
  _id:      string
  channel:  string
  name:     string
  content:  string      // HTML del cuerpo — usar `% content %` para incluir Page content
  metadata: string      // HTML del <head>
  css:      string      // CSS del template
  doctype:  string      // ej: "html5"
  __v:      number
}

File {
  name:   string
  size:   string        // ej: "14.75 KB."
  folder: string        // "images", "assets", etc.
  type:   string        // "images", "txt", etc.
  ctime:  string        // ISO 8601 — fecha de creación
}
```

---

## Endpoints de Canal

### 1. Listar Canales

```
GET /api/channel
```

Sin parámetros. Retorna todos los canales de la cuenta.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "_id": "5ee282fc659683397f3a5ffd", "name": "Channel 1" },
    { "_id": "5ee28991659683397f3a6001", "name": "Channel 2" }
  ]
}
```

---

### 2. Crear Canal

```
POST /api/channel/new
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre del canal |
| `facebook_app_id` | `string` | No | Facebook App ID |
| `facebook_app_secret` | `string` | No | Facebook App Secret |
| `facebook_admin_username` | `string` | No | Facebook admin username |
| `twitter_app_id` | `string` | No | Twitter App ID |
| `twitter_app_secret` | `string` | No | Twitter App Secret |
| `twitter_admin_username` | `string` | No | Twitter admin username |

**Respuesta exitosa `200`:** Objeto `Channel` completo.

---

### 3. Obtener Canal por ID

```
GET /api/channel/{channel_id}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Canal no existe |

---

### 4. Actualizar Canal

```
POST /api/channel/{channel_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismos campos que Crear, más:
- `index_page` — ID de la página principal del canal

---

### 5. Eliminar Canal

```
DELETE /api/channel/{channel_id}
```

**Respuesta exitosa `200`:** `{ "status": "OK", "data": "null" }`

---

## Endpoints de Dominio

### 6. Agregar Dominio al Canal

```
POST /api/channel/{channel_id}/domain
Content-Type: application/json
```

**Body:**

```json
{ "domain": "my-domain.com" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_DOMAIN"` | Dominio inválido |
| `400` | `"IN_USE_DOMAIN"` | Dominio ya en uso |
| `404` | `"NOT_FOUND"` | Canal no existe |

### 7. Eliminar Dominio del Canal

```
DELETE /api/channel/{channel_id}/domain
Content-Type: application/json
```

**Body:** `{ "domain": "my-domain.com" }`

---

## Endpoints de Archivos

### 8. Listar Archivos del Canal

```
GET /api/channel/{channel_id}/files/{path}
```

**Path Parameters:**

| Parámetro | Valores | Descripción |
|-----------|---------|-------------|
| `path` | `assets`, `css`, `images`, `js` | Carpeta a listar. Vacío = todos los archivos |

### 9. Subir Archivo al Canal

```
POST /api/channel/{channel_id}/file/upload
Content-Type: multipart/form-data
```

**Form Data:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `name` | **Sí** | Nombre del archivo |
| `file` | **Sí** | Archivo binario |

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_FILE_TYPE"` | Tipo de archivo no permitido |
| `400` | `"MISSING_DATA"` | Path de archivo incorrecto |

---

## Endpoints de Templates

### 10. Crear Template

```
POST /api/channel/{channel_id}/template/new
```

**Body:**

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre del template |
| `content` | HTML del body — usar `% content %` para incluir el Page content |
| `metadata` | HTML del `<head>` |
| `css` | CSS del template |
| `doctype` | ej: `"html5"` |

### 11. Listar Templates del Canal

```
GET /api/channel/{channel_id}/template
```

### 12. Obtener / Actualizar / Eliminar Template

```
GET    /api/channel/{channel_id}/template/{template_id}
POST   /api/channel/{channel_id}/template/{template_id}
DELETE /api/channel/{channel_id}/template/{template_id}
```

---

## Endpoints de Páginas

### 13. Crear Página del Canal

```
POST /api/channel/{channel_id}/page/new
```

**Body:**

| Campo | Descripción |
|-------|-------------|
| `title` | Título de la página |
| `path` | Ruta URL (ej: `"video"`, `""` para home) |
| `template` | ID del template a usar |
| `content` | Contenido HTML |

### 14. Listar Páginas del Canal

```
GET /api/channel/{channel_id}/page
```

### 15. Obtener / Actualizar / Eliminar Página

```
GET    /api/channel/{channel_id}/page/{page_id}
POST   /api/channel/{channel_id}/page/{page_id}
DELETE /api/channel/{channel_id}/page/{page_id}
```

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/channel` | Listar canales | read |
| `POST` | `/api/channel/new` | Crear canal | write |
| `GET` | `/api/channel/{id}` | Obtener canal | read |
| `POST` | `/api/channel/{id}` | Actualizar canal | write |
| `DELETE` | `/api/channel/{id}` | Eliminar canal | delete |
| `POST` | `/api/channel/{id}/domain` | Agregar dominio | write |
| `DELETE` | `/api/channel/{id}/domain` | Eliminar dominio | delete |
| `GET` | `/api/channel/{id}/files/{path}` | Listar archivos | read |
| `POST` | `/api/channel/{id}/file/upload` | Subir archivo | write |
| `POST` | `/api/channel/{id}/template/new` | Crear template | write |
| `GET` | `/api/channel/{id}/template` | Listar templates | read |
| `GET` | `/api/channel/{id}/template/{tid}` | Obtener template | read |
| `POST` | `/api/channel/{id}/template/{tid}` | Actualizar template | write |
| `DELETE` | `/api/channel/{id}/template/{tid}` | Eliminar template | delete |
| `POST` | `/api/channel/{id}/page/new` | Crear página | write |
| `GET` | `/api/channel/{id}/page` | Listar páginas | read |
| `GET` | `/api/channel/{id}/page/{pid}` | Obtener página | read |
| `POST` | `/api/channel/{id}/page/{pid}` | Actualizar página | write |
| `DELETE` | `/api/channel/{id}/page/{pid}` | Eliminar página | delete |

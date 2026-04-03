# Referencia de Endpoint: Image (Imágenes)

**Base path:** `/api/image`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST · `delete` para DELETE

---

## Descripción General

El módulo Image gestiona imágenes estáticas que pueden ser asociadas a artículos, shows y otros contenidos. Incluye soporte para transformaciones de imagen en tiempo real (brillo, contraste, exposición, etc.) mediante parámetros de URL.

---

## Modelo de Datos (Image)

```ts
Image {
  _id:       string      // ObjectID — solo lectura
  account:   string      // ObjectID de la cuenta — solo lectura
  name:      string      // Nombre de la imagen / nombre de la persona (reconocimiento facial)
  faceId:    string      // ID del face (Machine Learning)
  oldName:   string      // Nombre anterior (antes de actualización)
  fileName:  string      // Nombre del archivo CDN
  // Campos de caption (Machine Learning):
  oldCaption:    string
  newCaption:    string
  updateCaption: boolean
}
```

---

## Parámetros de Transformación de Imagen

Disponibles como query params en las URLs de imagen del CDN:

| Parámetro | Tipo | Rango | Descripción |
|-----------|------|-------|-------------|
| `bri` | `number` | `-100` a `100` | Brillo (default: `0` = sin cambio) |
| `con` | `number` | `-100` a `100` | Contraste (default: `0` = sin cambio) |
| `exp` | `number` | — | Exposición |

---

## Endpoints

### Listar Imágenes

```
GET /api/image
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `limit` | `number` | Máx: 100, default: 100 |
| `skip` | `number` | Offset, default: 0 |

---

### Obtener Imagen por ID

```
GET /api/image/{imageId}
```

---

### Subir Imagen

```
POST /api/image
Content-Type: multipart/form-data
```

**Form Data:**

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| `file` | **Sí** | Archivo de imagen binario (JPG, PNG, etc.) |

---

### Actualizar Imagen (Reconocimiento Facial / Caption)

```
POST /api/image/{imageId}
Content-Type: application/json
```

**Body:**

```json
{
  "name": "Nombre de la persona",
  "faceId": "id-del-face",
  "oldName": "Nombre anterior",
  "oldCaption": "Caption anterior",
  "newCaption": "Nuevo caption",
  "updateCaption": true
}
```

---

### Eliminar Imagen por ID

```
DELETE /api/image/{imageId}
```

---

### Eliminar Imagen por Nombre de Archivo

```
DELETE /api/image/{domain}/{fileName}
```

**Path Parameters:**

| Parámetro | Descripción |
|-----------|-------------|
| `domain` | Dominio del host CDN (ej: `devcrop-platform-static.cdn.mdstrm.com`) |
| `fileName` | Nombre del archivo (ej: `5e31d3d208657947fd93a8f9_banner.png`) |

---

### Recortar / Procesar Imagen (Crop)

```
POST /api/image/crop
Content-Type: multipart/form-data
```

**Body:**

| Campo | Descripción |
|-------|-------------|
| `name` | Nombre de la persona para reconocimiento facial |

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/image` | Listar imágenes | read |
| `GET` | `/api/image/{id}` | Obtener imagen | read |
| `POST` | `/api/image` | Subir imagen | write |
| `POST` | `/api/image/{id}` | Actualizar imagen / datos ML | write |
| `DELETE` | `/api/image/{id}` | Eliminar imagen por ID | delete |
| `DELETE` | `/api/image/{domain}/{fileName}` | Eliminar imagen por nombre de archivo | delete |
| `POST` | `/api/image/crop` | Recortar imagen | write |

---

## Notas

- Las imágenes subidas se almacenan en S3/CDN y se referencian por URL
- Se usan principalmente en el módulo `article` (`images[]`) y `show` (`images[]`)
- Los parámetros de transformación (`bri`, `con`, `exp`) se aplican en la URL del CDN, no en el objeto almacenado
- El campo `faceId` vincula la imagen con el módulo Machine Learning para reconocimiento facial

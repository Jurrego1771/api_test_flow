# Referencia de Endpoint: Machine Learning

**Base paths:** `/api/machine-learning/person` · `/api/machine-learning/brand` · `/api/machine-learning/caption`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Módulo requerido:** Machine Learning habilitado en la cuenta
**Permisos mínimos:** `read` para GET · `write` para POST/DELETE

---

## Descripción General

El módulo de Machine Learning de Mediastream permite:
- **Reconocimiento facial** (Face Recognition): identificar personas en videos
- **Reconocimiento de marcas** (Brand Recognition): detectar logos y marcas en videos
- **Captioning / Transcripción**: generar subtítulos y captions automáticos

---

## Entidades

```ts
Person {
  _id:         string
  name:        string      // Nombre de la persona
  title:       string      // Título/cargo
  description: string      // Descripción
  faceId:      string      // ID del face en el servicio de ML
}

Brand {
  _id:         string
  name:        string      // Nombre de la marca
  description: string
}

Caption {
  _id:  string
  name: string             // Texto del caption
}
```

---

## Endpoints de Personas (Face Recognition)

### Listar Personas

```
GET /api/machine-learning/person
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `person` | `string` | Filtrar por nombre de persona |
| `known` | `integer` | `1` = personas conocidas, `0` = desconocidas |
| `count` | `integer` | Si `1`, retorna solo el conteo |
| `limit` | `number` | Máx: 100, default: 100 |
| `skip` | `number` | Offset, default: 0 |

**Respuesta:**

```json
{
  "status": "OK",
  "data": ["Luis Zacharias", "Luis González", "Luis Larraín"]
}
```

### Obtener Persona por ID

```
GET /api/machine-learning/person/{personId}
```

### Actualizar Persona

```
POST /api/machine-learning/person/{personId}
```

**Body:**

```json
{
  "name": "Luis González",
  "title": "My Title",
  "description": "My description"
}
```

### Faces de una Persona

```
GET  /api/machine-learning/person/{personId}/face           → Listar faces
POST /api/machine-learning/person/{personId}/face/{faceId}  → Actualizar face (name, faceId, oldName, oldCaption, newCaption, updateCaption)
DELETE /api/machine-learning/person/{personId}/face/{faceId} → Eliminar face
```

### Referencias de una Persona (en Medias)

```
GET    /api/machine-learning/person/{personId}/reference                → Listar referencias en medias
GET    /api/machine-learning/person/{personId}/reference/{referenceId}  → Obtener referencia específica
DELETE /api/machine-learning/person/{personId}/reference/{referenceId}  → Eliminar referencia
```

---

## Endpoints de Marcas (Brand Recognition)

### Listar Marcas

```
GET /api/machine-learning/brand
```

**Query Parameters:** `count`, `limit`, `skip`

### Obtener Marca por ID

```
GET /api/machine-learning/brand/{brandId}
```

### Actualizar Marca

```
POST /api/machine-learning/brand/{brandId}
```

**Body:**

```json
{
  "name": "Brand",
  "description": "My brand description"
}
```

---

## Endpoints de Captions

### Listar Captions de un Media

```
GET /api/machine-learning/caption/media/{mediaId}
```

**Query Parameters:** `count`, `limit`, `skip`

### Actualizar Caption

```
POST /api/machine-learning/caption/{captionId}
```

**Body:**

```json
{ "name": "This is my text caption" }
```

---

## Resumen de Endpoints

| Método | Path | Acción |
|--------|------|--------|
| `GET` | `/api/machine-learning/person` | Listar personas |
| `GET` | `/api/machine-learning/person/{id}` | Obtener persona |
| `POST` | `/api/machine-learning/person/{id}` | Actualizar persona |
| `GET` | `/api/machine-learning/person/{id}/face` | Listar faces |
| `POST` | `/api/machine-learning/person/{id}/face/{faceId}` | Actualizar face |
| `DELETE` | `/api/machine-learning/person/{id}/face/{faceId}` | Eliminar face |
| `GET` | `/api/machine-learning/person/{id}/reference` | Listar referencias en medias |
| `DELETE` | `/api/machine-learning/person/{id}/reference/{refId}` | Eliminar referencia |
| `GET` | `/api/machine-learning/brand` | Listar marcas |
| `GET` | `/api/machine-learning/brand/{id}` | Obtener marca |
| `POST` | `/api/machine-learning/brand/{id}` | Actualizar marca |
| `GET` | `/api/machine-learning/caption/media/{mediaId}` | Listar captions de media |
| `POST` | `/api/machine-learning/caption/{id}` | Actualizar caption |

---

## Notas

- Este módulo requiere que el servicio de Machine Learning esté **habilitado y configurado** en la cuenta
- El reconocimiento facial procesa los videos y genera `Person` con `faceId` referenciando el servicio externo
- Las `references` vinculan personas reconocidas con los timestamps específicos dentro de cada `media`

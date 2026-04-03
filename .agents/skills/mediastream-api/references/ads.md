# Referencia de Endpoint: Ads (Anuncios)

**Base path:** `/api/ad`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST/CREATE · `delete` para DELETE

---

## Modelo de Datos (Ad)

```ts
Ad {
  _id:                  string      // ObjectID — solo lectura
  account:              string      // ObjectID de la cuenta — solo lectura
  name:                 string      // Nombre del Ad (requerido al crear)
  type:                 "vast" | "vmap" | "googleima" | "local" | "ad-insertion" | "adswizz"
                                    // Tipo del ad (default: "vast")
  is_enabled:           boolean     // Habilitado/deshabilitado
  preroll_skip_at:      number      // Segundos hasta que aparece el botón "saltar" (default: 0)
  min_media_time_length: number     // Duración mínima del media para mostrar el ad (segundos)
  date_created:         string      // ISO 8601 — solo lectura

  schedule: {
    overlay: {
      position: number | string   // Posición del overlay (segundos o "0")
      tag:      string            // URL VAST del overlay
    }
    mid: Array<{
      id:       string
      position: string            // Posición del mid-roll (segundos)
    }>
    post: {
      media: string               // ID de media para post-roll
      tag:   string               // URL VAST del post-roll
    }
    pre: {
      media:      string          // ID de media para pre-roll
      tag:        string          // URL VAST del pre-roll
      tag_mobile: string          // URL VAST del pre-roll (mobile)
    }
  }

  adswizz: {
    zone: string                  // Zona AdsWizz
  }

  insertion: {
    tag:              string       // URL para ad-insertion
    loop:             string
    default_duration: string
  }

  categories: string[]            // IDs de categorías donde aplica el ad
  tags:        string[]           // Tags de filtrado
  referers:    string[]           // Dominios referer donde aplica el ad
}
```

---

## Endpoints

### 1. Listar Ads

```
GET /api/ad
```

**Query Parameters:**

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `limit` | `number` | sin límite | Máximo de resultados (0–100) |
| `skip` | `number` | `0` | Offset para paginación |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5ee1858b824d815cb66e296e",
      "type": "vast",
      "name": "ads skippable mid-roll",
      "date_created": "2020-06-11T01:14:51.850Z",
      "is_enabled": true
    },
    {
      "_id": "5edebe35e6e45a6b12ee7b03",
      "type": "vast",
      "name": "ads post-roll",
      "date_created": "2020-06-08T22:39:49.482Z",
      "is_enabled": true
    }
  ]
}
```

---

### 2. Buscar Ads

```
GET /api/ad/search
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` | No | Filtrar por ID específico de un Ad |
| `name` | `string` | No | Filtrar por nombre del Ad (regex) |

**Respuesta exitosa `200`:** Array de Ad (versión reducida con `_id`, `type`, `name`).

---

### 3. Crear Ad

```
POST /api/ad/new
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `name` | `string` | **Sí** | Nombre del ad |
| `type` | `"vast"\|"vmap"\|"googleima"\|"local"\|"ad-insertion"\|"adswizz"` | No | Tipo (default: `"vast"`) |
| `is_enabled` | `boolean` | No | Habilitado (default: `false`) |
| `preroll_skip_at` | `number` | No | Segundos para botón skip (default: `0`) |
| `min_media_time_length` | `number` | No | Duración mínima del media en segundos (≥ 0) |
| `schedule.pre.tag` | `string` | No | URL VAST del pre-roll |
| `schedule.pre.tag_mobile` | `string` | No | URL VAST del pre-roll (mobile) |
| `schedule.pre.media` | `string` | No | ID de media para pre-roll |
| `schedule.post.tag` | `string` | No | URL VAST del post-roll |
| `schedule.post.media` | `string` | No | ID de media para post-roll |
| `schedule.overlay.position` | `number` | No | Posición del overlay en segundos |
| `schedule.overlay.tag` | `string` | No | URL VAST del overlay |
| `schedule.mid` | `object[]` | No | Configuraciones de mid-roll |
| `adswizz.zone` | `string` | No | Zona AdsWizz |
| `insertion.tag` | `string` | No | URL para ad-insertion |
| `categories` | `string[]` | No | IDs de categorías |
| `tags` | `string[]` | No | Tags |
| `referers` | `string[]` | No | Dominios referer |

**Respuesta exitosa `200`:** Objeto `Ad` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `{ code: "AD_BAD_MIN_MEDIA_TIME", message: "..." }` | `min_media_time_length` < 0 |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 4. Obtener Ad por ID

```
GET /api/ad/{ad_id}
```

**Path Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `ad_id` | `string` | Sí | ObjectID del Ad (24 chars) |

**Respuesta exitosa `200`:** Objeto `Ad` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Ad no existe |

---

### 5. Actualizar Ad

```
POST /api/ad/{ad_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismos campos que Crear. Todos opcionales. Retorna el objeto `Ad` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `{ code: "AD_BAD_MIN_MEDIA_TIME" }` | `min_media_time_length` < 0 |
| `404` | `"NOT_FOUND"` | Ad no existe |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 6. Eliminar Ad

```
DELETE /api/ad/{ad_id}
```

**Respuesta exitosa `200`:**

```json
{ "status": "OK", "data": "null" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Ad no existe |

---

## Notas de Implementación

- El endpoint de **creación** usa la ruta `/api/ad/new` (no `POST /api/ad`)
- Los tipos soportados: `vast` (VAST tag URL), `vmap` (VMAP), `googleima` (Google IMA), `local` (media interno), `ad-insertion` (Server-Side Ad Insertion), `adswizz` (AdsWizz)
- `preroll_skip_at: 0` significa que el botón "saltar" aparece inmediatamente
- Los `categories` y `tags` sirven para filtrar en qué contexto se sirve el ad
- Los `referers` restringen el ad a dominios específicos (whitelist)

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/ad` | Listar ads | read |
| `GET` | `/api/ad/search` | Buscar ads por nombre/id | read |
| `GET` | `/api/ad/{id}` | Obtener ad por ID | read |
| `POST` | `/api/ad/new` | Crear ad | write |
| `POST` | `/api/ad/{id}` | Actualizar ad | write |
| `DELETE` | `/api/ad/{id}` | Eliminar ad | delete |

---

## Edge Cases y Casos de Prueba Sugeridos

| Escenario | Esperado |
|-----------|----------|
| Crear sin `name` | Posible error de validación |
| `min_media_time_length` negativo | `400` con `AD_BAD_MIN_MEDIA_TIME` |
| GET con ID inexistente | `404` con `NOT_FOUND` |
| DELETE de ad en uso por un media | Verificar comportamiento (no documentado en Swagger) |
| Crear con `type: "adswizz"` sin `adswizz.zone` | Verificar comportamiento |

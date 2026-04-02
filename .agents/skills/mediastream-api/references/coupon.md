# Referencia de Endpoint: Customer Coupon

**Base paths:** `/api/coupon-group` · `/api/coupon`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Módulo requerido:** `coupon`
**Permisos mínimos:** `read` para GET · `write` para POST/CREATE · `delete` para DELETE

---

## Modelo de Datos

```ts
CouponGroup {
  _id:                  string      // ObjectID — solo lectura
  name:                 string      // Nombre del grupo (único por cuenta)
  gateway:              string|null // Gateway de pago especial, ej: "incomm" — solo admins
  coupon_used_total:    number      // Total de cupones usados — solo lectura
  valid_from:           string|null // Fecha mínima de disponibilidad (ISO 8601)
  valid_to:             string|null // Fecha máxima de disponibilidad (ISO 8601)
  date_created:         string      // solo lectura
  account:              string      // solo lectura
}

CouponSubgroup {
  _id:          string      // ObjectID — solo lectura
  name:         string      // Nombre del lote de cupones
  group:        string      // ID del CouponGroup padre
  detail:       string      // Descripción
  valid_from:   string|null // Fecha de inicio de validez (ISO 8601)
  valid_to:     string|null // Fecha de fin de validez (ISO 8601)
  type:         string|null // Tipo del cupón, ej: "subscription"
  type_code:    string|null // Código de tipo
  percent:      number|null // % de descuento
  created_by:   object      // Usuario que creó (populado: { name })
  date_created: string      // solo lectura
  account:      string      // solo lectura
  // Campos enriquecidos al listar:
  total:        number      // Total de cupones en este subgrupo
  valid_total:  number      // Cupones con is_valid=true
  used_total:   number      // Cupones con is_used=true
}

Coupon {
  _id:              string      // ObjectID — solo lectura
  code:             string      // Código del cupón (auto-generado o custom) — solo lectura
  group:            object      // CouponGroup (populado: { _id, name, gateway })
  subgroup:         string      // ID del CouponSubgroup
  detail:           string      // Descripción / notas
  valid_from:       string|null // Fecha de inicio de validez (ISO 8601)
  valid_to:         string|null // Fecha de fin de validez (ISO 8601)
  is_valid:         boolean     // Si el cupón es válido/activo
  is_used:          boolean     // Si el cupón fue usado (solo lectura para no-reusable)
  is_reusable:      boolean     // Si puede usarse múltiples veces
  max_use:          number|null // Máximo de usos totales (solo reusable)
  max_use_per_customer: number|null  // Máximo de usos por cliente (solo reusable)
  use_count:        number      // Veces que fue usado — solo lectura
  last_use_date:    string|null // Fecha del último uso — solo lectura
  payment_required: boolean     // Si requiere pago para aplicarse
  type:             string|null // Tipo, ej: "subscription"
  type_code:        string|null // Código del tipo
  // Descuento (solo uno activo a la vez):
  percent:          number|null // % de descuento (1–100)
  days:             number|null // Días de extensión (suscripción)
  validity_date:    string|null // Fecha de vencimiento extendida (suscripción)
  amount:           number|null // Monto fijo de descuento
  metadata:         object      // Datos personalizados arbitrarios
  created_by:       object      // Usuario que creó (populado: { name })
  date_created:     string      // solo lectura
  account:          string      // solo lectura
  // Al consultar por código y ya fue usado (no-reusable):
  customer:         { email: string } | undefined
}
```

---

## Endpoints de Grupo (CouponGroup)

### 1. Listar Grupos

```
GET /api/coupon-group
```

**Query Parameters — Modo estándar:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `created_start_date` | `string` | Filtrar grupos creados desde esta fecha (`YYYY-MM-DD`) |
| `created_end_date` | `string` | Filtrar grupos creados hasta esta fecha (`YYYY-MM-DD`) |
| `available_start_date` | `string` | Filtrar grupos con `valid_from >= fecha` (`YYYY-MM-DD`) |
| `available_end_date` | `string` | Filtrar grupos con `valid_to <= fecha` (`YYYY-MM-DD`) |
| `detail` | `string` | Regex por descripción |

**Query Parameters — Modo búsqueda avanzada (`advanced_search=true`):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `advanced_search` | `"true"` | Activa modo de búsqueda avanzada |
| `name` | `string` | Regex por nombre del grupo |
| `used` | `number` | Filtrar por total de cupones usados |
| `date_from` | `string` | Filtrar `date_created >= fecha` (`YYYY-MM-DD`) |
| `date_to` | `string` | Filtrar `date_created <= fecha` (`YYYY-MM-DD`) |

**Query Parameters — Control de respuesta:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `count` | `"true"` | Retorna solo el conteo: `{ status, count }` |
| `format` | `"csv"` | Descarga CSV con todos los cupones de los grupos encontrados |
| `sort` | `string` | Ordenamiento (default: `"-date_created"`) |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset de paginación |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5ef36e1fff35667f899df6be",
      "name": "Promo Verano 2024",
      "coupon_used_total": 15,
      "date_created": "2024-01-15T10:00:00Z"
    }
  ]
}
```

**CSV exportado incluye columnas:** `Group`, `Coupon`, `Detail`, `Creation Date`, `Available From`, `Available To`, `Discount`, `Used`, `Reusable`, `Valid`

---

### 2. Crear Grupo

```
POST /api/coupon-group
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `coupon_group_name` | `string` | **Sí** | Nombre del grupo (único por cuenta) |
| `coupon_group_gateway` | `string` | No (solo admin) | Gateway especial: `"incomm"` |

**Respuesta exitosa `200`:** Objeto `CouponGroup` creado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `200` | `"NAME_MUST_BE_UNIQUE"` | Ya existe un grupo con ese nombre |
| `200` | `"NAME_IS_REQUIRED"` | Falta `coupon_group_name` |

---

## Endpoints de Subgrupos (CouponSubgroup)

### 3. Listar Subgrupos de un Grupo

```
GET /api/coupon-group/{coupon_group_id}
```

Retorna los subgrupos (lotes) del grupo, enriquecidos con conteos de cupones.

**Query Parameters — Modo estándar:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `created_start_date` | `string` | Filtrar subgrupos creados desde (`YYYY-MM-DD`) |
| `created_end_date` | `string` | Filtrar subgrupos creados hasta (`YYYY-MM-DD`) |
| `available_start_date` | `string` | `valid_from >= fecha` |
| `available_end_date` | `string` | `valid_to <= fecha` |
| `name` | `string` | Regex por nombre del subgrupo |
| `detail` | `string` | Regex por descripción |
| `code` | `string` | Filtra subgrupos que contengan cupones con este código (regex) |
| `type_code` | `string` | Filtra subgrupos que contengan cupones con este type_code (regex) |

**Query Parameters — Modo búsqueda avanzada (`advanced_search=true`):**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `advanced_search` | `"true"` | Activa modo avanzado |
| `name` | `string` | Regex por nombre |
| `detail` | `string` | Regex por descripción |
| `date_from` | `string` | `date_created >= fecha` (`YYYY-MM-DD`) |
| `date_to` | `string` | `date_created <= fecha` (`YYYY-MM-DD`) |

**Query Parameters — Control:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `count` | `"true"` | Solo retorna `{ status, count }` |
| `format` | `"csv"` | Descarga CSV de cupones del grupo filtrado |
| `sort` | `string` | Default: `"-date_created"` |
| `limit` | `number` | Máx: 100, default: 100 |
| `skip` | `number` | Offset |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5ef26945ff35667f899df6b8",
      "name": "Lote Enero 2024",
      "group": "5ef36e1fff35667f899df6be",
      "detail": "Descuento 20%",
      "valid_from": "2024-01-01T00:00:00Z",
      "valid_to": "2024-03-31T23:59:59Z",
      "percent": 20,
      "total": 500,
      "valid_total": 485,
      "used_total": 15
    }
  ]
}
```

**CSV exportado incluye columnas:** `Group`, `Coupon`, `Detail`, `Creation Date`, `Created By`, `Available From`, `Available To`, `Type`, `Type Code`, `Discount`, `Payment Required`, `Used`, `Last Use Date`, `Reusable`, `Use Count`, `Valid`

---

### 4. Deshabilitar Cupones de un Grupo (Bulk)

```
POST /api/coupon-group/{coupon_group_id}/disable
Content-Type: application/json
```

Desactiva en batch todos los cupones del grupo que sean válidos y cuyo `valid_to` esté dentro del rango de fechas. La operación es **asíncrona** — la respuesta llega inmediatamente y el resultado final se notifica por WebSocket en el canal `/coupon_group/{id}/disable`.

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `date_start` | `string` | **Sí** | Inicio del rango de `valid_to` (ISO 8601) |
| `date_end` | `string` | **Sí** | Fin del rango de `valid_to` (ISO 8601) |

**Respuesta inmediata `200`:**

```json
{ "status": "OK", "data": { "message": "Processing coupons disable request" } }
```

**Notificación WebSocket** (`/coupon_group/{id}/disable`) al finalizar:

```json
// Éxito
{ "status": "success", "message": "Coupons disabled successfully", "total": 250 }
// Sin coincidencias
{ "status": "error", "message": "No coupons found to disable" }
// Error
{ "status": "error", "message": "<error message>" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"BOTH_DATE_START_AND_DATE_END_ARE_REQUIRED"` | Faltan fechas |
| `400` | `"INVALID_DATE_FORMAT_FOR_DATE_START"` | Formato inválido en `date_start` |
| `400` | `"INVALID_DATE_FORMAT_FOR_DATE_END"` | Formato inválido en `date_end` |

---

## Endpoints de Cupón (Coupon)

### 5. Listar Cupones

```
GET /api/coupon
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `code` | `string` | Regex por código del cupón |
| `detail` | `string` | Regex por descripción |
| `group` | `string` | Filtrar por ID de grupo |
| `subgroup` | `string` | Filtrar por ID de subgrupo |
| `created_start_date` | `string` | Creados desde esta fecha (ISO 8601) |
| `created_end_date` | `string` | Creados hasta esta fecha (ISO 8601) |
| `available_start_date` | `string` | `valid_from >= fecha` (ISO 8601) |
| `available_end_date` | `string` | `valid_to <= fecha` (ISO 8601) |
| `count` | `"true"` | Retorna `{ status, count, valid_count, used_count }` |
| `format` | `"csv"` | Descarga CSV |
| `sort` | `string` | Default: `"-date_created"` |
| `limit` | `number` | Máx: 100, default: 100 |
| `skip` | `number` | Offset |

**Respuesta con `count=true`:**

```json
{ "status": "OK", "count": 500, "valid_count": 480, "used_count": 20 }
```

**CSV exportado incluye columnas:** `Group`, `Coupon`, `Detail`, `Creation Date`, `Created By`, `Available From`, `Available To`, `Type`, `Type Code`, `Discount`, `Payment Required`, `Used`, `Last Use Date`, `Reusable`, `Use Count`, `Valid`

---

### 6. Crear Cupones

```
POST /api/coupon
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Crea uno o más cupones en un nuevo subgrupo dentro de un grupo existente.

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `group` | `string` | **Sí** | ID del CouponGroup destino |
| `name` | `string` | No | Nombre del subgrupo (auto-generado si se omite) |
| `detail` | `string` | No | Descripción del cupón |
| `is_reusable` | `boolean` | No | Si el cupón es reutilizable (default: `false`) |
| `custom_code` | `string` | Req. si `is_reusable=true` | Código personalizado. Solo si `is_reusable=true`. Solo alfanumérico + `_-` |
| `quantity` | `number` | No | Cantidad de cupones a generar: 1–999999 (default: `1`). Ignorado si `is_reusable=true` |
| `valid_from` | `string` | No | Fecha de inicio de validez (ISO 8601) |
| `valid_to` | `string` | No | Fecha de fin de validez (ISO 8601) |
| `is_valid` | `boolean` | No | Si los cupones son válidos al crear (default: `true`) |
| `payment_required` | `boolean` | No | Si requiere pago (default: `false`) |
| `type` | `string` | No | Tipo del cupón, ej: `"subscription"` |
| `type_code` | `string` | No | Código del tipo (requiere `type`) |
| `discount_type` | `"percent"\|"days"\|"validity_date"\|"amount"` | No | Tipo de descuento (determina qué campo aplicar) |
| `percent` | `number` | Si `discount_type=percent` | Porcentaje de descuento (1–100) |
| `days` | `number` | Si `discount_type=days` + `type=subscription` | Días de extensión de suscripción |
| `validity_date` | `string` | Si `discount_type=validity_date` + `type=subscription` | Fecha de vencimiento extendida (ISO 8601) |
| `amount` | `number` | Si `discount_type=amount` | Monto fijo de descuento |
| `max_use` | `number` | No (solo si `is_reusable=true`) | Máximo de usos totales del cupón |
| `customer_max_use` | `number` | No (solo si `is_reusable=true`) | Máximo de usos por cliente |
| `metadata` | `object` | No | Datos personalizados arbitrarios |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    { "code": "AB3-DE5-FG7-HIJ", "_id": "5ef26945ff35667f899df6b8" },
    { "code": "KL2-MN8-OP4-QRS", "_id": "5ef26946ff35667f899df6c0" }
  ]
}
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `200` | `"COUPON_FORMAT_ERROR"` | `custom_code` contiene caracteres inválidos |
| `200` | `"COUPON_QUANTITY_ERROR"` | `quantity` inválida |
| `200` | `"COUPON_CODE_ERROR"` | `is_reusable=true` pero sin `custom_code` |
| `200` | `"COUPON_PERCENT_ERROR"` | `percent` fuera de rango 1–100 |
| `400` | `"COUPON_CODE_ALREADY_EXISTS"` | El `custom_code` ya existe para la cuenta |
| `400` | `"INCOMM_COUPON_CANNOT_BE_REUSABLE"` | Grupo incomm no admite reusable |
| `400` | `"INCOMM_COUPON_CANNOT_BE_VALID"` | Grupo incomm no admite `is_valid=true` |
| `400` | `"INCOMM_COUPON_CANNOT_REQUIRED_PAYMENT"` | Grupo incomm no admite `payment_required` |
| `400` | `"INCOMM_COUPON_DISCOUNT_TYPE_MUST_BE_PERCENT"` | Grupo incomm solo admite `discount_type=percent` |
| `400` | `"INCOMM_COUPON_PERCENT_MUST_BE_100"` | Grupo incomm requiere `percent=100` |
| `500` | `"COULD_NOT_GENERATE_COUPONS"` | Error interno al generar |

> **Nota sobre la generación asíncrona:** Al usar desde la UI (no API), la respuesta inmediata es `{ "status": "OK", "data": "The coupons are being generated..." }` y el progreso se envía por WebSocket en `/coupon_group/{group_id}/generate_progress`.

---

### 7. Obtener Cupón por ID

```
GET /api/coupon/{coupon_id}
```

Si el cupón fue usado y no es reusable, incluye el campo `customer` con el email del cliente que lo usó.

Si el grupo es de tipo `incomm` y el cupón no fue usado, valida el código en tiempo real contra el servicio Incomm.

**Respuesta exitosa `200`:** Objeto `Coupon` completo (con `group` y `created_by` populados).

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"COUPON_NOT_FOUND"` | Cupón no existe |

---

### 8. Buscar Cupón por Código

```
GET /api/coupon/{coupon_code}/search
```

Mismo handler que el detalle por ID, pero busca por `code` en lugar de `_id`.

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `watching` | cualquier valor | Si se envía, omite la verificación de uso y devuelve directamente |

**Respuesta exitosa `200`:** Objeto `Coupon` completo.

---

### 9. Actualizar Cupón

```
POST /api/coupon/{coupon_id}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters (todos opcionales):**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `detail` | `string` | Descripción |
| `valid_from` | `string` | Nueva fecha de inicio (ISO 8601) |
| `valid_to` | `string` | Nueva fecha de fin (ISO 8601) |
| `is_valid` | `boolean\|"true"\|"1"` | Activar/desactivar cupón |
| `type` | `string` | Tipo del cupón |
| `type_code` | `string` | Código del tipo |
| `days` | `number` | Días de extensión |
| `validity_date` | `string` | Fecha de vencimiento extendida |
| `percent` | `number` | Porcentaje de descuento |
| `amount` | `number` | Monto de descuento |
| `group` | `string` | Reasignar a otro grupo |
| `payment_required` | `boolean` | Requiere pago |
| `max_use` | `number` | Máximo de usos totales (solo si `is_reusable=true`) |
| `customer_max_use` | `number` | Máximo de usos por cliente (solo si `is_reusable=true`) |
| `metadata` | `object` | Datos personalizados. Pasar `null` como valor para eliminar una clave: `{ "clave": null }` |

**Respuesta exitosa `200`:** Objeto `Coupon` actualizado.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Cupón no existe |
| `500` | `"DB_ERROR"` | Error al guardar |

---

### 10. Eliminar Cupón

```
DELETE /api/coupon/{coupon_id}
```

Solo se puede eliminar un cupón que **no haya sido usado** (`is_used=false`).

**Respuesta exitosa `200`:**

```json
{ "status": "OK" }
```

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Cupón no existe |
| `412` | `"COUPON_IS_USED"` | El cupón ya fue usado, no puede eliminarse |
| `500` | `"DB_ERROR"` | Error al eliminar |

---

## Resumen de Endpoints

### Grupos

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/coupon-group` | Listar grupos | read |
| `POST` | `/api/coupon-group` | Crear grupo | write |
| `GET` | `/api/coupon-group/{id}` | Listar subgrupos del grupo | read |
| `POST` | `/api/coupon-group/{id}/disable` | Deshabilitar cupones en bulk | write |

### Cupones

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/coupon` | Listar cupones | read |
| `POST` | `/api/coupon` | Crear cupones (lote) | write |
| `GET` | `/api/coupon/{coupon_id}` | Obtener cupón por ID | read |
| `GET` | `/api/coupon/{coupon_code}/search` | Buscar cupón por código | read |
| `POST` | `/api/coupon/{coupon_id}` | Actualizar cupón | write |
| `DELETE` | `/api/coupon/{coupon_id}` | Eliminar cupón | delete |

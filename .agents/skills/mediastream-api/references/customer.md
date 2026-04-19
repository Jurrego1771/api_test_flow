# Referencia de Endpoint: Customer (Clientes)

**Base path:** `/api/customer`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST

---

## Modelo de Datos (Customer)

```ts
Customer {
  _id:             string      // ObjectID — solo lectura
  account:         string      // ObjectID de la cuenta — solo lectura
  correlative_id:  number      // ID correlativo incremental — solo lectura (alias: `cid`)
  email:           string      // Email (único por cuenta) — requerido
  first_name:      string      // Nombre — requerido
  last_name:       string      // Apellido — requerido
  status:          "ACTIVE"|"INACTIVE"  // Estado del cliente
  gender:          "MALE"|"FEMALE"|"OTHER"|null
  birthday:        string|null // Fecha de nacimiento (YYYY-MM-DD)
  phone:           string|null
  origin:          string|null
  photo:           string|null
  integrator:      string|null // ID del integrador
  obsolete:        boolean     // Solo lectura — true si fue eliminado lógicamente

  address: {
    address_line1: string
    address_line2: string
    address_city:  string
    address_state: string
    address_country: string
  }

  social: {
    facebook: { id: string, username: string }
    google:   { id: string, username: string }
    twitter:  { id: string, username: string }
  }

  external: Array<{
    user:     string
    type:     string
    _code:    string
    metadata: string
  }>

  metadata:         string     // Datos personalizados
  sale:             object[]   // Suscripciones activas — solo lectura
  distributors:     string[]   // IDs de distribuidores asignados
  payment_count:    number     // Total de pagos — solo lectura
  purchase_count:   number     // Total de compras — solo lectura
  has_active_purchase: boolean // Si tiene compra activa — solo lectura
  should_log_login: boolean    // Si se debe registrar el login
  preferences: {
    genres:  string[]
    related: string[]
    show:    string[]
  }
  date_created:     string     // ISO 8601 — solo lectura
}
```

---

## Endpoints

### 1. Buscar Clientes

```
GET /api/customer
```

**Query Parameters:**

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `id` | `string` | Filtrar por ObjectID |
| `email` | `string` | Filtrar por email |
| `first_name` | `string` | Filtrar por nombre |
| `last_name` | `string` | Filtrar por apellido |
| `birthday` | `string` | Filtrar por fecha de nacimiento (`YYYY-MM-DD`) |
| `gender` | `"MALE"\|"FEMALE"\|"OTHER"` | Filtrar por género |
| `phone` | `string` | Filtrar por teléfono |
| `country` | `string` | Filtrar por país |
| `distributor` | `string` | Filtrar por ID de distribuidor |
| `correlative_id` | `string` | Filtrar por ID correlativo |
| `start` | `date` | Fecha de inicio de creación |
| `end` | `date` | Fecha de fin de creación |
| `format` | `string` | Si `"csv"`, descarga el resultado en CSV |
| `advanced_search` | `boolean` | Activa modo de búsqueda avanzada |
| `social[facebook][id]` | `string` | Filtrar por Facebook ID |
| `social[facebook][username]` | `string` | Filtrar por Facebook username |
| `social[google][id]` | `string` | Filtrar por Google ID |
| `social[google][username]` | `string` | Filtrar por Google username |
| `social[twitter][id]` | `string` | Filtrar por Twitter ID |
| `social[twitter][username]` | `string` | Filtrar por Twitter username |
| `external[type]` | `string` | Filtrar por tipo externo |
| `external[user]` | `string` | Filtrar por usuario externo |
| `external[_code]` | `string` | Filtrar por código externo |
| `sort` | `string` | Ordenamiento (default: `"-date_created"`) |
| `limit` | `number` | Máximo de resultados (máx: 100, default: 100) |
| `skip` | `number` | Offset (default: 0) |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5ef3b12c75edefb4fc377483",
      "correlative_id": 2,
      "cid": 2,
      "email": "foo@barbaz.com",
      "first_name": "Foo",
      "last_name": "BarBaz",
      "status": "ACTIVE",
      "payment_count": 0,
      "purchase_count": 0,
      "has_active_purchase": false,
      "date_created": "2020-06-24T20:01:48.532Z",
      "social": { "facebook": { "username": "my-facebook-username", "id": "my-facebook-id" } }
    }
  ]
}
```

---

### 2. Crear Cliente

```
POST /api/customer
Content-Type: application/json  |  application/x-www-form-urlencoded
```

**Body Parameters:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `email` | `string` | **Sí** | Email único del cliente |
| `password` | `string` | **Sí** | Contraseña |
| `first_name` | `string` | **Sí** | Nombre |
| `last_name` | `string` | **Sí** | Apellido |
| `gender` | `"MALE"\|"FEMALE"\|"OTHER"` | No | Género |
| `birthday` | `date` | No | Fecha de nacimiento |
| `phone` | `string` | No | Teléfono |
| `origin` | `string` | No | Origen del registro |
| `address` | `object` | No | Dirección (`address_line1`, `address_city`, `address_country`, etc.) |
| `social` | `object` | No | Redes sociales: `{ facebook: { id, username }, google: {...}, twitter: {...} }` |
| `external` | `object[]` | No | `[{ user, type, _code, metadata }]` |
| `metadata` | `string` | No | Datos personalizados |
| `photo` | `string` | No | URL de foto |
| `integrator` | `string` | No | ID del integrador |

**Respuesta exitosa `200`:** Objeto `Customer` completo.

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `400` | `"INVALID_PASSWORD"` | Contraseña no cumple los requisitos |
| `400` | `"EMAIL_ALREADY_REGISTERED"` | Email ya existe en la cuenta |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

### 3. Actualizar Cliente

```
POST /api/customer/{customerId}
Content-Type: application/json  |  application/x-www-form-urlencoded
```

Mismos campos que Crear. Todos opcionales. Además:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `status` | `"ACTIVE"\|"INACTIVE"` | Cambiar estado del cliente |

**Errores:**

| HTTP | `data` | Causa |
|------|--------|-------|
| `404` | `"NOT_FOUND"` | Cliente no existe |
| `500` | `"DB_ERROR"` | Error de base de datos |

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/customer` | Buscar clientes | read |
| `POST` | `/api/customer` | Crear cliente | write |
| `POST` | `/api/customer/{id}` | Actualizar cliente | read+write |

---

## Notas Importantes

- No existe endpoint de **DELETE** para clientes — se desactivan con `status: "INACTIVE"`
- No existe endpoint de **GET /{id}** individual — usar búsqueda con parámetro `id`
- La contraseña no se retorna en ninguna respuesta
- `correlative_id` es un número incremental por cuenta (también disponible como `cid`)
- El campo `obsolete: true` indica cliente eliminado lógicamente (no accesible normalmente)
- `format: "csv"` genera una descarga CSV en lugar de JSON

---

## Edge Cases y Casos de Prueba Sugeridos

| Escenario | Esperado |
|-----------|----------|
| Crear con email duplicado | `400` con `EMAIL_ALREADY_REGISTERED` |
| Crear sin `email` o `password` | Error de validación (campos requeridos) |
| Buscar por `social[facebook][id]` | Retorna clientes con ese Facebook ID |
| Actualizar `status` a `"INACTIVE"` | Cliente desactivado pero no eliminado |
| Crear con password débil | `400` con `INVALID_PASSWORD` |

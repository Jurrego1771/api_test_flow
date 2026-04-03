# Referencia de Endpoint: Settings — Access Restrictions (Reglas de Acceso Avanzadas)

**Base path:** `/api/settings/advanced-access-restrictions`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET
**Nota:** Las operaciones de escritura (POST/DELETE) requieren autenticación por sesión de navegador (no disponibles por API token estándar).

---

## Modelo de Datos (AccessRestriction)

```ts
AccessRestriction {
  _id:                    string      // ObjectID — solo lectura
  name:                   string      // Nombre de la regla
  account:                string      // ObjectID de la cuenta — solo lectura
  is_default:             boolean     // Si es la regla por defecto
  default_type:           "media"|"event"  // Tipo por defecto
  categories:             object[]|null    // Categorías asociadas
  apply_to_sub_categories: boolean    // Si aplica a sub-categorías (default: true)
  date_created:           string      // ISO 8601 — solo lectura

  closed_access: {
    enabled: boolean    // default: false
    allow:   boolean    // default: false
  }

  aes: {
    enabled: boolean    // AES-128 encryption — default: false
    allow:   boolean    // default: false
  }

  drm: {
    enabled:             boolean   // DRM habilitado — default: false
    allow:               boolean   // default: false
    allow_incompatible:  boolean   // Permitir dispositivos incompatibles — default: false
  }

  access_rules: Array<AccessRuleItem>
  __v: number
}

AccessRuleItem {
  _id:               string
  context:           string    // Contexto de aplicación (ej: "*" = todos)
  access:            boolean   // Permite acceso (default: true)
  type:              string    // Tipo de regla
  exclusive:         boolean   // Exclusiva (default: false)
  client_validation: boolean   // Validación en el cliente (default: false)
  allow_unknown:     boolean   // Permitir IPs/agentes desconocidos (default: true)
  rules:             string[]  // Reglas específicas
}
```

---

## Endpoints

### 1. Listar Reglas de Acceso

```
GET /api/settings/advanced-access-restrictions
```

Sin parámetros de query. Retorna todas las reglas de acceso de la cuenta.

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": [
    {
      "_id": "5d80dbed2b46365379c0ecf5",
      "name": "cellular network",
      "account": "5bd3720e9a2d860c55c8b766",
      "categories": null,
      "apply_to_sub_categories": true,
      "date_created": "2019-09-17T13:13:02.911Z",
      "is_default": true,
      "default_type": "media",
      "access_rules": [
        {
          "_id": "5d80dbed2b46365379c0ecf7",
          "access": true,
          "exclusive": false,
          "client_validation": false,
          "allow_unknown": true,
          "rules": [],
          "context": "*"
        }
      ],
      "closed_access": { "enabled": false, "allow": true },
      "aes": { "enabled": false, "allow": true },
      "drm": { "enabled": false, "allow": false, "allow_incompatible": true },
      "__v": 8
    }
  ]
}
```

---

### 2. Obtener Regla de Acceso por ID

```
GET /api/settings/advanced-access-restrictions/{accessRestrictionId}
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `accessRestrictionId` | `string` | Sí | ObjectID de la regla de acceso |

> **Nota:** El parámetro `accessRestrictionId` se pasa como **query param** aunque la URL tenga `{accessRestrictionId}` en el path. Verificar el comportamiento real del endpoint.

**Respuesta exitosa `200`:** Objeto `AccessRestriction` completo.

---

## Uso en otros módulos

Las reglas de acceso avanzadas se referencian en Media y Live Stream mediante:

```json
{
  "access_restrictions": {
    "enabled": true,
    "rule": "5d80dbed2b46365379c0ecf5"
  }
}
```

Al crear/actualizar un Media o LiveStream se usan los campos:
- `access_restrictions_enabled: boolean` — habilitar regla
- `access_restrictions: string|"null"` — ID de la regla

---

## Relación con Tests

El módulo de tests `tests/access_restriction/` (`TC_AR_XXX`) cubre:
- `GET /api/settings/advanced-access-restrictions` — listar reglas
- `GET /api/settings/advanced-access-restrictions/{id}` — obtener por ID
- Casos de autenticación: sin token → `401`/`403`

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/settings/advanced-access-restrictions` | Listar reglas de acceso | read |
| `GET` | `/api/settings/advanced-access-restrictions/{id}` | Obtener regla por ID | read |

---

## Notas de Implementación

- El Swagger documenta la ruta como `advanced-access-restrictions` pero el test y el CLAUDE.md lo llaman `access-restrictions` — verificar la URL exacta en cada llamada.
- Las operaciones de escritura (crear/editar/eliminar reglas) no están documentadas en el Swagger por API token — probablemente requieren sesión de usuario admin.
- El campo `context: "*"` en `access_rules` significa que la regla aplica a todos los contextos.
- `aes.enabled=true` requiere que el módulo AES-128 esté habilitado en la cuenta.
- `drm.enabled=true` requiere que el módulo DRM esté habilitado en la cuenta.

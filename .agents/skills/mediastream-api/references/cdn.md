# Referencia de Endpoint: CDN (Gestión de CDN Personalizado)

**Base path:** `/api/cdn`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read` para GET · `write` para POST · `delete` para DELETE
**Módulo requerido:** CDN personalizado habilitado en la cuenta

---

## Descripción General

El módulo CDN de Mediastream permite gestionar **distribuciones CDN personalizadas** con soporte de:
- Múltiples orígenes (origin upstreams) con failover
- Grupos de orígenes (origin groups) para balanceo y redundancia
- Reglas de path con cache TTL y control de query strings
- Certificados SSL personalizados

---

## Modelo de Datos

```ts
CDNDistribution {
  _id:    string      // ID de la distribución — solo lectura
  name:   string      // Nombre (requerido)
  active: boolean     // Estado activo/inactivo
  url:    string      // Host CDN personalizado para DNS Resolving

  cert: string        // ID del Certificado SSL

  origin: Array<{
    _id:      string   // ID del upstream (auto-generado)
    host:     string   // Host del origin (requerido)
    port:     number   // Puerto del origin (requerido)
    path:     string   // Base path del origin
    resolver: string   // Resolver DNS personalizado (ej: "8.8.8.8")
    headers: Array<{
      header: string   // Nombre del header (requerido)
      value:  string   // Valor del header
    }>
  }>                   // Mínimo 1 origin

  origin_group: Array<{  // Máximo 10 grupos
    _id:      string
    name:     string     // Nombre del grupo (requerido)
    origin:   string[]   // IDs de origins agrupados (requerido)
    failover: (500|504|502|503|404|403)[]  // Códigos HTTP para failover
  }>

  request_path: Array<{
    pattern: string    // Regex del path a matchear (requerido), ej: "/.*"
    origin:  string    // ID del origin o origin_group destino (requerido)
    cache: {
      ttl: number      // Cache TTL en segundos
    }
    qs: {
      cache:     boolean   // Incluir query strings en la cache key
      forward:   boolean   // Reenviar query strings al origin
      whitelist: string    // Lista de QS keys (separadas por coma) para cache
    }
  }>
}

CDNCertificate {
  _id:   string      // ID del certificado — solo lectura
  name:  string      // Nombre del certificado (requerido)
  key:   string      // SSL Key (PEM)
  crt:   string      // SSL Certificate (PEM)
  chain: string      // SSL Chain (PEM)
}
```

---

## Endpoints de Distribuciones

```
GET    /api/cdn/distribution          → Listar distribuciones
POST   /api/cdn/distribution          → Crear distribución
GET    /api/cdn/distribution/{id}     → Obtener distribución
POST   /api/cdn/distribution/{id}     → Actualizar distribución
DELETE /api/cdn/distribution/{id}     → Eliminar distribución
```

---

## Endpoints de Certificados SSL

```
GET    /api/cdn/certificate          → Listar certificados
POST   /api/cdn/certificate          → Crear certificado
GET    /api/cdn/certificate/{id}     → Obtener certificado
POST   /api/cdn/certificate/{id}     → Actualizar certificado
DELETE /api/cdn/certificate/{id}     → Eliminar certificado
```

---

## Notas de Implementación

- Las distribuciones CDN se usan principalmente con el campo `third_party_cdn_url` en Media
- El `url` de la distribución debe apuntar al CNAME configurado en el DNS del cliente
- `request_path` con `pattern: "/.*"` cubre todas las rutas (catch-all)
- Los `failover` codes permiten redirigir automáticamente al siguiente origin si el actual falla
- Los certificados SSL se asocian a la distribución mediante el campo `cert`

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `GET` | `/api/cdn/distribution` | Listar distribuciones | read |
| `POST` | `/api/cdn/distribution` | Crear distribución | write |
| `GET` | `/api/cdn/distribution/{id}` | Obtener distribución | read |
| `POST` | `/api/cdn/distribution/{id}` | Actualizar distribución | write |
| `DELETE` | `/api/cdn/distribution/{id}` | Eliminar distribución | delete |
| `GET` | `/api/cdn/certificate` | Listar certificados SSL | read |
| `POST` | `/api/cdn/certificate` | Crear certificado SSL | write |
| `GET` | `/api/cdn/certificate/{id}` | Obtener certificado | read |
| `POST` | `/api/cdn/certificate/{id}` | Actualizar certificado | write |
| `DELETE` | `/api/cdn/certificate/{id}` | Eliminar certificado | delete |

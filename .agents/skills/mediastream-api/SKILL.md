---
name: mediastream-api
description: This skill should be used when the user asks about the Mediastream Platform API, wants to consume or test any API endpoint, asks how to use endpoints like category, media, live-stream, ads, playlist, channel, customer, image, article, or any other Mediastream module. Also activates when the user mentions "API de mediastream", "endpoint", "token API", or asks how to make requests to the platform.
version: 1.0.0
---

# Mediastream Platform API

Skill de referencia para consumir la API REST de la Plataforma Mediastream de forma eficiente y correcta.

## Base URL

```
https://platform.mediastre.am
```

## Autenticación

Todo request debe incluir un token de autorización mediante **uno** de estos métodos:

| Método | Ejemplo |
|--------|---------|
| Query param | `GET /api/category?token=<API_TOKEN>` |
| Header HTTP | `X-API-Token: <API_TOKEN>` |

- Tokens con permiso **read** → operaciones `GET`
- Tokens con permiso **read+write** → operaciones `POST` y `DELETE`
- Los tokens tienen fecha de expiración; verificar vigencia antes de usar
- Se obtienen en la plataforma bajo **Settings > API & Tokens**

## Formato de Respuesta Universal

Todas las respuestas retornan JSON con esta estructura:

```json
{
  "status": "OK",   // "OK" = éxito | "ERROR" = fallo
  "data": ...       // String | Number | Array | Object | null
}
```

## Códigos HTTP

| Código | Significado |
|--------|-------------|
| `200` | Operación exitosa |
| `400` | Bad Request — parámetros inválidos o faltantes |
| `401` | Unauthorized — token expirado o sin permisos |
| `404` | Not Found — recurso no existe |
| `500` | Internal Server Error — error de servidor/BD |

## Módulos Disponibles

Cada módulo tiene su archivo de referencia detallado en `references/`:

| Módulo | Ruta Base | Referencia |
|--------|-----------|------------|
| Category | `/api/category` | [category.md](references/category.md) |
| Media | `/api/media` | [media.md](references/media.md) |
| Live Stream | `/api/live-stream` | [live-stream.md](references/live-stream.md) |
| Playlist | `/api/playlist` | [playlist.md](references/playlist.md) |
| Ads | `/api/ad` | [ads.md](references/ads.md) |
| Channel | `/api/channel` | [channel.md](references/channel.md) |
| Customer | `/api/customer` | [customer.md](references/customer.md) |
| Image | `/api/image` | [image.md](references/image.md) |
| Article | `/api/article` | [article.md](references/article.md) |
| Access Token | `/api/auth` | [access-token.md](references/access-token.md) |
| Lookup | `/api/lookup` | [lookup.md](references/lookup.md) |
| Show / Season / Episode | `/api/show` | [show.md](references/show.md) |
| CDN | `/api/cdn` | [cdn.md](references/cdn.md) |
| Sale / Reseller | `/api/sale` | [sale.md](references/sale.md) |
| Settings | `/api/settings` | [settings.md](references/settings.md) |
| Customer Coupon | `/api/coupon` | [customer-coupon.md](references/customer-coupon.md) |
| Machine Learning | `/api/machine-learning` | [machine-learning.md](references/machine-learning.md) |

## Patrones CRUD Estándar

La API sigue convenciones REST consistentes:

```
GET    /api/{module}          → Listar / buscar recursos
GET    /api/{module}/{id}     → Obtener un recurso específico
POST   /api/{module}          → Crear recurso  (o /api/{module}/new)
POST   /api/{module}/{id}     → Actualizar recurso
DELETE /api/{module}/{id}     → Eliminar recurso
```

### Sub-recursos anidados

```
POST   /api/{module}/{id}/{sub-resource}           → Crear/actualizar sub-recurso
DELETE /api/{module}/{id}/{sub-resource}           → Eliminar sub-recurso
GET    /api/{module}/{id}/{sub-resource}/{sub_id}  → Obtener sub-recurso específico
```

## Instrucciones para el Agente

1. **Leer el archivo de referencia del módulo** antes de construir cualquier request
2. **Verificar el token** — preguntar al usuario si no está disponible en contexto
3. **Usar el header** `X-API-Token` en preferencia al query param (más seguro)
4. **Validar parámetros requeridos** según la referencia del endpoint antes de hacer el call
5. **Interpretar la respuesta** usando el campo `status` para determinar éxito/error
6. Al encontrar `"status": "ERROR"`, reportar el valor de `data` al usuario como código de error

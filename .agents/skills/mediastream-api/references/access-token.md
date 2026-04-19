# Referencia de Endpoint: Access Token (Closed Access)

**Base path:** `/api/access`
**Autenticación requerida:** Sí (`X-API-Token` o `?token=`)
**Permisos mínimos:** `read`
**Módulo requerido:** Closed Access habilitado en el Media o Live Stream

---

## ¿Qué es un Access Token?

Un Access Token es un token de un solo uso que se requiere para reproducir un Media o Live Stream que tiene **Closed Access** habilitado. 

Propiedades clave:
- Solo puede usarse **una vez** (cada reproducción requiere un token nuevo)
- Debe usarse dentro de los **30 minutos** siguientes a su emisión
- Expira automáticamente después de **6 horas** de su emisión

---

## Endpoint

### Emitir Access Token

```
POST /api/access/issue
```

**Query Parameters:**

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `id` | `string` | **Sí** | ID del Media o Live Stream |
| `type` | `"media"\|"live"` | **Sí** | Tipo de contenido |
| `ip` | `string` | No | Si se provee, la reproducción solo ocurrirá si la IP pública del usuario coincide con este valor |
| `user_agent` | `string` | No | Si se provee, la reproducción solo ocurrirá si el user agent del usuario coincide con este valor |
| `time_limit` | `number` | No | Si se provee, la reproducción estará permitida solo durante `time_limit` segundos después de la emisión del token |
| `encrypted` | `boolean` | No | **(Solo VOD)** Si se provee, la reproducción usará encriptación AES-128. Solo disponible para HLS con Mediastream CDN |
| `validation_lock` | `number` | No | Cuando se valida el token, múltiples solicitudes que lleguen dentro de `validation_lock` segundos desde la última validación no contarán hacia el límite de usos `max_use` |
| `max_profile` | `string` | No | Si se provee, la reproducción solo podrá cambiar rendiciones hasta este perfil (ej: `"720p"`) |
| `start` | `string` | No | **(Solo DVR)** Inicio del manifest time-shifted. Formato ISO 8601: `"2022-02-02T22:34:19.851Z"` |
| `end` | `string` | No | **(Solo DVR)** Fin del manifest time-shifted. Formato ISO 8601 |

**Respuesta exitosa `200`:**

```json
{
  "status": "OK",
  "data": "XfD5xl27myDE7z4NaFSllHKZr3FX5fgb7umNgSxdxHc33Y9ACcF935lxzc1voIIUWGDuXIYfHPp"
}
```

El campo `data` contiene el Access Token como string.

---

## Uso del Access Token

### En Embed (iframe)

```html
<iframe src="https://mdstrm.com/embed/502de05313c18fea0800009a?access_token=XfD5xl27..."></iframe>
```

### En URL de Playlist/Video

```
http://mdstrm.com/video/502de05313c18fea0800009a.m3u8?access_token=XfD5xl27...
```

---

## Flujo de Uso

```
1. Backend emite token: POST /api/access/issue?id={media_id}&type=media
2. Backend entrega token al frontend
3. Frontend incluye token en la URL del embed o en el player
4. CDN valida el token en cada solicitud de reproducción
5. Token se invalida después del primer uso exitoso
```

---

## Resumen de Endpoints

| Método | Path | Acción | Permiso |
|--------|------|--------|---------|
| `POST` | `/api/access/issue` | Emitir access token | read |

---

## Edge Cases y Casos de Prueba Sugeridos

| Escenario | Esperado |
|-----------|----------|
| Emitir token para media con Closed Access deshabilitado | Verificar comportamiento |
| Usar token más de una vez | Reproducción rechazada en el 2do uso |
| Token expirado (> 30 min sin usar) | Reproducción rechazada |
| `ip` con IP incorrecta del usuario | Reproducción rechazada |
| `time_limit` = 60 e intentar reproducir a los 61 seg | Reproducción rechazada |
| Token para Live Stream con `type=media` | Error o comportamiento inesperado |
| `encrypted=true` para Live Stream | Ignorado (solo VOD) |

---

## Relación con otros módulos

- **Media**: campo `access_restrictions.enabled` + `access_restrictions.rule` habilita reglas avanzadas. Para Closed Access simple, usar `access_rules.closed_access.enabled = true`
- **Live Stream**: mismo mecanismo con `closed_access: true`
- **Playlist**: campo `access_tokens[]` permite dar acceso a usuarios específicos por email

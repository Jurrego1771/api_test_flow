# API Endpoints Principales (Parent Endpoints)

## Endpoints Padre Documentados en Swagger

### Gestión de Contenido
- `/api/media` - Gestión de archivos multimedia
- `/api/live-stream` - Gestión de streams en vivo
- `/api/playlist` - Gestión de listas de reproducción
- `/api/category` - Gestión de categorías
- `/api/show` - Gestión de shows/series
- `/api/channel` - Gestión de canales
- `/api/image` - Gestión de imágenes
- `/api/article` - Gestión de artículos

### Gestión de Usuarios y Clientes
- `/api/customer` - Gestión de clientes
- `/api/user` - Gestión de usuarios internos
- `/api/device` - Gestión de dispositivos

### Publicidad y Monetización
- `/api/ad` - Gestión de anuncios
- `/api/coupon` - Gestión de cupones

### Acceso y Seguridad
- `/api/access` - Gestión de tokens de acceso
- `/api/auth` - Autenticación

### Ventas y Distribución
- `/api/sale` - Gestión de ventas (resellers)
- `/api/reseller` - Gestión de revendedores

### Configuración y Administración
- `/api/settings` - Configuración de la plataforma
- `/api/admin` - Administración del sistema
- `/api/cdn` - Gestión de CDN

### Analíticas y Reportes
- `/api/analytics` - Analíticas y métricas
- `/api/audit` - Auditoría del sistema

### Integraciones y Servicios
- `/api/integrators` - Gestión de integraciones
- `/api/webhooks` - Webhooks de terceros
- `/api/share` - Compartir contenido

### Herramientas y Utilidades
- `/api/lookup` - Catálogos y referencias
- `/api/autocomplete` - Autocompletado
- `/api/upload` - Subida de archivos
- `/api/sms` - Servicio de mensajería

### Transcodificación y Procesamiento
- `/api/encoder` - Gestión de encoders
- `/api/editor` - Herramientas de edición
- `/api/transcode` - Transcodificación

### Live Editor y Producción
- `/api/live-editor` - Editor de live streams
- `/api/dvr` - Digital Video Recording
- `/api/playout` - Programación de contenido

### Tokens y Sesiones
- `/api/token` - Gestión de tokens
- `/api/customer/session` - Sesiones de clientes

### Facturación y Pagos
- `/api/payment` - Procesamiento de pagos
- `/api/purchase` - Gestión de compras

### Metadatos y Clasificación
- `/api/metadata` - Gestión de metadatos
- `/api/custom-attribute` - Atributos personalizados

### Servicios Especializados
- `/api/server` - Información del servidor
- `/api/webdav` - WebDAV
- `/api/bulk` - Operaciones masivas

---

## Endpoints 

### Sistema y Monitoreo
- `/api/-/analytics` - Analíticas internas del sistema
- `/api/-/media` - Operaciones internas de media
- `/api/-/live-stream` - Operaciones internas de live streams
- `/api/-/account` - Operaciones internas de cuentas
- `/api/-/customer` - Operaciones internas de clientes
- `/api/-/schedule` - Operaciones internas de programación
- `/api/-/audit` - Auditoría interna
- `/api/-/lookup` - Lookups internos
- `/api/-/payment` - Pagos internos
- `/api/-/transcoding` - Transcodificación interna
- `/api/-/routing-rules` - Reglas de enrutamiento
- `/api/-/migration` - Migraciones
- `/api/-/vms` - VMS (Video Management System)

### Herramientas de Desarrollo
- `/api/sms-token` - Tokens para SMS
- `/api/device-detector` - Detección de dispositivos
- `/api/marker` - Marcadores (OPTA)
- `/api/onboarding` - Onboarding de usuarios

### Configuraciones Avanzadas
- `/api/settings/ai` - Configuración de IA
- `/api/settings/moai` - Configuración MoAI
- `/api/settings/social` - Configuración social
- `/api/settings/opta` - Configuración OPTA
- `/api/settings/epg-mask` - Máscaras EPG
- `/api/settings/migration` - Migraciones
- `/api/settings/watchfolder` - Watch folders
- `/api/settings/product` - Productos
- `/api/settings/quiz` - Quizzes
- `/api/settings/webhooks` - Webhooks
- `/api/settings/custom-attribute` - Atributos personalizados
- `/api/settings/access-restrictions` - Restricciones de acceso

### Webhooks de Terceros
- `/api/webhooks/stripe` - Webhooks Stripe
- `/api/webhooks/kushki` - Webhooks Kushki
- `/api/webhooks/mercadopago` - Webhooks MercadoPago
- `/api/webhooks/google` - Webhooks Google
- `/api/webhooks/applepay` - Webhooks Apple Pay
- `/api/webhooks/tiaxa` - Webhooks Tiaxa
- `/api/webhooks/paypal` - Webhooks PayPal
- `/api/webhooks/cielo` - Webhooks Cielo
- `/api/webhooks/ventipay` - Webhooks Ventipay
- `/api/webhooks/zoom` - Webhooks Zoom
- `/api/webhooks/ia` - Webhooks IA

---

## Total de Endpoints Padre Identificados: **~60**

### Documentados: ~25 (42%)
### Sin Documentar: ~35 (58%)

**Nota**: Esta lista incluye solo los endpoints principales (parent endpoints). Cada uno puede tener múltiples sub-endpoints con diferentes métodos HTTP (GET, POST, PUT, DELETE) y parámetros.

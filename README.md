# 🧪 API Test Flow - Automatización de Pruebas

Este proyecto automatiza las pruebas de una API utilizando Playwright, con integración completa con GitHub Actions y GitHub Pages para compartir los resultados.

## 📋 Características

- ✅ **Automatización completa** de pruebas de API
- 🔐 **Autenticación automática** con tokens API
- 📊 **Reportes HTML** generados automáticamente
- 🚀 **CI/CD** con GitHub Actions
- 📱 **GitHub Pages** para compartir resultados
- 🎯 **Tests parametrizados** y reutilizables

## 🛠️ Tecnologías

- **Playwright** - Framework de testing
- **Node.js** - Runtime de JavaScript
- **GitHub Actions** - CI/CD
- **GitHub Pages** - Hosting de reportes

## 🚀 Instalación

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/api_test_flow.git
   cd api_test_flow
   ```

2. **Instala las dependencias:**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env` con tus credenciales:
   ```env
   BASE_URL=https://tu-api.com
   API_TOKEN=tu-token-aqui
   ```

## 🧪 Ejecutar Pruebas

### Localmente
```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar solo casos críticos
npm run test:critical

# Ejecutar bugs conocidos en cuarentena
npm run test:known-bug

# Ejecutar casos en cuarentena
npm run test:quarantine

# Generar reporte HTML
npm run allure:generate
```

### En GitHub Actions
Las pruebas se ejecutan automáticamente en cada push y pull request.

Política del runner:
- la suite sigue ejecutándose aunque falle un caso
- los bugs conocidos se marcan con `test.fail()` o `test.fixme()`
- el reporte Allure se genera siempre
- la publicación en GitHub Pages se hace solo en `push`

## 📊 Ver Resultados

Los reportes de las pruebas están disponibles en:
- **GitHub Pages**: https://tu-usuario.github.io/api_test_flow/
- **Actions**: Ve a la pestaña "Actions" en GitHub

## 📁 Estructura del Proyecto

```
api_test_flow/
├── fixtures/                 # Configuración de Playwright
│   ├── authRequest.fixture.js
│   └── index.js
├── tests/                    # Pruebas organizadas por módulo
│   └── media/
│       ├── create.test.js
│       └── getall.test.js
├── .github/workflows/        # GitHub Actions
│   └── playwright.yml
├── playwright.config.js      # Configuración de Playwright
└── package.json
```

## 🎯 Endpoints Probados

### Media API
- `GET /api/media` - Obtener todas las medias
- `GET /api/media?all=true` - Obtener medias incluyendo no publicadas
- `GET /api/media?without_category=true` - Medias sin categoría
- `POST /api/media` - Crear nueva media (próximamente)

## 🔧 Configuración

### Variables de Entorno Requeridas
- `BASE_URL`: URL base de tu API
- `API_TOKEN`: Token de autenticación

### Configuración de Playwright
- Timeout: 30 segundos
- Base URL: Configurada desde variables de entorno
- Headers de autenticación: Automáticos

## 📈 Reportes

Los reportes incluyen:
- ✅ Estado de cada prueba
- ⏱️ Tiempo de ejecución
- 📝 Logs detallados
- 🖼️ Screenshots (si aplica)
- 📊 Métricas de rendimiento

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia ISC.



---



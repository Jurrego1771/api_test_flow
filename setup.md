# 🚀 Guía de Configuración para GitHub

## 📋 Pasos para subir tu proyecto a GitHub

### 1. Crear repositorio en GitHub
1. Ve a [GitHub.com](https://github.com)
2. Haz clic en "New repository"
3. Nombre: `api_test_flow`
4. Descripción: "Automatización de pruebas de API con Playwright"
5. Marca como **Público** (necesario para GitHub Pages)
6. **NO** inicialices con README (ya lo tenemos)

### 2. Configurar variables de entorno en GitHub
1. Ve a tu repositorio en GitHub
2. Ve a **Settings** → **Secrets and variables** → **Actions**
3. Agrega estos secrets:
   - `BASE_URL`: La URL de tu API (ej: `https://api.ejemplo.com`)
   - `API_TOKEN`: Tu token de autenticación

### 3. Subir el código
```bash
# Inicializar git (si no está inicializado)
git init

# Agregar todos los archivos
git add .

# Primer commit
git commit -m "🎉 Configuración inicial del proyecto de pruebas API"

# Conectar con GitHub (reemplaza TU_USUARIO)
git remote add origin https://github.com/TU_USUARIO/api_test_flow.git

# Subir a GitHub
git branch -M main
git push -u origin main
```

### 4. Habilitar GitHub Pages
1. Ve a **Settings** → **Pages**
2. En "Source" selecciona **GitHub Actions**
3. Guarda los cambios

### 5. Verificar que todo funciona
1. Ve a la pestaña **Actions** en tu repositorio
2. Deberías ver el workflow "🧪 Playwright Tests" ejecutándose
3. Una vez completado, ve a **Settings** → **Pages** para ver la URL de tu reporte

## 🔗 URLs importantes

- **Repositorio**: `https://github.com/TU_USUARIO/api_test_flow`
- **Reportes**: `https://TU_USUARIO.github.io/api_test_flow/`
- **Actions**: `https://github.com/TU_USUARIO/api_test_flow/actions`

## 🎯 Próximos pasos

1. **Ejecutar pruebas localmente**:
   ```bash
   npm test
   ```

2. **Ver reporte local**:
   ```bash
   npm run test:report
   ```

3. **Agregar más tests** en la carpeta `tests/`

4. **Personalizar** el README.md con tu información

## 🆘 Solución de problemas

### Error: "No se encontraron secrets"
- Verifica que hayas agregado `BASE_URL` y `API_TOKEN` en Settings → Secrets

### Error: "GitHub Pages no se actualiza"
- Verifica que el workflow se ejecute correctamente
- Revisa los logs en Actions

### Error: "Tests fallan"
- Verifica que las variables de entorno sean correctas
- Revisa que tu API esté funcionando

## 📞 Soporte

Si tienes problemas, revisa:
1. Los logs en GitHub Actions
2. La configuración de Secrets
3. Que tu API esté accesible desde internet

---
name: review-test-suite
description: Use this skill when the user asks to review, audit, or analyze an existing test battery or test file. Activates on phrases like "revisar tests", "review tests", "analizar cobertura", "qué falta en los tests", "mejorar batería", "auditar tests", "check coverage", "review test suite".
version: 1.0.0
---

# Review Test Suite

Skill para auditar y mejorar baterías de pruebas existentes en el proyecto `api_test_flow`.

## Proceso de Revisión

Ejecutar siempre en este orden:

### 1. Leer el test file completo
- Identificar qué módulo cubre (`tests/<modulo>/<file>.test.js`)
- Registrar todos los `test()` definidos con sus IDs (TC_XXX_NNN)

### 2. Leer la referencia del endpoint
- Buscar en `.agents/skills/mediastream-api/references/<modulo>.md`
- Listar todos los endpoints documentados y sus variantes

### 3. Mapear cobertura actual

Construir una tabla:

| Endpoint | Método | Caso | Estado |
|----------|--------|------|--------|
| `/api/modulo` | GET | Happy path | ✅ cubierto |
| `/api/modulo` | GET | Sin token | ❌ faltante |
| `/api/modulo` | POST | Campo requerido faltante | ❌ faltante |

### 4. Checklist de calidad por cada test

Para cada `test()` verificar:

- [ ] **Nomenclatura**: sigue `TC_<MOD>_<NUM>_<ENDPOINT>_<descripcion>`
- [ ] **Arrange/Act/Assert**: estructura clara y separada
- [ ] **Validación de status HTTP**: verifica el código correcto
- [ ] **Validación de body**: usa `body.status === "OK"` o schema Zod
- [ ] **Limpieza de recursos**: recursos creados se registran en `cleaner`
- [ ] **Datos de prueba**: usa `faker` con prefijo `qa_`, no hardcoded
- [ ] **Edge cases**: prueba valores límite, nulos, strings vacíos
- [ ] **Casos negativos**: 401, 404, 400 con parámetros inválidos

### 5. Identificar casos faltantes críticos

Priorizar por severidad:

| Prioridad | Tipo de caso |
|-----------|-------------|
| P0 | Autenticación (sin token, token inválido) |
| P0 | Operaciones destructivas (DELETE, UPDATE) con ID inexistente |
| P1 | Validación de campos requeridos (POST con body vacío/incompleto) |
| P1 | Validación de esquema Zod en respuesta |
| P2 | Paginación y filtros |
| P2 | Edge cases de parámetros opcionales |
| P3 | Valores límite y tipos de dato incorrectos |

### 6. Generar reporte de revisión

Formato de salida:

```markdown
## Revisión: tests/<modulo>/<file>.test.js

### Resumen
- Tests existentes: N
- Cobertura de endpoints: X/Y (Z%)
- Casos críticos faltantes: N

### Cobertura por Endpoint
[tabla de cobertura]

### Problemas de Calidad
- TC_XXX_003: falta validación de schema Zod
- TC_XXX_007: recurso creado no se limpia en afterEach

### Casos Faltantes (priorizado)
**P0:**
- [ ] TC_XXX_NNN — GET /api/modulo sin token → 401

**P1:**
- [ ] TC_XXX_NNN — POST /api/modulo body vacío → 400

**P2:**
- [ ] TC_XXX_NNN — GET /api/modulo con filtros

### Recomendaciones
1. ...
2. ...
```

### 7. Preguntar al usuario qué hacer

Después del reporte, ofrecer:
- Implementar los casos P0 faltantes
- Corregir los problemas de calidad detectados
- Generar todos los casos faltantes en orden de prioridad

---

## Anti-patrones a detectar

| Anti-patrón | Qué buscar | Corrección |
|-------------|-----------|------------|
| Test sin cleanup | `cleaner.register` pero no `cleaner.cleanAll()` en afterEach | Agregar afterEach |
| Hardcoded IDs | IDs de recursos reales en el código | Usar dataFactory |
| Solo happy path | Ausencia de tests 4xx | Agregar negativos |
| Sin validación de schema | Solo `expect(res.status()).toBe(200)` | Agregar Zod |
| Faker v8+ API | `faker.string.alphanumeric()` | Usar `faker.random.alphaNumeric()` |
| Titulos vagos | `"test 1"`, `"should work"` | Nomenclatura TC_XXX |
| describe sin beforeEach | apiClient creado dentro de cada test | Mover a beforeEach |

# 🛡️ QA Automation Guidelines: Standard Ops

Este manual define las reglas de diseño para la automatización de pruebas en este proyecto. El objetivo es maximizar la **Señal** (detección de bugs reales) y minimizar el **Ruido** (falsos positivos/flakiness).

---

## 🧠 1. El Concepto: Test Intention
Cada prueba debe definirse bajo la estructura: **Entrada + Acción + Observables = Oráculo**.

*   **Input:** Datos iniciales, sesión, estado de la DB o Mocks.
*   **Acción:** La interacción técnica (API Call o UI Click).
*   **Observables:** Qué cambia en el sistema (Status, Body, DB, URL).
*   **Oráculo (Assert):** La validación lógica que confirma el comportamiento.

---

## ✅ Qué HACER (Senior Mode)

### 1. Justificar cada Assert
No basta con que un test pase; hay que saber por qué.
*   **Mal:** `expect(res.status()).toBe(200)`
*   **Bien:** 
    ```javascript
    // Oráculo: Valida éxito de negocio y persistencia de datos.
    // Detecta: Fallos en el motor de guardado o errores de esquema 500.
    expect(res.status()).toBe(200);
    ```

### 2. Usar Oráculos Robustos
Busca validar el **estado del negocio**, no solo la visibilidad.
*   **Regla:** Al menos un assert debe validar datos concretos (texto, valores numéricos, IDs), no solo la existencia de un elemento.

### 3. Sincronización Inteligente
En Playwright, utiliza esperas basadas en estados reales.
*   **Regla:** Usar `waitForResponse`, `toBeVisible()`, o esperas implícitas de Playwright. Prohibido `sleep()` o `waitForTimeout()`.

### 4. Datos Deterministas
Usa Fixtures y Mocks para que el test sea repetible. Si usas datos aleatorios (faker), asegúrate de loguear la semilla o el valor generado para poder reproducir un fallo.

---

## ❌ Qué NO hacer (Anti-patrones)

### 1. Asserts "Cosméticos"
Evita tests que solo validen que "la página carga" o "el botón está". Eso es ruido. Si el botón está pero no hace nada, el test es inútil.

### 2. Lógica Condicional en Tests
Si tu test tiene un `if (status === 200)`, está mal diseñado. Un test debe ser determinista: o esperas 200 o esperas 400. La lógica condicional oculta falta de definición en los requisitos.

### 3. Selectores Frágiles
Prohibido usar selectores que dependan de la estructura exacta del DOM.
*   ❌ `page.locator('div > span > button').nth(2)`
*   ✅ `page.getByRole('button', { name: 'Guardar' })` o `page.getByTestId('save-btn')`

---

## 🚦 Clasificación de Valor
Priorizamos la automatización según el impacto:

1.  🔴 **Crítico (P1):** Flujos de dinero, Login, Seguridad, Creación de contenido core. (Cobertura: 100%)
2.  🟡 **Importante (P2):** CRUDs básicos, Filtros, Edición de perfiles. (Cobertura: >80%)
3.  ⚪ **Bajo Valor (P3):** Estética, Tooltips, Textos legales. (No automatizar salvo que sea requisito legal).

---

## 📈 Métrica de Éxito: Signal vs Noise
Si más del **20%** de los fallos en CI son "falsos positivos" (el test falló pero no había bug), el test debe ser **cuarentenado y reescrito** bajo estas reglas.

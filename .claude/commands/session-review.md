---
name: session-review
description: Protocolo de cierre de sesión. Guarda learnings de la API sm2, decisiones técnicas y pendientes en los archivos de memoria correctos.
---

# /session-review — Protocolo de Cierre de Sesión

Protocolo de fin de sesión para `api_test_flow`.
Guarda aprendizajes y mantiene la memoria actualizada para futuras sesiones.

---

## Paso 1 — Leer estado actual de la memoria

Leer en orden:
1. `.claude/memory/MEMORY.md` — índice
2. `.claude/memory/api_system.md` — sistema bajo test
3. `.claude/memory/testing_gaps.md` — gaps conocidos
4. `.claude/memory/decisions.md` — decisiones técnicas

Anotar mentalmente: ¿qué está potencialmente desactualizado?

---

## Paso 2 — Recopilar aprendizajes de la sesión

Hacer al usuario estas preguntas:

```
1. ¿Descubriste algún quirk nuevo de la API sm2 que no estaba documentado?
   (comportamiento inesperado de un endpoint, formato de respuesta diferente,
    campo que no persiste, error de validación no documentado)

2. ¿Hay algún gap de cobertura nuevo que detectaste?
   (módulo o capa sin tests, comportamiento no cubierto)

3. ¿Resolviste algún gap que estaba marcado como ⬜ pendiente?
   (si es así, qué archivo de test cubre ahora ese gap)

4. ¿Tomaste decisiones técnicas importantes?
   (cambio de enfoque, nueva convención, decisión de arquitectura)

5. ¿Quedó trabajo pendiente para la próxima sesión?
   (tests a completar, investigaciones pendientes, preguntas sin respuesta)

6. ¿Los learnings de pipeline/learning/agent*_knowledge.json tienen confirmaciones nuevas?
   (observaciones detectadas por los agentes que el usuario aprobó)
```

---

## Paso 3 — Guardar en el lugar correcto

### Si hay quirk nuevo de la API → actualizar `api_system.md`
Agregar al sección de "Quirks Conocidos" o "DataFactory" según corresponda.
Actualizar "Última verificación desde fuente".

### Si hay gap nuevo → actualizar `testing_gaps.md`
Agregar a la tabla de cobertura por módulo y/o a la sección "Gaps Prioritarios".

### Si se resolvió un gap → actualizar `testing_gaps.md`
Cambiar ⬜ → ✅ en la tabla.
Actualizar fecha de última actualización.

### Si hay decisión técnica nueva → agregar a `decisions.md`
Formato:
```markdown
## D-00N — Título corto

**Decisión**: Qué se decidió.

**Why**: Por qué se tomó esta decisión.

**How to apply**: Cuándo y cómo aplicar esta regla en el futuro.
```

### Si hay trabajo pendiente → crear `sessions/YYYY-MM-DD_tema.md`
```markdown
---
name: Sesión YYYY-MM-DD
description: [descripción del trabajo pendiente]
type: project
---

# [Tema] — YYYY-MM-DD

## Qué hicimos
...

## Decisiones tomadas
...

## Pendiente para próxima sesión
- [ ] Item 1
- [ ] Item 2
```
Agregar puntero en `MEMORY.md`.

---

## Paso 4 — Actualizar MEMORY.md si hay archivos nuevos

Si se creó algún archivo de sesión nuevo, agregar la línea al índice.
El índice debe mantenerse bajo 200 líneas.

---

## Paso 5 — Verificar pipeline/learning/

Si durante la sesión se usó `/generate-tests` o `/review-diff`, verificar:
- ¿Hay learnings aprobados en `pipeline/learning/agent*_knowledge.json` que también deben ir a `api_system.md`?
- Learnings críticos (api_quirk, anti_pattern) van en AMBOS lugares para que sean consultados sin activar el pipeline.

---

## Resumen de Cierre

```
✅ Session review completado — [YYYY-MM-DD]

Guardado:
- api_system.md: [N cambios | sin cambios]
- testing_gaps.md: [N cambios | sin cambios]
- decisions.md: [N cambios | sin cambios]
- sessions/: [nuevo archivo | ninguno]

Próxima sesión:
[lista de pendientes si hay]
```

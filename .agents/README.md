# .agents/ — Directorio Deprecado

Este directorio ya **no es** la fuente operativa de agentes del proyecto.

## Estado actual

El proyecto usa la convención estándar de Claude Code:
- Agentes y skills activos: `.claude/commands/`
- Agentes especializados (sub-agentes): `.claude/agents/`
- Memoria del proyecto: `.claude/memory/`
- Settings y hooks: `.claude/settings.json`

## Por qué está deprecado

Claude Code carga slash commands desde `.claude/commands/`, no desde `.agents/`.
Los archivos aquí no eran cargados automáticamente — eran leídos manualmente
como referencia cuando se invocaba el comando.

## Migración completada

Los 4 agentes del pipeline han sido migrados a `.claude/commands/`:

| Antes | Ahora |
|-------|-------|
| `.agents/skills/pipeline/agent1-requirements.md` | `.claude/commands/agent1-requirements.md` |
| `.agents/skills/pipeline/agent2-impact.md` | `.claude/commands/agent2-impact.md` |
| `.agents/skills/pipeline/agent3-design.md` | `.claude/commands/agent3-design.md` |
| `.agents/skills/pipeline/agent4-code.md` | `.claude/commands/agent4-code.md` |

Nuevos comandos agregados:
- `.claude/commands/generate-tests.md` — orquestador del pipeline de 4 agentes
- `.claude/commands/review-diff.md` — pipeline de análisis de riesgo de cambios
- `.claude/commands/session-review.md` — protocolo de cierre de sesión
- `.claude/commands/sync-knowledge.md` — sincronización con backend sm2

## Qué hacer si necesitas agregar un agente

1. Crear `.claude/commands/<nombre>.md` — ese es el archivo que Claude Code lee como slash command
2. O `.claude/agents/<nombre>/AGENT.md` para sub-agentes especializados
3. Documentar en `.claude/memory/` si hay contexto relevante
4. NO agregar nada nuevo aquí

## Archivos de referencia histórica

Los archivos en `skills/pipeline/` se mantienen como referencia histórica
pero el contenido activo está en `.claude/commands/`.

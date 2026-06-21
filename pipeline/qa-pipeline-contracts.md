# QA Pipeline (v3) — Contratos de los agentes

Flujo lineal de 5 agentes orquestado por `/qa-pipeline`. Cada etapa consume el artefacto
de la anterior. Todos los artefactos viven en `.tmp/pipeline/` (gitignored).

> Reemplaza al pipeline v2.0 (`agent1-requirements`…`agent4-code`) que fue retirado.
> El `pipeline/CONTRACTS.md` antiguo documenta ese sistema deprecado.

```
PR# | rama | feature prompt
  │
  ▼  [1] api-change-impact-analyzer ........ 01-impact.json
  ▼  [2] risk-validator .................... 02-risks.yaml
  ▼  [3] test-designer ..................... 03-test-plan.yaml
  ▼  [4] test-author-runner ............ tests/api/**/*.spec.js
  │                                         qa-knowledge/ (actualizado)
  │                                         04-bugs.yaml
  ▼  [5] issue-reporter .................... 05-issues.yaml  + issues GitHub + Slack
```

## Principios

- **Lineal y con gates.** Si una etapa no produce insumo para la siguiente, el flujo se detiene.
- **`qa-knowledge` es la fuente de verdad de riesgos y cobertura.** Los riesgos (stage 2) usan
  el schema de `qa-knowledge/<modulo>/<modulo>.risk.yaml`; la cobertura (stage 4) se sincroniza ahí
  y en `qa-knowledge/INDEX.yaml`.
- **Las capas de test mapean 1:1 a los projects de Playwright** (`smoke`/`regression`/`contract`/`integration`),
  y cada project se selecciona por `testMatch` según el path → un spec en la carpeta correcta queda
  automáticamente en el workflow correcto. **No hay project `e2e`**: e2e ⇒ `integration` (o `needs_browser`).
- **Acciones externas con control humano.** Los issues de GitHub se crean confirmando uno a uno.
- **Nada se commitea automáticamente.** Specs y ediciones de `qa-knowledge` quedan en el working tree.

## Artefactos

| # | Agente | Lee | Escribe |
|---|--------|-----|---------|
| 1 | `api-change-impact-analyzer` | PR/rama/prompt (gh, git) | `.tmp/pipeline/01-impact.json` |
| 2 | `risk-validator` | `01-impact.json`, diff, MCP Mediastream, `qa-knowledge/*` | `.tmp/pipeline/02-risks.yaml` |
| 3 | `test-designer` | `02-risks.yaml`, `qa-knowledge/*`, `schemas/`, helpers | `.tmp/pipeline/03-test-plan.yaml` |
| 4 | `test-author-runner` | `03-test-plan.yaml`, conventions | specs + `qa-knowledge/*` + `.tmp/pipeline/04-bugs.yaml` |
| 5 | `issue-reporter` | `04-bugs.yaml`, `gh issue list` | issues GitHub + Slack + `.tmp/pipeline/05-issues.yaml` |

## Schemas

- **02-risks.yaml** → schema de `qa-knowledge/<mod>/<mod>.risk.yaml` extendido con `source`
  (`from-impact`|`proposed`), `confirmed` (bool) y `evidence`. IDs continúan la secuencia del módulo.
- **03-test-plan.yaml** → por riesgo: `layer`, `module`, `spec_file`, `cases[]` (`tc_name`, `endpoint`,
  `intent`, `steps`, `assertions`, `reuse`, `needs_browser`).
- **04-bugs.yaml** → `bugs[]`: `title`, `risk_id`, `severity`, `layer`, `tc_name`, `expected`, `actual`,
  `endpoint`, `evidence`, `repro`.
- **05-issues.yaml** → `issues[]`: `bug_id`, `decision` (`created`|`skipped`|`duplicate`), `issue`, `slack_notified`.

(Los ejemplos completos de cada YAML están en el cuerpo de cada agente en `.claude/agents/`.)

## Tooling / requisitos

- **gh CLI** autenticado (stage 5). Issues → `Jurrego1771/api_test_flow`.
- **MCP Mediastream** (lectura) para confirmar comportamiento real de endpoints (stage 2).
- **MCP Playwright** (`.mcp.json`) para observabilidad/ejecución de casos `needs_browser` (stage 4).
  La suite de API se corre con `npx playwright test --project=<capa>`.
- **Slack** vía `notify-slack.js` + `SLACK_WEBHOOK_URL` (stage 5). Monday = handoff manual del QA.

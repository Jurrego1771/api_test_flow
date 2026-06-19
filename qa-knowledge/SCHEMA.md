# QA Knowledge — Formato

Mapa de cobertura de tests por módulo de API, optimizado para que **un agente lo lea rápido y entienda en segundos** qué se prueba, dónde y qué trampas evitar.

## Por qué este formato (y por qué NO RAG)

A esta escala (un repo, ~docenas de módulos, archivos de pocos KB) **embeddings/RAG no aporta** — el modo de falla de RAG (recuperar el chunk equivocado) es más caro que leer el archivo completo del módulo. Lo efectivo es **retrieval por estructura**:

```
INDEX.yaml  →  glob/read del módulo  →  entrada autocontenida
```

Cero infra, cero retrieval miss, determinístico. Migrar a RAG real solo si el corpus deja de caber en contexto (miles de tests / multi-repo / queries semánticas).

## Por qué YAML

- **Parseable por código** — los agentes del pipeline (`coverage-checker`, `test-selector`) lo consumen directo.
- **Legible por humano + LLM** — menos tokens que JSON, sin llaves/comillas de ruido.
- **Grep-friendly** — IDs estables (`TC_CAT_REG_011`).

No usar JSON (verboso, frágil para humanos). Generar vistas Markdown solo como derivado, nunca como fuente.

## Reglas de oro

1. **Una entrada = autocontenida.** Cada test debe entenderse aislado: endpoint + qué prueba + la trampa. Un agente que lee solo ese fragmento no debe necesitar el resto del archivo. Denormaliza el hecho crítico en `desc`; deja el ID solo como link (`quirk_ref`, `risk`).
2. **IDs estables.** El `name` es el nombre real del test (`TC_<MOD>_<CAPA>_<NUM>_...`). No renombrar a la ligera.
3. **`desc` corta y efectiva.** Qué hace + resultado esperado. Una línea. Mete códigos de error reales (`400 NAME_IS_REQUIRED`).
4. **Metadata uniforme** (`op`, `tags`, `quirk_ref`, `risk`) → habilita grep/filtro hoy y sería el metadata de filtrado si algún día se va a embeddings. Cero retrabajo.
5. **Mantener `counts` sincronizado** con la suite real y con `INDEX.yaml`.

## Estructura de un archivo `<modulo>/<modulo>.tests.yaml`

```yaml
module:            # metadata + paths (risk_register, schema, backend_source) + summary
endpoints: []      # método + ruta + qué hace (1 línea c/u)
quirks: []         # comportamientos no obvios del backend. id (Q1..), desc, severity/type si aplica
tests:             # agrupado por capa
  smoke: { file, purpose, cases: [] }
  regression: { file, purpose, cases: [] }
  contract: { file, purpose, schema_ref, cases: [] }
  integration: { file, purpose, cases: [] }
gaps: []           # cobertura faltante + por qué (link a CAT-RISK-XXX)
```

### Campos de un `case`

| Campo | Obligatorio | Qué es |
|---|---|---|
| `name` | sí | Nombre exacto del test |
| `op` | sí | `METHOD /ruta` que ejercita |
| `desc` | sí | Qué prueba + resultado esperado, autocontenido |
| `tags` | no | `[negative, critical, contract]` (no usar @smoke/@regression — la capa ya lo dice) |
| `risk` | no | ID del risk-register (`CAT-RISK-001`) |
| `quirk_ref` | no | ID de quirk del mismo archivo (`Q5`) |

## Cómo agregar un módulo

1. Crear `qa-knowledge/<modulo>/<modulo>.tests.yaml` siguiendo la estructura.
2. Registrar la entrada en `qa-knowledge/INDEX.yaml` (hay plantilla al final del archivo).
3. Validar que parsea:
   `python -c "import yaml; yaml.safe_load(open('qa-knowledge/<modulo>/<modulo>.tests.yaml',encoding='utf-8'))"`

## Mantenimiento

- Al agregar/quitar/renombrar un test → actualizar su `case` y los `counts` (módulo + INDEX).
- Al descubrir un quirk del backend → agregarlo a `quirks` y referenciarlo desde los `case` afectados.
- Tests "documentación" que no afirman nada → no listarlos como cobertura real (o arreglarlos primero).

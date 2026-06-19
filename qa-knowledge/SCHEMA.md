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

## Estructura por módulo: DOS archivos conectados

Cada módulo es una carpeta con dos YAML que se referencian entre sí por **IDs estables**:

```
qa-knowledge/
├── INDEX.yaml                      # router; lee primero
├── SCHEMA.md                       # este archivo
└── <modulo>/
    ├── <modulo>.tests.yaml         # QUÉ se prueba (cases)
    └── <modulo>.risk.yaml          # QUÉ riesgos hay + nivel + cobertura
```

### La conexión (grafo navegable en ambos sentidos)

```
risk.yaml   risks[].id ─────────────┐
            risks[].covered_by ──┐  │
                                 ▼  │
tests.yaml  cases[].name ◄───────┘  │   (cobertura: riesgo -> tests que lo validan)
            cases[].risk ───────────┘   (backlink opcional: test -> riesgo principal)
```

- **`risk.yaml` → `covered_by: [<case.name>]`** es la **fuente autoritativa de cobertura**. Un riesgo lista los tests que lo validan.
- **`tests.yaml` → `cases[].risk: <risk.id>`** es un **backlink opcional** (hint del riesgo principal del test). No tiene que ser exhaustivo — evita doble-mantenimiento/drift. Si hay conflicto, `covered_by` manda.
- Ambos lados usan IDs estables (`TC_CAT_REG_011`, `CAT-RISK-001`) → un agente salta de riesgo a test y viceversa sin ambigüedad.

### `<modulo>.risk.yaml`

Vista machine-readable del `doc/risk-register/<modulo>.md` (prosa) enfocada en cobertura.

```yaml
module:        # name, prefix (XXX-RISK), tests_file, risk_register, scoring (formula + bands)
status_legend: [covered, partial, uncovered]
summary:       # total_risks, covered, partial, uncovered, p0_open: [{id, status, why}]
risks:
  - id: CAT-RISK-001       # estable; igual que en doc/risk-register
    area: Tree integrity
    risk: "..."            # una línea
    score: 80              # impact*likelihood*detectability
    priority: P0           # P0..P3 (bandas en module.scoring)
    status: covered        # covered | partial | uncovered
    covered_by: [TC_CAT_REG_011_..., TC_CAT_REG_012_...]   # AUTORITATIVO
    gap: null              # si partial/uncovered: qué falta y por qué
```

`summary.p0_open` = los P0 sin cobertura plena → lo primero a atacar. Mantener `summary` y `covered_by` sincronizados con los tests reales.

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

1. Crear `qa-knowledge/<modulo>/<modulo>.tests.yaml` (estructura de arriba).
2. Crear `qa-knowledge/<modulo>/<modulo>.risk.yaml` desde `doc/risk-register/<modulo>.md`:
   copiar cada riesgo (id, area, score, priority) y agregar `status` + `covered_by` + `gap`.
3. Conectar: cada `covered_by` apunta a un `case.name` real; opcionalmente poner `risk` en esos cases.
4. Registrar el módulo en `qa-knowledge/INDEX.yaml` (plantilla al final del archivo) con `tests_file`, `risk_file`, `counts` y `coverage`.
5. Validar (ver script abajo).

## Validación / integridad

```bash
python - <<'PY'
import yaml, glob, sys
for rf in glob.glob('qa-knowledge/*/*.risk.yaml'):
    risk = yaml.safe_load(open(rf, encoding='utf-8'))
    tf = risk['module']['tests_file']
    tests = yaml.safe_load(open(tf, encoding='utf-8'))
    names = {c['name'] for layer in tests['tests'].values() for c in layer['cases']}
    for r in risk['risks']:
        for t in r.get('covered_by') or []:
            assert t in names, f"{rf}: {r['id']} apunta a test inexistente '{t}'"
    s = risk['summary']
    by = {st: sum(1 for r in risk['risks'] if r['status']==st) for st in ('covered','partial','uncovered')}
    assert (s['covered'],s['partial'],s['uncovered'])==(by['covered'],by['partial'],by['uncovered']), f"{rf}: summary desincronizado {by}"
print("OK: covered_by válidos y summary sincronizado")
PY
```

## Mantenimiento

- Al agregar/quitar/renombrar un test → actualizar su `case`, los `counts` (módulo + INDEX), y el `covered_by`/`status`/`summary` del riesgo afectado.
- Al cubrir un riesgo `uncovered`/`partial` → mover el test a su `covered_by`, ajustar `status` y `summary` (+ `coverage` en INDEX).
- Al descubrir un quirk → agregarlo a `quirks` y referenciarlo desde los `case` afectados.
- Tests "documentación" que no afirman nada → no listarlos como cobertura real (arreglarlos primero).

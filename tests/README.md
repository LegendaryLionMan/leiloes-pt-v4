# Backend tests (pytest)

FastAPI endpoint + data-layer unit tests.

## Run

```bash
cd C:/Users/lion_/projetos/leiloes-pt-v4
PYTHONPATH="" python -m pytest tests/ -v          # run all (61 tests)
PYTHONPATH="" python -m pytest tests/ --tb=short  # short tracebacks
```

## Coverage

```bash
# coverage is on by default via pyproject.toml [tool.pytest.ini_options].addopts
PYTHONPATH="" python -m pytest tests/

# Outputs:
# - terminal: per-file coverage table with missing line numbers
# - htmlcov/index.html: browser-openable HTML report
# - coverage.xml: Cobertura format (CI uploads as artifact)
```

Current coverage: **74.06%** across 4 measured modules (threshold 70%):

| Module | Coverage | Notes |
|---|---|---|
| `app/api/main.py` | 70.6% | FastAPI surface |
| `app/leb/data/loader.py` | 79.5% | Cache + heuristics |
| `app/leb/data/analytics.py` | 79.8% | KPIs, filtros, agregados |
| `app/leb/data/geo_portugal.py` | 77.4% | Map district coords |

Excluded from coverage (Streamlit-only, exercised by legacy v3 scripts):
`theme.py`, `dashboards.py`, `heatmap.py`, `alertas.py`, `crawler_eleiloes.py`,
`leiloes_reais.py`, `streamlit_app.py` — adding pytest coverage is a Phase 16+ task.

## Test files (61 tests)

| File | Tests | Coverage focus |
|---|---|---|
| `test_error_handler.py` | 6 | Exception handler + error buffer (cap 50, FIFO eviction) |
| `test_data_loader.py` | 6 | `carregar_leiloes()`, `VALOR_SUSPEITO` heuristic, `_dias_ate()` |
| `test_api_endpoints.py` | 9 | `/api/health`, `/api/kpis`, `/api/leiloes`, `/api/filtros/facets`, `/api/top` |
| `test_api_alertas.py` | 7 | Alertas CRUD (POST/GET/PATCH/DELETE/toggle) + active_only filter |
| `test_analytics_geo.py` | 25 | analytics + geo_portugal: KPIs, filtros, agregados, series, scatter, mapa |
| `test_misc_endpoints.py` | 8 | SecurityHeaders, `/api/mapa/*`, `/api/agregados/*`, CSV export, cache info |

## How it works

- **Phase 15**: `vendor/leiloes-pt-data/` was reorganised into `app/leb/` as a
  proper Python package. Tests now `from app.leb.data import loader` directly —
  no more sys.path hack in conftest.py.
- `conftest.py` builds a fixture cache (`app/leb/cache/leiloes_reais.json`)
  with 55 valid items (50 normal + 5 flagged) so tests run without a real crawler.
- Each test calls `fastapi.testclient.TestClient(app, raise_server_exceptions=False)`
  to run the ASGI app in-process (no port binding, no TIME_WAIT issues).
- `raise_server_exceptions=False` lets us verify the exception handler by
  triggering 500s without crashing pytest.

## Adding a test

1. Add function `test_xxx` to an existing file or create a new `test_*.py`
2. Import `from app.api.main import app` and use `TestClient(app)`
   (or `from app.leb.data import loader, analytics, geo_portugal` for unit tests)
3. Include a falsification rule (comment at top of test) — what would break
   if this regresses?
4. Run `python -m pytest tests/test_xxx.py -v`

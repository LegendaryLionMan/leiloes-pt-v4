# Backend tests (pytest)

FastAPI endpoint + data-loader integration tests.

## Run

```bash
cd C:/Users/lion_/projetos/leiloes-pt-v4
PYTHONPATH="" python -m pytest tests/ -v
```

## Coverage (36 tests)

| File | Tests | Coverage |
|---|---|---|
| `test_error_handler.py` | 6 | Exception handler + error buffer (cap 50, FIFO eviction) |
| `test_data_loader.py` | 6 | `carregar_leiloes()`, `VALOR_SUSPEITO` heuristic, `_dias_ate()` |
| `test_api_endpoints.py` | 9 | `/api/health`, `/api/kpis`, `/api/leiloes`, `/api/filtros/facets`, `/api/top` |
| `test_api_alertas.py` | 7 | Alertas CRUD (POST/GET/PATCH/DELETE/toggle) + active_only filter |
| `test_misc_endpoints.py` | 8 | SecurityHeaders, `/api/mapa/*`, `/api/agregados/*`, CSV export, cache info |

## How it works

- `conftest.py` adds project root to `sys.path` BEFORE vendor path so
  `import app` resolves to `app/` (FastAPI backend), not
  `vendor/leiloes-pt-data/app.py` (the Streamlit UI which would break pytest
  collection with `NameError: df_full`).
- `conftest.py` builds a fixture cache (`vendor/leiloes-pt-data/cache/leiloes_reais.json`)
  with 55 valid items (50 normal + 5 flagged) so tests run without a real crawler.
- Each test calls `fastapi.testclient.TestClient(app, raise_server_exceptions=False)`
  to run the ASGI app in-process (no port binding, no TIME_WAIT issues).
- `raise_server_exceptions=False` lets us verify the exception handler by
  triggering 500s without crashing pytest.

## Adding a test

1. Add function `test_xxx` to an existing file or create a new `test_*.py`
2. Import `from app.api.main import app` and use `TestClient(app)`
3. Include a falsification rule (comment at top of test) — what would break
   if this regresses?
4. Run `python -m pytest tests/test_xxx.py -v`

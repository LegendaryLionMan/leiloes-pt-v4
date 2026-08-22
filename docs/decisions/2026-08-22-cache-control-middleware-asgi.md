# 2026-08-22 — Cache-Control middleware (pure ASGI vs @app.middleware)

## Context
In Lente 5, needed to add Cache-Control headers per-route:
- /api/cache/* → no-store
- /api/kpis → public, max-age=60
- resto → public, max-age=30

## Decision
**Pure ASGI middleware via `app.add_middleware()`**.

## Why
`@app.middleware("http")` decorator in FastAPI does NOT survive uvicorn `--reload`.
Pure ASGI middleware registered via `app.add_middleware()` does.

## Trade-offs
- ~30 lines more than decorator version
- Manual `scope` parsing + `send` wrapping required
- But: works under --reload (critical for dev iteration speed)

## Verified
- 35/35 tests pass
- Headers: /api/cache/info → no-store, /api/kpis → max-age=60, resto → max-age=30
- gzip via add_middleware(GZipMiddleware, minimum_size=500) also works

## Reference
app/api/main.py: `CacheControlMiddleware` class.

# Architecture

## High-level

```
┌──────────────────────────────────────────────────────────────────┐
│                     Browser (Chrome/Firefox/Safari)              │
│                                                                  │
│  React 18 SPA (port 5180)                                        │
│    ├── React Router 6 (8 routes)                                 │
│    ├── TanStack Query v5 (server-state cache)                    │
│    ├── Recharts (charts) + Leaflet+OSM (maps)                    │
│    ├── react-i18next (PT-PT default, EN switchable)              │
│    └── Vite 5 + Tailwind v3 + shadcn/ui patterns                 │
└──────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS / proxy /api/*
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                   FastAPI (port 8001) — Python 3.11              │
│                                                                  │
│  Pure ASGI stack:                                                │
│    ├── SecurityHeadersMiddleware (CSP, HSTS, X-Frame, ...)       │
│    ├── CORS middleware (localhost only by default)               │
│    └── GzipMiddleware (auto-encoding)                             │
│                                                                  │
│  22 endpoints across 5 routers:                                  │
│    ├── /leiloes (filter, paginate, cursor, single)              │
│    ├── /kpis (5 KPIs + estados breakdown)                        │
│    ├── /agregados (donut/bar data)                               │
│    ├── /mapa (district/concelho bubbles)                         │
│    ├── /series (timeline)                                        │
│    ├── /scatter (lance vs min)                                   │
│    ├── /facets (filter values)                                   │
│    ├── /cache (info + refresh trigger)                           │
│    ├── /alertas (CRUD)                                           │
│    └── /export (CSV)                                             │
└──────────────────────────────────────────────────────────────────┘
                                │
                                │ direct (no DB ORM)
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│  SQLite alerts DB          │  JSON cache (data layer)            │
│  vendor/.../cache/alertas.db│  vendor/.../cache/leiloes_reais.json│
│  stdlib sqlite3             │  (vendored v3 Python pipeline)      │
│  - busy_timeout 5s          │                                     │
│  - journal_mode=WAL         │  Crawler: e-leilões.pt              │
│  - synchronous=NORMAL       │  Analytics: aggregations, scrapers  │
│  - foreign_keys=ON          │                                     │
└──────────────────────────────────────────────────────────────────┘
```

## Why SQLite + JSON (not Postgres)?

- **User preference**: local-first, no cloud. SQLite preferred over JSON for runtime state (better-sqlite3 was considered but stdlib chosen for zero-dependency).
- **Crawler**: JSON cache because the upstream data is read-mostly (refreshed daily) and we want zero-overhead reads.
- **Alerts**: SQLite because user creates/edits/deletes alerts; concurrency hardening required (busy_timeout + WAL).

## Backend layout

```
app/api/
├── main.py              # FastAPI app, middleware, 22 routes
├── alerts_db.py         # stdlib sqlite3 with concurrency hardening
├── tests/               # pytest (we're migrating to Playwright for now)
├── cache.py             # JSON cache reader (leiloes_reais.json)
└── filters.py           # Filter params parsing + validation
```

## Frontend layout

```
src/
├── main.tsx                 # entry point, imports './i18n'
├── App.tsx                  # shell with topbar, side nav, router
├── i18n.ts                  # react-i18next init
├── locales/
│   ├── pt-PT.json           # Portuguese (default)
│   └── en.json              # English
├── routes/                  # 8 pages
│   ├── Lista.tsx            # /
│   ├── Mapa.tsx             # /mapa
│   ├── Visualizacoes.tsx    # /visualizacoes  (donut → URL sync)
│   ├── Alertas.tsx          # /alertas
│   ├── CriarAlerta.tsx      # /alerta/new
│   ├── Top.tsx              # /top
│   ├── Config.tsx           # /config
│   └── Healthz.tsx          # /healthz
├── components/
│   ├── KPICard.tsx          # KPI tile (label, value, sparkline)
│   ├── DetailDrawer.tsx     # slide-over for leilao details
│   ├── LanguageSwitcher.tsx # PT/EN toggle
│   └── Toast.tsx            # global toast event bus
├── hooks/
│   ├── useKeyboardNav.ts    # j/k/Arrow/Enter/Esc
│   └── useFocusTrap.ts      # Tab/Shift+Tab confined
├── lib/
│   ├── api.ts               # fetchLeiloes, fetchKPIs, ...
│   ├── Drawer.tsx           # slide-over primitive
│   ├── ui.tsx               # Card, Pill, Spinner, formatEUR/formatNumber/formatPct
│   └── filters.ts           # URL ↔ filter state
└── test/                    # Vitest setup (component tests, minimal)
```

## Data flow

1. **Crawler** (vendored v3 Python) writes `leiloes_reais.json` every N hours (cron)
2. **Backend** reads JSON on each request (30s TTL for /leiloes, 60s for /kpis)
3. **Frontend** queries backend via `/api/*` (proxied by Vite)
4. **TanStack Query** caches in-memory + retries + dedupes
5. **User actions** (filters, drill, language toggle) update URL or localStorage

## Caching strategy

| Layer | TTL | Mechanism |
|---|---|---|
| `/api/leiloes` (list) | 30s | `@lru_cache` decorator in FastAPI |
| `/api/kpis` | 60s | same |
| All aggregations | 30s | same |
| Frontend (TanStack Query) | 60s default | `staleTime: 60_000` |
| `localStorage` (lang) | forever | `i18next-browser-languagedetector` |

## Security model

- **No auth yet** (single-user local app). Adding Auth0 or similar is a future phase.
- **CSP**: restrictive (frame-ancestors 'none', no inline scripts, no eval)
- **CORS**: only `localhost:5180` (configurable via `ALLOWED_ORIGINS` env var)
- **No secrets in repo**: `.env` is git-ignored; production uses env vars

## Performance characteristics

- `/api/leiloes`: ~80ms cold (3000+ items), <5ms cached
- `/api/kpis`: ~30ms cold, <2ms cached
- Frontend initial load: ~1.2s (gzipped), TTI ~1.5s
- Bundle size: 387 KB JS gzipped, 24 KB CSS

## When does it NOT scale?

- Single SQLite alerts.db doesn't scale beyond ~10K alerts (current: ~50). Migrate to Postgres if it gets to 1K+.
- JSON cache doesn't scale beyond ~50MB. Migrate to SQLite-DB or DuckDB if cache > 100MB.
- No multi-user. Adding auth would require session tokens + per-user alert filtering.
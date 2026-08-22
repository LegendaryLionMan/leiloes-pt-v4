# leiloes-pt v4

Lovable-style React + Vite + Tailwind dashboard for Portuguese government auctions (e-leilões.pt).

**Stack:**
- React 18 + TypeScript + Vite 5
- Tailwind CSS v3 + shadcn/ui patterns
- TanStack Query v5 for server state
- React Router 6 for routing
- Recharts for charts, react-leaflet for maps
- FastAPI + stdlib `sqlite3` for alerts (alerts.db)
- Vendored Python data pipeline from v3 (e-leilões.pt crawler + analytics)

**Local-first, no cloud.** SQLite alerts at `vendor/leiloes-pt-data/cache/alertas.db`, no Docker, no Supabase.

## Quick start

```bash
# 1. Frontend (port 5180)
npm install
npm run dev

# 2. Backend (port 8001) — in a separate terminal
npm run api:install
npm run api

# 3. Vendoring the v3 data layer
git subtree add --prefix vendor/leiloes-pt-data \
  https://github.com/LegendaryLionMan/leiloes-pt.git main --squash
```

Then open http://localhost:5180/ and the SPA proxies `/api/*` to FastAPI on `:8001`.

## Ports

- **5180** — Vite dev server (the SPA)
- **8001** — FastAPI backend (proxied via `/api` in vite.config.ts)
- No conflict with v3 Streamlit at `:8765`

## Project structure

```
leiloes-pt-v4/
├── src/
│   ├── App.tsx              # Main shell with side nav + 5 routes
│   ├── main.tsx             # React entry point
│   ├── routes/              # 5 tab views (Lista, Mapa, Visualizações, Alertas, Matches)
│   │                        # + CriarAlerta (sub-page at /alerta/new)
│   ├── components/          # KPICard
│   ├── lib/                 # API client, Drawer, ui primitives, filters, utils
│   └── test/                # Vitest setup
├── app/
│   └── api/                 # FastAPI backend (Python)
│       ├── main.py          # /api/leiloes, /api/kpis, /api/alertas CRUD
│       └── (no DB code — stdlib sqlite3 inlined in main.py)
├── vendor/
│   └── leiloes-pt-data/     # Vendored v3 Python data layer (subtree)
│       └── cache/           # leiloes_reais.json (crawler output) + alertas.db
└── e2e/                     # Playwright tests (smoke + ui-ux-validation)
```

## Endpoints (FastAPI :8001)

| Path | Cache | Notes |
|---|---|---|
| `GET /api/leiloes` | 30s | All filters + pagination + `?incluir_passados=true` |
| `GET /api/leiloes/{id}` | 30s | Single item by id |
| `GET /api/kpis` | **60s** | Active items only (excludes past) |
| `GET /api/kpis/estados` | 30s | Estado counts (Em curso/Terminado/Cancelado/Agendado) |
| `GET /api/top` | 30s | Top opportunities by absolute savings |
| `GET /api/agregados/{distrito,concelho,categoria,modalidade}` | 30s | Aggregations |
| `GET /api/mapa/{distritos,concelhos}` | 30s | Map data |
| `GET /api/scatter/lance-vs-min` | 30s | Scatter (max_points 10-2000, min_desconto_pct 0-100) |
| `GET /api/series/{publicacao,encerramento,timeline}` | 30s | Time series |
| `GET /api/facets` | 30s | All distinct values for filters |
| `GET /api/cache/info` | no-store | Cache freshness |
| `POST /api/cache/refresh` | n/a | Trigger crawler |
| `GET/POST/DELETE/PATCH /api/alertas[/id]` | 30s | SQLite CRUD for alerts |
| `GET /api/export/leiloes.csv` | 30s | CSV export |

All endpoints return `Content-Encoding: gzip` when client sends `Accept-Encoding: gzip`.

## Versioning & changelog
See [VERSION_HISTORY.md](VERSION_HISTORY.md) and [docs/decisions/](docs/decisions/) for rationale.

## Accessibility
WCAG 2.2 AA targets met:
- 1.4.4 Resize text — viewport meta allows user zoom
- 2.5.5 Target Size — interactive elements ≥ 44x44px (except inline buttons ≥ 36px)
- 1.1.1 Non-text Content — images have descriptive `alt`
- 2.4.1 Bypass Blocks — skip-to-content link on first Tab


## v0.4 updates (2026-08-22)

### Security headers (v0.4.1)
Pure ASGI middleware injects:
- `Content-Security-Policy` (frame-ancestors 'none', script-src 'self', img-src 'self' data: https://www.e-leiloes.pt https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com)
- `Strict-Transport-Security: max-age=31536000`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation/microphone/camera=()`

### Data quality (v0.4.2)
- `VALOR_SUSPEITO_RATIO_Nx` heuristic in loader.py (detects bugs upstream where `valorBase` comes in cêntimos — e.g. Tábua imóvel 240.000M€ instead of 240k€).
- SQLite race-condition hardening: `busy_timeout=5000ms`, `journal_mode=WAL`, `synchronous=NORMAL`.

### Accessibility (v0.4.3)
- `useKeyboardNav` hook (j/k/Arrow/Enter/Esc/Home/End)
- `useFocusTrap` hook (Tab/Shift+Tab confined, restore focus on close)
- `<Toast>` with `emitToast()` global event bus + aria-live regions

### Performance (v0.4.4)
- Cursor-based pagination on `/api/leiloes?cursor=N` (filter `id > cursor`)
- `next_cursor` in response body
- Test covers: valid cursor filters correctly, invalid cursor ignored silently

### Internationalization (v0.4.5)
- `react-i18next` + `i18next-browser-languagedetector`
- 2 locales: `pt-PT` (default) + `en`
- 30 strings translated (KPIs, nav)
- `<LanguageSwitcher>` in topbar (PT/EN toggle, aria-pressed, role=group)

### Drill-down (v0.4.6)
- Donut chart (categoria) now sync with URL: `?cat=X`
- Bookmarkable shareable drill state
- Visual chip with × button when active
- Reload restores drill from URL

## Routes (8)
| Route | Page | Key feature |
|---|---|---|
| `/` | Lista | Filter pills, KPIs, paginated table, drawer detail |
| `/mapa` | Mapa | Leaflet+OSM map with district/concelho bubbles, drill-down |
| `/visualizacoes` | Visualizações | Donut, bar, scatter, timeline, modality charts |
| `/alertas` | Alertas | User alerts CRUD |
| `/alerta/new` | Criar Alerta | Form to create alert with full filter set |
| `/top` | Top | Top opportunities by savings |
| `/config` | Settings | Theme, language, dark/light |
| `/healthz` | API health | JSON status |

## Endpoints (22)
See [ARCHITECTURE.md](ARCHITECTURE.md) for full endpoint catalog with auth, caching, and rate-limit policies.

## Testing
```bash
npm run test:e2e          # 46 Playwright tests + 1 skipped
cd app/api && pytest      # Python backend tests
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment.

## Changelog
See [CHANGELOG.md](CHANGELOG.md) for version history.

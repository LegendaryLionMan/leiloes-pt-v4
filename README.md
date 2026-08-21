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
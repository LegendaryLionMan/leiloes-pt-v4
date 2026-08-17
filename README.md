# leiloes-pt v4

Lovable-style React + Vite + Tailwind dashboard for Portuguese government auctions (e-leilões.pt).

**Stack:**
- React 18 + TypeScript + Vite 5
- Tailwind CSS v3 + shadcn/ui patterns
- TanStack Query v5 for server state
- React Router 6 for routing
- Recharts for charts, react-leaflet for maps
- FastAPI + SQLite (better-sqlite3 + Drizzle ORM) for backend
- Vendored Python data pipeline from v3 (e-leilões.pt crawler + analytics)

**Local-first, no cloud.** SQLite at `data/leiloes.db`, no Docker, no Supabase.

## Quick start

```bash
# 1. Frontend (port 5180)
npm install
npm run dev

# 2. Backend (port 8000) — in a separate terminal
npm run api:install
npm run api

# 3. Vendoring the v3 data layer
git subtree add --prefix vendor/leiloes-pt-data \
  https://github.com/LegendaryLionMan/leiloes-pt.git main --squash
```

Then open http://localhost:5180/ and the SPA proxies `/api/*` to FastAPI on `:8000`.

## Ports

- **5180** — Vite dev server (the SPA)
- **8000** — FastAPI backend (proxied via `/api` in vite.config.ts)
- No conflict with v3 Streamlit at `:8765`

## Project structure

```
leiloes-pt-v4/
├── src/
│   ├── App.tsx              # Main shell with side nav + 6 routes
│   ├── main.tsx             # React entry point
│   ├── routes/              # 6 tab views (Lista, Mapa, Visualizações, Top, Criar alerta, Matches)
│   ├── components/          # TopBar, SideNav, FilterBar, KPICard
│   ├── lib/                 # API client, filters, utils
│   ├── db/                  # Drizzle schema + client
│   └── test/                # Vitest setup
├── app/
│   └── api/                 # FastAPI backend
│       ├── main.py          # /api/leiloes, /api/kpis, /api/alertas CRUD
│       └── db/              # Drizzle ORM models
├── vendor/
│   └── leiloes-pt-data/     # Vendored v3 Python data layer (subtree)
└── public/
    └── data/                # Static JSON snapshots for the SPA
```
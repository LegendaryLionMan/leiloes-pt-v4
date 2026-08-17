"""FastAPI backend wrapping the v3 leiloes-pt Python data layer.

Vendors the data package from the v3 repo via `git subtree add` into
`vendor/leiloes-pt-data/`. The loader/analytics modules are imported
as `data.*` after sys.path injection.

Endpoints:
- GET /api/health        → liveness probe
- GET /api/leiloes       → filtered list of auction items
- GET /api/kpis          → aggregate KPIs (total, novos_24h, valor, poupança, etc.)
"""
from __future__ import annotations

import sys
from pathlib import Path

# Add vendored v3 data layer to sys.path before importing
VENDOR_PATH = Path(__file__).resolve().parent.parent.parent / "vendor" / "leiloes-pt-data"
sys.path.insert(0, str(VENDOR_PATH))

from typing import Optional, List
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from data import loader, analytics  # noqa: E402 — vendored v3 module


app = FastAPI(
    title="leiloes-pt-v4 API",
    version="0.1.0",
    description="Lovable-style dashboard backend wrapping the v3 Python data pipeline.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:4173",  # Vite preview port
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/api/leiloes")
def get_leiloes(
    distrito: Optional[List[str]] = Query(None),
    concelho: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
    novos_24h: bool = False,
    encerram_30d: bool = False,
    limit: int = 1000,
):
    items = loader.load_all()
    items = analytics.aplicar_filtros(
        items,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
    )
    if novos_24h:
        items = analytics.filtrar_novos_24h(items)
    if encerram_30d:
        items = analytics.filtrar_encerram_30d(items)
    return {"count": len(items), "items": items[:limit]}


@app.get("/api/kpis")
def get_kpis(
    distrito: Optional[List[str]] = Query(None),
    concelho: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
):
    items = loader.load_all()
    items = analytics.aplicar_filtros(
        items,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
    )
    return {
        "total": len(items),
        "novos_24h": len(analytics.filtrar_novos_24h(items)),
        "valor_minimo_total": analytics.somar_valor_minimo(items),
        "poupanca_potencial": analytics.somar_poupanca(items),
        "desconto_medio_pct": analytics.desconto_medio(items),
        "distritos": analytics.contar_distritos(items),
        "encerram_7d": len(analytics.filtrar_encerram_7d(items)),
    }
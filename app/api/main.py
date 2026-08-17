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


def _load_items():
    """Load items via the v3 cache + return as DataFrame + list for JSON."""
    cache = loader.carregar_leiloes()  # {items, fonte, cache_age_hours, ...}
    items = cache["items"]
    df = analytics.para_dataframe(items)
    return items, df


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
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(
        df,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
        so_novos_24h=novos_24h,
        so_encerram_prox_30d=encerram_30d,
    )
    items_filt = df_filt.to_dict(orient="records")
    # NaN → None for JSON
    items_clean = []
    for it in items_filt[:limit]:
        items_clean.append({
            k: (None if (v is None or (isinstance(v, float) and str(v) == 'nan')) else v)
            for k, v in it.items()
        })
    return {"count": len(items_filt), "items": items_clean}


@app.get("/api/kpis")
def get_kpis(
    distrito: Optional[List[str]] = Query(None),
    concelho: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
):
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(
        df,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
    )
    kpis = analytics.kpis_gerais(df_filt)
    return {
        "total": kpis.get("total_leiloes", 0),
        "novos_24h": kpis.get("novos_24h", 0),
        "valor_minimo_total": kpis.get("valor_total_minimo", 0),
        "poupanca_potencial": kpis.get("poupanca_total_estimada", 0),
        "desconto_medio_pct": kpis.get("desconto_medio_pct", 0),
        "distritos": kpis.get("distritos_cobertos", 0),
        "encerram_7d": kpis.get("encerram_prox_7d", 0),
    }
"""FastAPI backend — leiloes-pt v4.

Wraps the v3 Python data layer (vendor/leiloes-pt-data) and exposes a complete
REST surface for the React SPA: KPIs, listings, aggregations, time-series,
alerts (SQLite-backed), matches, CSV export, and filter facets.

Endpoints
- GET  /api/health
- GET  /api/cache/info
- GET  /api/kpis
- GET  /api/leiloes          (extended filters + sort + pagination)
- GET  /api/leiloes/{id}
- GET  /api/top
- GET  /api/agregados/categoria
- GET  /api/agregados/distrito
- GET  /api/agregados/concelho
- GET  /api/series/publicacao
- GET  /api/series/encerramento
- GET  /api/filtros/facets
- GET  /api/export/leiloes.csv
- GET  /api/alertas
- POST /api/alertas
- PATCH /api/alertas/{id}
- DELETE /api/alertas/{id}
- POST /api/alertas/{id}/toggle
- GET  /api/matches
- GET  /api/matches/{alert_id}
- GET  /api/mapa/distritos       (district lat/lon + counts)
- GET  /api/mapa/concelhos       (concelho lat/lon + counts, optional ?distrito= filter)
"""
from __future__ import annotations

import csv
import io
import sqlite3
import sys
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Vendor the v3 data layer onto sys.path so `data.*` resolves.
VENDOR_PATH = Path(__file__).resolve().parent.parent.parent / "vendor" / "leiloes-pt-data"
sys.path.insert(0, str(VENDOR_PATH))

from data import loader, analytics  # noqa: E402 — vendored
from data import geo_portugal as geo  # noqa: E402 — vendored


# --- SQLite alerts DB (stdlib; no extra dep). Lives next to the cache. ----
ALERT_DB = VENDOR_PATH / "cache" / "alertas.db"
ALERT_DB.parent.mkdir(parents=True, exist_ok=True)


def _alert_conn() -> sqlite3.Connection:
    """Per-thread sqlite3 connection (safe across FastAPI worker threads)."""
    conn = sqlite3.connect(str(ALERT_DB), isolation_level=None)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _init_alert_schema() -> None:
    conn = _alert_conn()
    try:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS alertas (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                distrito TEXT,           -- JSON array of strings
                concelho TEXT,
                categoria TEXT,
                valor_max REAL,
                desconto_min REAL,
                only_novos_24h INTEGER DEFAULT 0,
                texto_livre TEXT,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT
            );
            CREATE TABLE IF NOT EXISTS alertas_meta (
                key TEXT PRIMARY KEY,
                value TEXT
            );
            """
        )
    finally:
        conn.close()


_init_alert_schema()


app = FastAPI(
    title="leiloes-pt-v4 API",
    version="0.2.0",
    description="Lovable-style dashboard backend wrapping the v3 Python data pipeline.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
            "http://localhost:5180",
            "http://127.0.0.1:5180",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            # vite proxy strips origin header so CORS may not trigger from SPA;
            # include some safety origins for direct API hits
            "http://127.0.0.1:8001",
            "http://localhost:8001",
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Pydantic models ------------------------------------------------------

class AlertIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    distrito: List[str] = Field(default_factory=list)
    concelho: List[str] = Field(default_factory=list)
    categoria: List[str] = Field(default_factory=list)
    valor_max: Optional[float] = Field(default=None, ge=0)
    desconto_min: Optional[float] = Field(default=None, ge=0, le=100)
    only_novos_24h: bool = False
    texto_livre: Optional[str] = Query(None)
    active: bool = True


class AlertPatch(BaseModel):
    name: Optional[str] = Query(None)
    distrito: Optional[List[str]] = Query(None)
    concelho: Optional[List[str]] = Query(None)
    categoria: Optional[List[str]] = Query(None)
    valor_max: Optional[float] = Query(None)
    desconto_min: Optional[float] = Query(None)
    only_novos_24h: Optional[bool] = None
    texto_livre: Optional[str] = Query(None)
    active: Optional[bool] = None


# --- Caching the loaded dataset (recompute on filter change is too slow) --

_CACHE: Dict[str, Any] = {"ts": 0.0, "items": [], "df": None}
_CACHE_TTL_SEC = 60  # re-load every minute at most


def _load_items():
    """Cache-aware loader. Re-loads when cache age > TTL or never loaded."""
    now = datetime.now().timestamp()
    if _CACHE["df"] is None or (now - _CACHE["ts"]) > _CACHE_TTL_SEC:
        items = loader.carregar_leiloes()["items"]
        df = analytics.para_dataframe(items)
        _CACHE["items"] = items
        _CACHE["df"] = df
        _CACHE["ts"] = now
    return _CACHE["items"], _CACHE["df"]


def _row_to_json(it):
    """Convert a DataFrame row to JSON-safe dict (NaN/None/Timestamp → None)."""
    out = {}
    for k, v in dict(it).items():
        if v is None:
            out[k] = None
        elif isinstance(v, float) and (v != v):  # NaN
            out[k] = None
        elif hasattr(v, "isoformat"):  # datetime / Timestamp
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


def _matches_filters(item, params):
    """Quick in-Python filter (post-DB, pre-pagination). Returns bool."""
    if params.get("novos_24h") and not item.get("novo_24h"):
        return False
    if params.get("encerram_30d"):
        d = item.get("dias_ate_encerramento")
        if d is None or d < 0 or d > 30:
            return False
    txt = (params.get("texto_livre") or "").strip().lower()
    if txt:
        haystack = " ".join(
            str(item.get(c, "")) for c in ("titulo", "descricao", "concelho", "freguesia", "distrito")
        ).lower()
        if txt not in haystack:
            return False
    return True


# --- Health / cache -------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


@app.get("/api/cache/info")
def cache_info():
    info = loader.carregar_leiloes()
    return {
        "fonte": info["fonte"],
        "cache_age_hours": info["cache_age_hours"],
        "cache_timestamp": info["cache_timestamp"],
        "is_stale": info["is_stale"],
        "items_total": len(info["items"]),
    }


# --- KPIs -----------------------------------------------------------------

@app.get("/api/kpis")
def get_kpis(
    distrito: Optional[List[str]] = Query(None),
    concelho: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
    estado: Optional[List[str]] = Query(None),
):
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(
        df,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
        estado_leilao=estado,
    )
    k = analytics.kpis_gerais(df_filt)
    return {
        "total": k["total_leiloes"],
        "novos_24h": k["novos_24h"],
        "valor_minimo_total": k["valor_total_minimo"],
        "poupanca_potencial": k["poupanca_total_estimada"],
        "desconto_medio_pct": round(k["desconto_medio_pct"] or 0, 1),
        "distritos": k["distritos_cobertos"],
        "concelhos": k["concelhos_cobertos"],
        "encerram_7d": k["encerram_prox_7d"],
    }


# --- Listings -------------------------------------------------------------

@app.get("/api/leiloes")
def get_leiloes(
    distrito: Optional[List[str]] = Query(None),
    concelho: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
    estado: Optional[List[str]] = Query(None),
    valor_min: Optional[float] = Query(None, ge=0),
    valor_max: Optional[float] = Query(None, ge=0),
    novos_24h: bool = False,
    encerram_30d: bool = False,
    ordenar_por: str = Query("data_encerramento", pattern="^(data_encerramento|data_publicacao|valor_minimo|poupanca_potencial|poupanca_pct|titulo)$"),
    ordem: str = Query("asc", pattern="^(asc|desc)$"),
    texto_livre: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
):
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(
        df,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
        estado_leilao=estado,
        valor_min=valor_min,
        valor_max=valor_max,
        so_novos_24h=novos_24h,
        so_encerram_prox_30d=encerram_30d,
        ordenar_por=ordenar_por,
        ordem=ordem,
        texto_livre=texto_livre or "",
    )
    items = df_filt.to_dict(orient="records")
    total = len(items)
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return {
        "count": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "items": [_row_to_json(it) for it in page_items],
    }


@app.get("/api/leiloes/{item_id}")
def get_leilao(item_id: int):
    items, _ = _load_items()
    for it in items:
        if it.get("id") == item_id:
            return _row_to_json(it)
    raise HTTPException(404, f"Leilão {item_id} não encontrado")


# --- Top opportunities ----------------------------------------------------

@app.get("/api/top")
def get_top(
    top_n: int = Query(15, ge=1, le=100),
    min_desconto_pct: float = Query(20.0, ge=0, le=100),
    distrito: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
):
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(df, distritos=distrito, categorias=categoria)
    top = analytics.top_oportunidades(df_filt, top_n=top_n, min_desconto_pct=min_desconto_pct)
    return {
        "count": len(top),
        "items": [_row_to_json(it) for it in top.to_dict(orient="records")],
    }


# --- Aggregations ---------------------------------------------------------

@app.get("/api/agregados/categoria")
def agg_categoria(distrito: Optional[List[str]] = Query(None)):
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(df, distritos=distrito)
    agg = analytics.agregado_por_categoria(df_filt)
    return {
        "count": len(agg),
        "items": [_row_to_json(r) for r in agg.to_dict(orient="records")],
    }


@app.get("/api/agregados/distrito")
def agg_distrito():
    items, df = _load_items()
    agg = analytics.agregado_por_distrito(df)
    return {
        "count": len(agg),
        "items": [_row_to_json(r) for r in agg.to_dict(orient="records")],
    }


@app.get("/api/mapa/distritos")
def mapa_distritos():
    """Distritos com lat/lon + counts + poupança — pronto para para o mapa de bolhas Leaflet."""
    items, df = _load_items()
    agg = analytics.agregado_por_distrito(df)
    # Enrich with coordinates
    out = []
    for r in agg.to_dict(orient="records"):
        coords = geo.coord_distrito(r["distrito"])
        out.append({
            "distrito": r["distrito"],
            "lat": coords[0],
            "lon": coords[1],
            "total": r.get("total", 0),
            "valor_minimo_total": r.get("valor_minimo_total", 0),
            "poupanca_total": r.get("poupanca_total", 0),
            "desconto_medio_pct": r.get("desconto_medio_pct", 0),
        })
    return {"count": len(out), "items": out}


@app.get("/api/mapa/concelhos")
def mapa_concelhos(distrito: Optional[str] = None):
    """Concelhos com lat/lon + counts — pronto para para o mapa de bolhas Leaflet (drill-down)."""
    items, df = _load_items()
    if distrito:
        df = df[df["distrito"] == distrito]
    agg = analytics.agregado_por_concelho(df)
    out = []
    for r in agg.to_dict(orient="records"):
        coords = geo.coord_concelho(r["concelho"], r["distrito"])
        out.append({
            "concelho": r["concelho"],
            "distrito": r["distrito"],
            "lat": coords[0],
            "lon": coords[1],
            "total": r.get("total", 0),
            "valor_minimo_total": r.get("valor_minimo_total", 0),
            "poupanca_total": r.get("poupanca_total", 0),
            "desconto_medio_pct": r.get("desconto_medio_pct", 0),
        })
    return {"count": len(out), "items": out}


@app.get("/api/agregados/concelho")
def agg_concelho(distrito: Optional[str] = Query(None)):
    items, df = _load_items()
    agg = analytics.agregado_por_concelho(df, distrito=distrito)
    return {
        "count": len(agg),
        "items": [_row_to_json(r) for r in agg.to_dict(orient="records")],
    }


# --- Time series ----------------------------------------------------------

@app.get("/api/series/publicacao")
def series_publicacao():
    items, df = _load_items()
    s = analytics.serie_temporal_publicacao(df)
    records = s.to_dict(orient="records")
    return {
        "count": len(records),
        "days": [_row_to_json(r) for r in records],
        "categories": [c for c in s.columns if c != "dia"],
    }


@app.get("/api/series/encerramento")
def series_encerramento():
    items, df = _load_items()
    s = analytics.evolucao_encerramentos(df)
    return {
        "count": len(s),
        "days": [_row_to_json(r) for r in s.to_dict(orient="records")],
    }


# --- Facets (filter dropdown sources) -------------------------------------

@app.get("/api/filtros/facets")
def facets():
    items, df = _load_items()
    return {
        "distritos": sorted(df["distrito"].dropna().unique().tolist()),
        "concelhos": sorted(df["concelho"].dropna().unique().tolist()),
        "categorias": sorted(df["categoria"].dropna().unique().tolist()),
        "estados": sorted(df["estado"].dropna().unique().tolist()) if "estado" in df.columns else [],
        "modalidades": sorted(df["modalidade"].dropna().unique().tolist()) if "modalidade" in df.columns else [],
    }


# --- CSV export -----------------------------------------------------------

@app.get("/api/export/leiloes.csv")
def export_csv(
    distrito: Optional[List[str]] = Query(None),
    concelho: Optional[List[str]] = Query(None),
    categoria: Optional[List[str]] = Query(None),
    estado: Optional[List[str]] = Query(None),
    valor_min: Optional[float] = Query(None),
    valor_max: Optional[float] = Query(None),
    novos_24h: bool = False,
    encerram_30d: bool = False,
    texto_livre: Optional[str] = Query(None),
):
    items, df = _load_items()
    df_filt = analytics.aplicar_filtros(
        df,
        distritos=distrito,
        concelhos=concelho,
        categorias=categoria,
        estado_leilao=estado,
        valor_min=valor_min,
        valor_max=valor_max,
        so_novos_24h=novos_24h,
        so_encerram_prox_30d=encerram_30d,
        texto_livre=texto_livre or "",
    )
    records = df_filt.to_dict(orient="records")
    # Pick user-facing columns
    cols = [
        "id", "referencia", "titulo", "categoria", "distrito", "concelho",
        "freguesia", "valor_avaliacao", "valor_minimo", "valor_mercado_estimado",
        "poupanca_potencial", "poupanca_pct", "data_publicacao",
        "data_encerramento", "dias_ate_encerramento", "estado", "modalidade", "link",
    ]
    cols = [c for c in cols if c in (records[0].keys() if records else cols)]
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in records:
        clean = {}
        for c in cols:
            v = r.get(c)
            if hasattr(v, "isoformat"):
                v = v.isoformat()
            clean[c] = v
        w.writerow(clean)
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": "attachment; filename=leiloes.csv"},
    )


# --- Alerts ---------------------------------------------------------------

def _row_to_alert(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    for k in ("distrito", "concelho", "categoria"):
        try:
            import json as _json
            d[k] = _json.loads(d[k] or "[]")
        except Exception:
            d[k] = []
    d["only_novos_24h"] = bool(d.get("only_novos_24h"))
    d["active"] = bool(d.get("active"))
    return d


@app.get("/api/alertas")
def list_alertas(active_only: bool = False):
    conn = _alert_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM alertas WHERE (?=0 OR active=1) ORDER BY created_at DESC",
            (0 if not active_only else 1,),
        ).fetchall()
        return {"count": len(rows), "items": [_row_to_alert(r) for r in rows]}
    finally:
        conn.close()


@app.post("/api/alertas", status_code=201)
def create_alerta(alert: AlertIn):
    import json as _json
    conn = _alert_conn()
    try:
        aid = str(uuid.uuid4())[:8]
        now = datetime.now().isoformat()
        conn.execute(
            """INSERT INTO alertas (id, name, distrito, concelho, categoria,
               valor_max, desconto_min, only_novos_24h, texto_livre,
               active, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (
                aid, alert.name,
                _json.dumps(alert.distrito),
                _json.dumps(alert.concelho),
                _json.dumps(alert.categoria),
                alert.valor_max,
                alert.desconto_min,
                int(alert.only_novos_24h),
                alert.texto_livre,
                int(alert.active),
                now,
            ),
        )
        row = conn.execute("SELECT * FROM alertas WHERE id=?", (aid,)).fetchone()
        return _row_to_alert(row)
    finally:
        conn.close()


@app.patch("/api/alertas/{alert_id}")
def patch_alerta(alert_id: str, patch: AlertPatch):
    conn = _alert_conn()
    try:
        row = conn.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Alerta não encontrado")
        import json as _json
        sets, vals = [], []
        for field, col in [
            ("name", "name"), ("valor_max", "valor_max"), ("desconto_min", "desconto_min"),
            ("texto_livre", "texto_livre"),
        ]:
            v = getattr(patch, field)
            if v is not None:
                sets.append(f"{col}=?"); vals.append(v)
        for field, col in [("distrito", "distrito"), ("concelho", "concelho"), ("categoria", "categoria")]:
            v = getattr(patch, field)
            if v is not None:
                sets.append(f"{col}=?"); vals.append(_json.dumps(v))
        for field, col in [("only_novos_24h", "only_novos_24h"), ("active", "active")]:
            v = getattr(patch, field)
            if v is not None:
                sets.append(f"{col}=?"); vals.append(int(v))
        if not sets:
            return _row_to_alert(row)
        sets.append("updated_at=?"); vals.append(datetime.now().isoformat())
        vals.append(alert_id)
        conn.execute(f"UPDATE alertas SET {', '.join(sets)} WHERE id=?", vals)
        new_row = conn.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        return _row_to_alert(new_row)
    finally:
        conn.close()


@app.post("/api/alertas/{alert_id}/toggle")
def toggle_alerta(alert_id: str):
    conn = _alert_conn()
    try:
        row = conn.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Alerta não encontrado")
        new_val = 0 if bool(row["active"]) else 1
        conn.execute("UPDATE alertas SET active=?, updated_at=? WHERE id=?",
                     (new_val, datetime.now().isoformat(), alert_id))
        return {"id": alert_id, "active": bool(new_val)}
    finally:
        conn.close()


@app.delete("/api/alertas/{alert_id}", status_code=204)
def delete_alerta(alert_id: str):
    conn = _alert_conn()
    try:
        row = conn.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Alerta não encontrado")
        conn.execute("DELETE FROM alertas WHERE id=?", (alert_id,))
    finally:
        conn.close()
    return Response(status_code=204)


# --- Match alerts against current cache -----------------------------------

def _alert_matches(alert: Dict[str, Any], df) -> List[Dict[str, Any]]:
    df_filt = analytics.aplicar_filtros(
        df,
        distritos=alert.get("distrito") or None,
        concelhos=alert.get("concelho") or None,
        categorias=alert.get("categoria") or None,
        valor_max=alert.get("valor_max"),
        so_novos_24h=bool(alert.get("only_novos_24h")),
        texto_livre=alert.get("texto_livre") or "",
    )
    if alert.get("desconto_min"):
        df_filt = df_filt[df_filt["poupanca_pct"] >= float(alert["desconto_min"])]
    records = df_filt.to_dict(orient="records")
    return [_row_to_json(r) for r in records[:100]]


@app.get("/api/matches")
def all_matches(active_only: bool = True):
    items, df = _load_items()
    conn = _alert_conn()
    try:
        rows = conn.execute(
            "SELECT * FROM alertas WHERE (?=0 OR active=1)",
            (0 if not active_only else 1,),
        ).fetchall()
        out = []
        for r in rows:
            alert = _row_to_alert(r)
            out.append({
                "alert": alert,
                "matches": _alert_matches(alert, df),
            })
        return {"count": len(out), "items": out}
    finally:
        conn.close()


@app.get("/api/matches/{alert_id}")
def alert_matches(alert_id: str):
    items, df = _load_items()
    conn = _alert_conn()
    try:
        row = conn.execute("SELECT * FROM alertas WHERE id=?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Alerta não encontrado")
        alert = _row_to_alert(row)
        return {"alert": alert, "matches": _alert_matches(alert, df)}
    finally:
        conn.close()

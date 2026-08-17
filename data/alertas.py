"""Sistema de alertas por categoria + localização + export CSV."""
import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
import csv

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"
ALERTAS_FILE = CACHE_DIR / "alertas.json"


def _carregar_alertas_raw() -> List[Dict]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    if not ALERTAS_FILE.exists():
        return []
    try:
        with open(ALERTAS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def _gravar_alertas(alertas: List[Dict]):
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    # Garantir que o diretório-pai do ALERTAS_FILE existe (testes podem pôr ALERTAS_FILE num tempdir já apagado)
    parent = Path(ALERTAS_FILE).parent
    parent.mkdir(parents=True, exist_ok=True)
    with open(ALERTAS_FILE, "w", encoding="utf-8") as f:
        json.dump(alertas, f, ensure_ascii=False, indent=2)


def carregar_alertas() -> List[Dict]:
    return _carregar_alertas_raw()


def criar_alerta(
    nome: str,
    distritos: List[str] = None,
    concelhos: List[str] = None,
    categorias: List[str] = None,
    valor_min: float = 0,
    valor_max: float = None,
    desconto_min_pct: float = 0,
    apenas_novos_24h: bool = True,
    notificar_email: str = "",
    notificar_telegram: str = "",
) -> Dict:
    alertas = _carregar_alertas_raw()
    novo = {
        "id": f"alert_{len(alertas)+1:04d}",
        "nome": nome,
        "filtros": {
            "distritos": distritos or [],
            "concelhos": concelhos or [],
            "categorias": categorias or [],
            "valor_min": valor_min,
            "valor_max": valor_max or 10**12,
            "desconto_min_pct": desconto_min_pct,
            "apenas_novos_24h": apenas_novos_24h,
        },
        "notificacao": {
            "email": notificar_email,
            "telegram": notificar_telegram,
        },
        "criado_em": datetime.now().isoformat(),
        "ativo": True,
    }
    alertas.append(novo)
    _gravar_alertas(alertas)
    return novo


def eliminar_alerta(alert_id: str):
    alertas = [a for a in _carregar_alertas_raw() if a["id"] != alert_id]
    _gravar_alertas(alertas)


def toggle_alerta(alert_id: str):
    alertas = _carregar_alertas_raw()
    for a in alertas:
        if a["id"] == alert_id:
            a["ativo"] = not a.get("ativo", True)
    _gravar_alertas(alertas)


def verificar_alertas(leiloes_df) -> List[Dict]:
    """Devolve lista de matches por alerta ativo."""
    matches = []
    for alerta in _carregar_alertas_raw():
        if not alerta.get("ativo", True):
            continue
        f = alerta["filtros"]
        candidatos = leiloes_df.copy()
        if f["distritos"]:
            candidatos = candidatos[candidatos["distrito"].isin(f["distritos"])]
        if f["concelhos"]:
            candidatos = candidatos[candidatos["concelho"].isin(f["concelhos"])]
        if f["categorias"]:
            candidatos = candidatos[candidatos["categoria"].isin(f["categorias"])]
        candidatos = candidatos[
            (candidatos["valor_minimo"] >= f["valor_min"]) &
            (candidatos["valor_minimo"] <= f["valor_max"])
        ]
        if f["desconto_min_pct"]:
            candidatos = candidatos[candidatos["poupanca_pct"] >= f["desconto_min_pct"]]
        if f["apenas_novos_24h"]:
            candidatos = candidatos[candidatos["novo_24h"]]
        matches.append({
            "alerta": alerta,
            "matches": candidatos
        })
    return matches


def exportar_csv(df, path: str = None) -> str:
    if path is None:
        path = CACHE_DIR / f"leiloes_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    # Colunas preferidas — schema real (e-leilões.pt)
    cols_preferidas = ["id", "referencia", "categoria", "distrito", "concelho", "freguesia",
                       "titulo", "valor_avaliacao", "valor_minimo", "valor_mercado_estimado",
                       "poupanca_potencial", "poupanca_pct", "desconto_vs_avaliacao_pct",
                       "estado", "praca", "modalidade",
                       "data_encerramento", "data_publicacao",
                       "fonte", "link", "lance_atual", "foto"]
    cols = [c for c in cols_preferidas if c in df.columns]  # VALE — só colunas que existem
    if not cols:
        cols = list(df.columns)  # fallback: todas
    df_export = df[cols].copy()
    if "data_encerramento" in df_export.columns:
        df_export["data_encerramento"] = pd_safe_strftime(df_export["data_encerramento"])
    if "data_publicacao" in df_export.columns:
        df_export["data_publicacao"] = pd_safe_strftime(df_export["data_publicacao"])
    df_export.to_csv(path, index=False, quoting=csv.QUOTE_ALL, encoding="utf-8-sig")
    return str(path)


def pd_safe_strftime(series):
    """strftime seguro para datetime/Timestamp."""
    return series.apply(lambda x: x.strftime("%Y-%m-%d") if hasattr(x, "strftime") else str(x)[:10])

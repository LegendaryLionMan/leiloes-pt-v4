"""
Funções analíticas: poupança potencial, KPIs, segmentação, novos nas últimas 24h.
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any
import pandas as pd


def para_dataframe(leiloes: List[Dict]) -> pd.DataFrame:
    df = pd.DataFrame(leiloes)
    df["data_publicacao"] = pd.to_datetime(df["data_publicacao"])
    df["data_encerramento"] = pd.to_datetime(df["data_encerramento"])
    df["data_abertura"] = pd.to_datetime(df["data_abertura"])
    # poupanca_potencial = savings vs the HIGHER of (lance_atual, valor_minimo)
    # - No bid yet: savings = valor_mercado - valor_minimo (platform floor, ~15%)
    # - Bid above floor: savings = valor_mercado - lance_atual (user pays more, less savings)
    # - Bid below floor: savings = valor_mercado - lance_atual (bargain — but bid will be rejected)
    # Edge case: lance > valor_mercado means someone overpaid, savings = 0
    df["_piso"] = df[["lance_atual", "valor_minimo"]].max(axis=1)
    df["poupanca_potencial"] = (
        df["valor_mercado_estimado"] - df["_piso"]
    ).clip(lower=0)
    df.drop(columns=["_piso"], inplace=True)
    df["poupanca_pct"] = (df["poupanca_potencial"] / df["valor_mercado_estimado"] * 100).round(1)
    df["desconto_vs_avaliacao_pct"] = (
        (1 - df["valor_minimo"] / df["valor_avaliacao"]) * 100
    ).round(1)
    df["novo_24h"] = (datetime.now() - df["data_publicacao"]) <= timedelta(hours=24)
    df["dias_ate_encerramento"] = (df["data_encerramento"] - datetime.now()).dt.days
    return df


def kpis_gerais(df: pd.DataFrame) -> Dict[str, Any]:
    safe = lambda k: float(df[k].sum()) if k in df.columns else 0.0
    safe_mean = lambda k: float(df[k].mean()) if k in df.columns and len(df) else 0.0
    return {
        "total_leiloes": len(df),
        "novos_24h": int(df["novo_24h"].sum()) if "novo_24h" in df.columns else 0,
        "valor_total_avaliacao": safe("valor_avaliacao"),
        "valor_total_minimo": safe("valor_minimo"),
        "valor_total_mercado": safe("valor_mercado_estimado"),
        "poupanca_total_estimada": safe("poupanca_potencial"),
        "desconto_medio_pct": safe_mean("poupanca_pct"),
        "distritos_cobertos": int(df["distrito"].nunique()) if "distrito" in df.columns else 0,
        "concelhos_cobertos": int(df["concelho"].nunique()) if "concelho" in df.columns else 0,
        "encerram_prox_7d": int((df["dias_ate_encerramento"] <= 7).sum()) if "dias_ate_encerramento" in df.columns else 0,
    }


def top_oportunidades(df: pd.DataFrame, top_n: int = 15, min_desconto_pct: float = 20.0) -> pd.DataFrame:
    """Maior poupança potencial absoluta, com desconto mínimo configurável."""
    candidatos = df[df["poupanca_pct"] >= min_desconto_pct].copy()
    candidatos = candidatos.sort_values("poupanca_potencial", ascending=False).head(top_n)
    return candidatos


def novos_ultimas_24h(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["novo_24h"]].sort_values("data_publicacao", ascending=False)


def agregado_por_categoria(df: pd.DataFrame) -> pd.DataFrame:
    agg = df.groupby("categoria").agg(
        total=("id", "count"),
        valor_minimo_total=("valor_minimo", "sum"),
        valor_mercado_total=("valor_mercado_estimado", "sum"),
        poupanca_total=("poupanca_potencial", "sum"),
        desconto_medio_pct=("poupanca_pct", "mean"),
        valor_medio_minimo=("valor_minimo", "mean"),
    ).reset_index()
    agg["desconto_medio_pct"] = agg["desconto_medio_pct"].round(1)
    agg["valor_minimo_total"] = agg["valor_minimo_total"].round(0)
    agg["valor_mercado_total"] = agg["valor_mercado_total"].round(0)
    agg["poupanca_total"] = agg["poupanca_total"].round(0)
    agg["valor_medio_minimo"] = agg["valor_medio_minimo"].round(0)
    return agg.sort_values("poupanca_total", ascending=False)


def agregado_por_distrito(df: pd.DataFrame) -> pd.DataFrame:
    agg = df.groupby("distrito").agg(
        total=("id", "count"),
        valor_minimo_total=("valor_minimo", "sum"),
        poupanca_total=("poupanca_potencial", "sum"),
        desconto_medio_pct=("poupanca_pct", "mean"),
    ).reset_index()
    agg["desconto_medio_pct"] = agg["desconto_medio_pct"].round(1)
    return agg.sort_values("total", ascending=False)


def agregado_por_concelho(df: pd.DataFrame, distrito: str = None) -> pd.DataFrame:
    if df.empty:
        return pd.DataFrame(columns=["concelho", "distrito", "total", "valor_minimo_total", "poupanca_total", "desconto_medio_pct"])
    base = df if not distrito else df[df["distrito"] == distrito]
    # Schema real (e-leilões.pt) TEM sempre poupanca_potencial (calculado em para_dataframe).
    # O fallback abaixo é só uma rede de segurança se algum dia o schema mudar.
    agg_dict = {}
    if "id" in base.columns:
        agg_dict["total"] = ("id", "count")
    else:
        agg_dict["total"] = ("concelho", "count")
    if "valor_minimo" in base.columns:
        agg_dict["valor_minimo_total"] = ("valor_minimo", "sum")
    if "poupanca_potencial" in base.columns:
        agg_dict["poupanca_total"] = ("poupanca_potencial", "sum")
    elif "valor_mercado_estimado" in base.columns and "valor_minimo" in base.columns:
        # Fallback: calcular a partir de mercado - mínimo
        agg_dict["poupanca_total"] = ("valor_minimo", "sum")  # placeholder
    if "poupanca_pct" in base.columns:
        agg_dict["desconto_medio_pct"] = ("poupanca_pct", "mean")
    # groupby inclui distrito no aggregation
    if "distrito" in base.columns and not distrito:
        agg = base.groupby(["concelho", "distrito"]).agg(**agg_dict).reset_index()
    else:
        agg = base.groupby("concelho").agg(**agg_dict).reset_index()
        if distrito:
            agg["distrito"] = distrito
    if "desconto_medio_pct" in agg.columns:
        agg["desconto_medio_pct"] = agg["desconto_medio_pct"].round(1)
    return agg.sort_values("total", ascending=False)


def serie_temporal_publicacao(df: pd.DataFrame) -> pd.DataFrame:
    """Séries de publicações por dia (últimos 30 dias) por categoria."""
    cutoff = datetime.now() - timedelta(days=30)
    base = df[df["data_publicacao"] >= cutoff].copy()
    base["dia"] = base["data_publicacao"].dt.date
    pivot = base.pivot_table(
        index="dia", columns="categoria", values="id", aggfunc="count", fill_value=0
    ).reset_index()
    pivot["dia"] = pd.to_datetime(pivot["dia"])
    return pivot.sort_values("dia")


def evolucao_encerramentos(df: pd.DataFrame) -> pd.DataFrame:
    """Leilões a encerrar nos próximos 60 dias, por dia."""
    futuro = df[(df["data_encerramento"] >= datetime.now()) &
                (df["data_encerramento"] <= datetime.now() + timedelta(days=60))].copy()
    futuro["dia"] = futuro["data_encerramento"].dt.date
    agg = futuro.groupby("dia").agg(
        total=("id", "count"),
        valor_minimo=("valor_minimo", "sum"),
        valor_mercado=("valor_mercado_estimado", "sum"),
        poupanca=("poupanca_potencial", "sum"),
    ).reset_index()
    agg["dia"] = pd.to_datetime(agg["dia"])
    return agg.sort_values("dia")


def aplicar_filtros(
    df: pd.DataFrame,
    distritos: List[str] = None,
    categorias: List[str] = None,
    concelhos: List[str] = None,
    valor_min: float = 0,
    valor_max: float = None,  # aceita None = sem limite
    estado_leilao: List[str] = None,
    natureza: List[str] = None,
    so_novos_24h: bool = False,
    so_encerram_prox_30d: bool = False,
    ordenar_por: str = "data_encerramento",
    ordem: str = "asc",
    texto_livre: str = "",
) -> pd.DataFrame:
    out = df.copy()
    if distritos and "distrito" in out.columns:
        out = out[out["distrito"].isin(distritos)]
    if categorias and "categoria" in out.columns:
        out = out[out["categoria"].isin(categorias)]
    if concelhos and "concelho" in out.columns:
        out = out[out["concelho"].isin(concelhos)]
    # Schema: estado (Terminado, Cancelado, Em curso, Agendado)
    if estado_leilao and "estado" in out.columns:
        out = out[out["estado"].isin(estado_leilao)]
    if natureza and "natureza" in out.columns:
        out = out[out["natureza"].isin(natureza)]
    # Filtro de valor (None-safe: trata None como "sem limite")
    _vmin = valor_min if valor_min is not None else 0
    _vmax = valor_max if valor_max is not None else float("inf")
    if _vmin > 0 or _vmax < float("inf"):
        if "valor_minimo" in out.columns:
            vm = out["valor_minimo"].fillna(0)
            out = out[vm.between(_vmin, _vmax)]  # applied only if _vmin>0 or _vmax<inf
    if so_novos_24h and "novo_24h" in out.columns:
        out = out[out["novo_24h"]]
    if so_encerram_prox_30d and "dias_ate_encerramento" in out.columns:
        out = out[out["dias_ate_encerramento"].between(0, 30)]
    # Pesquisa livre (None-safe em todas as colunas)
    if texto_livre and any(c in out.columns for c in ["descricao", "concelho", "freguesia", "titulo"]):
        mask = pd.Series(False, index=out.index)
        for col in ["descricao", "concelho", "freguesia", "titulo"]:
            if col in out.columns:
                mask |= out[col].astype(str).str.contains(texto_livre, case=False, na=False)
        out = out[mask]  # text search mask — only entered when texto_livre truthy
    ascending = (ordem == "asc")
    if ordenar_por in out.columns:
        out = out.sort_values(ordenar_por, ascending=ascending)
    return out.reset_index(drop=True)

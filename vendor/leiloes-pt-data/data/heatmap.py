"""
Heatmap de encerramentos: distribuição por dia nas próximas 8 semanas.
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import pandas as pd


def heatmap_encerramentos(df: pd.DataFrame, semanas: int = 8) -> pd.DataFrame:
    """Gera matriz [semana x dia_semana] com count de encerramentos."""
    cutoff = datetime.now() + timedelta(weeks=semanas)
    base = df[(df["data_encerramento"] >= datetime.now()) &
              (df["data_encerramento"] <= cutoff)].copy()
    if base.empty:
        return pd.DataFrame()

    base["semana"] = base["data_encerramento"].apply(
        lambda d: d.isocalendar().week
    )
    base["dia_semana"] = base["data_encerramento"].dt.dayofweek  # 0=Seg, 6=Dom
    base["dia_label"] = base["dia_semana"].map({
        0: "Seg", 1: "Ter", 2: "Qua", 3: "Qui", 4: "Sex", 5: "Sáb", 6: "Dom"
    })

    matriz = base.pivot_table(
        index="semana", columns="dia_label", values="id",
        aggfunc="count", fill_value=0
    )

    # Garantir ordem dos dias
    dias_ordem = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
    for d in dias_ordem:
        if d not in matriz.columns:
            matriz[d] = 0
    matriz = matriz[dias_ordem]

    return matriz


def stats_heatmap(df: pd.DataFrame) -> Dict[str, Any]:
    """Estatísticas agregadas para mostrar no header do heatmap."""
    cutoff = datetime.now() + timedelta(weeks=8)
    proximos = df[(df["data_encerramento"] >= datetime.now()) &
                  (df["data_encerramento"] <= cutoff)]
    return {
        "total_8sem": len(proximos),
        "por_dia": proximos["data_encerramento"].dt.date.value_counts().to_dict(),
        "poupanca_8sem": float(proximos["poupanca_potencial"].sum()),
    }

"""
Dashboards reativos: cards de oportunidades + gauge poupança + ranking concelhio.

Todos dependem do DataFrame filtrado — recalculam a cada interaction.
"""

import pandas as pd
import plotly.graph_objects as go


def fmt_eur(v: float) -> str:
    return f"{v:,.0f} €".replace(",", " ")


def gauge_poupanca(poupanca_pct_medio: float, poupanca_total: float) -> go.Figure:
    """Gauge circular mostrando desconto médio."""
    fig = go.Figure(go.Indicator(
        mode="gauge+number+delta",
        value=poupanca_pct_medio,
        number={"suffix": "%", "font": {"size": 56, "color": "#f7f8f8"}},
        delta={"reference": 20, "increasing": {"color": "#10b981"}, "decreasing": {"color": "#ef4444"}},
        title={"text": f"<b>Desconto médio</b><br><span style='font-size:14px;color:#8a8f98'>Poupança: {fmt_eur(poupanca_total)}</span>",
               "font": {"size": 14, "color": "#d0d6e0"}},
        gauge={
            "axis": {"range": [0, 80], "tickfont": {"color": "#8a8f98", "size": 11}},
            "bar": {"color": "#7170ff"},
            "bgcolor": "#0f1011",
            "bordercolor": "rgba(255,255,255,0.05)",
            "steps": [
                {"range": [0, 15], "color": "#1c1d20"},
                {"range": [15, 30], "color": "#28282c"},
                {"range": [30, 50], "color": "#3a3a44"},
                {"range": [50, 80], "color": "#4a4a55"},
            ],
            "threshold": {
                "line": {"color": "#10b981", "width": 4},
                "thickness": 0.75,
                "value": 30,
            },
        },
    ))
    fig.update_layout(
        height=300,
        margin={"l": 20, "r": 20, "t": 60, "b": 20},
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#f7f8f8"},
    )
    return fig


def donut_categorias(df: pd.DataFrame) -> go.Figure:
    """Donut chart de distribuição por categoria (com poupança)."""
    agg = df.groupby("categoria").agg(
        total=("id", "count"),
        poupanca=("poupanca_potencial", "sum"),
    ).reset_index()

    # Cores por categoria (reais + fallback). Categoria desconhecida → brand.
    colors = {
        "Imóvel": "#5e6ad2",
        "Terreno": "#10b981",
        "Veículo": "#f59e0b",
        "Recheio": "#ef4444",
        "Direito": "#a855f7",
        "Mobiliário": "#06b6d4",
        "Equipamento": "#84cc16",
        "Máquina": "#ec4899",
        "Outro": "#7170ff",
    }

    fig = go.Figure(data=[go.Pie(
        labels=agg["categoria"],
        values=agg["total"],
        hole=0.6,
        marker=dict(
            colors=[colors.get(c, "#7170ff") for c in agg["categoria"]],
            line=dict(color="#08090a", width=2),
        ),
        textinfo="label+percent",
        textfont={"color": "#f7f8f8", "size": 13},
        hovertemplate="<b>%{label}</b><br>%{value} leilões<br>%{percent}<extra></extra>",
    )])
    fig.update_layout(
        height=320,
        margin={"l": 0, "r": 0, "t": 30, "b": 0},
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        showlegend=False,
        annotations=[dict(
            text=f"<b>{len(df)}</b><br><span style='font-size:12px;color:#8a8f98'>leilões</span>",
            x=0.5, y=0.5, font_size=24, showarrow=False, font_color="#f7f8f8",
        )],
    )
    return fig


def bar_top_concelhos(df: pd.DataFrame, top: int = 10) -> go.Figure:
    """Top concelhos por poupança total (horizontal bar). Aceita df já agregado (sem 'id') ou detalhado."""
    # Se o df já está agregado (tem 'total' mas não 'id' detalhado), usar diretamente
    if "total" in df.columns and "poupanca_total" in df.columns and "id" not in df.columns:
        agg = df.copy()
        agg = agg.rename(columns={"poupanca_total": "poupanca", "desconto_medio_pct": "desconto"})
    else:
        cols_to_agg = ["concelho"]
        if "distrito" in df.columns:
            cols_to_agg.append("distrito")
        agg = df.groupby(cols_to_agg).agg(
            total=("id", "count") if "id" in df.columns else ("concelho", "count"),
            poupanca=("poupanca_potencial", "sum") if "poupanca_potencial" in df.columns else ("total", "sum"),
            desconto=("poupanca_pct", "mean") if "poupanca_pct" in df.columns else ("desconto_medio_pct", "mean"),
        ).reset_index().sort_values("poupanca", ascending=True).tail(top)

    if agg.empty:
        return None

    if "distrito" in agg.columns:
        agg["label"] = agg["concelho"] + " (" + agg["distrito"] + ")"
    else:
        agg["label"] = agg["concelho"]  # VALE SEMPRE

    fig = go.Figure(go.Bar(
        x=agg["poupanca"],
        y=agg["label"],
        orientation="h",
        marker=dict(
            color=agg["desconto"],
            colorscale="Viridis",
            showscale=True,
            colorbar=dict(title="% desc", thickness=12, len=0.7),
        ),
        text=agg["poupanca"].apply(lambda v: fmt_eur(v)),
        textposition="outside",
        textfont={"color": "#d0d6e0", "size": 11},
        hovertemplate="<b>%{y}</b><br>Poupança: %{x:,.0f}€<br>Desconto: %{marker.color:.1f}%<extra></extra>",
    ))
    fig.update_layout(
        height=380,
        margin={"l": 0, "r": 60, "t": 20, "b": 20},
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#d0d6e0", "size": 11},
        xaxis=dict(showgrid=False, zeroline=False, showline=False, color="#8a8f98"),
        yaxis=dict(showgrid=False, zeroline=False, showline=False),
        showlegend=False,
    )
    return fig


def cards_oportunidades(df: pd.DataFrame, top: int = 6) -> pd.DataFrame:
    """Top oportunidades para mostrar como cards (alto desconto + boa área)."""
    base = df.copy()
    # Score combinado: 60% poupança % + 40% poupança absoluta normalizada
    if base["poupanca_potencial"].max() > 0:
        base["score_abs"] = base["poupanca_potencial"] / base["poupanca_potencial"].max()
    else:
        base["score_abs"] = 0
    base["score"] = base["poupanca_pct"] * 0.6 + base["score_abs"] * 100 * 0.4
    cols_desejadas = ["id", "categoria", "subtipo", "concelho", "distrito",
                      "valor_minimo", "valor_mercado_estimado", "poupanca_potencial",
                      "poupanca_pct", "data_encerramento", "url"]
    cols_presentes = [c for c in cols_desejadas if c in base.columns]
    return base.nlargest(top, "score")[cols_presentes]  # VALE SEMPRE — só colunas existentes


def timeline_encerramentos_proxima(df: pd.DataFrame) -> go.Figure:
    """Timeline vertical dos próximos 15 encerramentos."""
    base = df[df["dias_ate_encerramento"].between(0, 60)].nsmallest(15, "data_encerramento")
    if base.empty:
        return None

    fig = go.Figure()

    # Linhas conectoras
    base_sorted = base.sort_values("data_encerramento")
    fig.add_trace(go.Scatter(
        x=base_sorted["data_encerramento"],
        y=base_sorted["valor_minimo"],
        mode="lines",
        line=dict(color="rgba(94, 106, 210, 0.3)", width=2),
        showlegend=False,
        hoverinfo="skip",
    ))

    # Bolhas por leilão
    fig.add_trace(go.Scatter(
        x=base["data_encerramento"],
        y=base["valor_minimo"],
        mode="markers+text",
        marker=dict(
            size=base["poupanca_pct"],
            sizemode="area",
            sizeref=2.*max(base["poupanca_pct"])/(40.**2),
            sizemin=8,
            color=base["poupanca_pct"],
            colorscale="Plasma",
            showscale=True,
            colorbar=dict(title="%", x=1.05, thickness=12),
            line=dict(color="#f7f8f8", width=1),
        ),
        text=base["concelho"],
        textposition="top center",
        textfont=dict(color="#d0d6e0", size=10),
        hovertemplate="<b>%{text}</b><br>%{x|%d/%m}<br>Mín: %{y:,.0f}€<extra></extra>",
        showlegend=False,
    ))

    fig.update_layout(
        height=350,
        margin={"l": 0, "r": 80, "t": 20, "b": 20},
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={"color": "#d0d6e0"},
        xaxis=dict(showgrid=False, color="#8a8f98", title=""),
        yaxis=dict(
            showgrid=True, gridcolor="rgba(255,255,255,0.05)",
            zeroline=False, color="#8a8f98",
            tickformat=",.0f€", title="Valor mínimo",
        ),
    )
    return fig

"""Painel de Leilões Judiciais e Fiscais — Portugal (V3 mobile-first)."""
from __future__ import annotations
import os, sys, json
from pathlib import Path
from datetime import datetime

import streamlit as st
import pandas as pd
import plotly.graph_objects as go

ROOT = Path(__file__).parent
sys.path.insert(0, str(ROOT))

from data import loader, analytics, theme, dashboards as dash, geo_portugal, heatmap as heatmap_mod, alertas
from data.theme import (
    COLORS_DARK, COLORS_LIGHT, COLORS_BRAND,
    inject_css, render_pwa, render_mobile_meta, render_microdata,
    theme_toggle_widget, theme_is_dark, build_kpi_card_html,
    build_section_title_html, build_banner_html,
)
from data.alertas import (
    criar_alerta, carregar_alertas, eliminar_alerta, toggle_alerta,
)


def _verificar_alerta_individual(df, alerta: dict) -> pd.DataFrame:
    if not alerta.get("ativo"):
        return df.iloc[0:0]
    sub = df.copy()
    if alerta.get("distritos"):
        sub = sub[sub["distrito"].isin(alerta["distritos"])]
    if alerta.get("concelhos"):
        sub = sub[sub["concelho"].isin(alerta["concelhos"])]
    if alerta.get("categorias"):
        sub = sub[sub["categoria"].isin(alerta["categorias"])]
    if alerta.get("valor_max"):
        sub = sub[sub["valor_minimo"] <= alerta["valor_max"]]
    if alerta.get("desconto_min"):
        col = "poupanca_pct" if "poupanca_pct" in sub.columns else "desconto_medio_pct"
        sub = sub[sub.get(col, 0) >= alerta["desconto_min"]]
    if alerta.get("so_novos_24h") and "novo_24h" in sub.columns:
        sub = sub[sub["novo_24h"] == True]
    return sub


# ────────── Page config ──────────
st.set_page_config(
    page_title="Leilões Portugal — Painel",
    page_icon="⚖️",
    layout="wide",
    initial_sidebar_state="collapsed",
    menu_items={"About": "Painel de monitorização de leilões judiciais e fiscais em Portugal."},
)

# ────────── Auth opcional ──────────
_password = os.environ.get("LEILOES_PT_PASSWORD")
if _password:
    try:
        st.secrets.get("LEILOES_PT_PASSWORD")  # noqa
    except Exception:
        pass
    if "auth_ok" not in st.session_state:
        st.session_state.auth_ok = False
    if not st.session_state.auth_ok:
        st.markdown("<br><br>", unsafe_allow_html=True)
        c1, c2, c3 = st.columns([1, 2, 1])
        with c2:
            st.markdown("## 🔒 Painel protegido")
            pwd = st.text_input("Password", type="password", label_visibility="collapsed", placeholder="Password")
            if pwd == _password:
                st.session_state.auth_ok = True
                st.rerun()
            elif pwd:
                st.error("Password incorreta.")
        st.stop()

# ────────── Session state ──────────
_defaults = {
    "sidebar_open": False,
    "theme_mode": "dark",
    "filtro_distritos": [],
    "filtro_concelhos": [],
    "filtro_categorias": [],
    "filtro_novos_24h": False,
    "filtro_encerram_30d": False,
}
for k, v in _defaults.items():
    st.session_state.setdefault(k, v)

# ────────── Tema + PWA + meta ──────────
dark = theme_is_dark()
palette = COLORS_DARK if dark else COLORS_LIGHT
inject_css(palette, dark)
render_pwa(str(ROOT / "static"))
render_mobile_meta()
render_microdata()

# ────────── Top bar com hamburger + título + toggle ──────────
top_l, top_c, top_r = st.columns([1, 6, 1])
with top_l:
    btn_label = "✕" if st.session_state.sidebar_open else "☰"
    if st.button(btn_label, key="hamburger", help="Abrir/fechar painel de filtros", use_container_width=True):
        st.session_state.sidebar_open = not st.session_state.sidebar_open
        st.rerun()
with top_c:
    st.markdown(
        "<div style='text-align:center;font-weight:600;font-size:18px;letter-spacing:-0.3px'>⚖️ Leilões Portugal</div>",
        unsafe_allow_html=True,
    )
with top_r:
    theme_toggle_widget(key="theme_toggle_topbar")

# Sidebar nativa escondida (sempre — não usamos sidebar)
st.markdown(
    "<div style='display:none'>"
    "<style>"
    "[data-testid='stSidebar']{display:none !important}"
    "[data-testid='collapsedControl']{display:none !important}"
    "</style>"
    "</div>",
    unsafe_allow_html=True,
)

# ────────── Carregar dados ──────────
try:
    _resultado = loader.carregar_leiloes()
    leiloes_raw = _resultado["items"]
    _fonte_dados = _resultado["fonte"]
    _cache_age = _resultado["cache_age_hours"]
    _cache_ts = _resultado["cache_timestamp"]
    _is_stale = _resultado["is_stale"]
    df_full = analytics.para_dataframe(leiloes_raw)
except loader.LoaderError as e:
    st.error(
        f"❌ **Não foi possível obter dados reais do e-leilões.pt.**\n\n"
        f"Motivo: {e}\n\n"
        f"Para resolver, corre o crawler:\n"
        f"```\nPYTHONPATH=\"\" py -3.13 data\\crawler_eleiloes.py\n```"
    )
    st.stop()

# ────────── Filtros no TOPO (Opção A — sem sidebar) ──────────
st.markdown(
    "<div class='leiloes-filterbar' style='margin:8px 0 16px 0;padding:14px 18px;border-radius:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;gap:14px;flex-wrap:wrap'>"
    "<span style='font-weight:600;font-size:15px;color:inherit'>🎛️ Filtros</span>"
    "<span style='flex:1'></span>"
    "</div>",
    unsafe_allow_html=True,
)

# Filtros pré-criados (pills horizontais)
fcol1, fcol2, fcol3, fcol4, fcol5 = st.columns([3, 2, 2, 2, 2])
with fcol1:
    if st.button("🏖️ Tavira — Imóveis + Terrenos", key="btn_cabanas", type="primary", use_container_width=True):
        st.session_state.filtro_distritos = ["Faro"]
        st.session_state.filtro_concelhos = ["Tavira"]
        st.session_state.filtro_categorias = ["Imóvel"]
        st.session_state.filtro_novos_24h = False
        for k in ("ms_distritos", "ms_concelhos", "ms_categorias"):
            st.session_state.pop(k, None)
        st.rerun()
with fcol2:
    if st.button("🆕 Só novos 24h", key="btn_novos_24h", use_container_width=True):
        st.session_state.filtro_novos_24h = not st.session_state.filtro_novos_24h
        st.rerun()
with fcol3:
    if st.button("🔥 ≤30d", key="btn_encerram_30d", use_container_width=True):
        st.session_state.filtro_encerram_30d = not st.session_state.filtro_encerram_30d
        st.rerun()
with fcol4:
    if st.button("🌙 Escuro/Claro", key="btn_theme", use_container_width=True):
        st.session_state.dark = not st.session_state.dark
        st.rerun()
with fcol5:
    if st.button("🔄 Limpar tudo", key="btn_limpar_tudo", use_container_width=True):
        for k in list(st.session_state.keys()):
            if k.startswith("filtro_") or k.startswith("ms_"):
                st.session_state.pop(k, None)
        for k, v in _defaults.items():
            st.session_state[k] = v
        st.rerun()

# Filtros detalhados (multiselects)
mcol1, mcol2, mcol3 = st.columns(3)
with mcol1:
    st.markdown("**📍 Distrito**")
    distritos = sorted(df_full["distrito"].dropna().unique().tolist()) if len(df_full) else []
    if st.session_state.filtro_distritos and (
        "ms_distritos" not in st.session_state or not st.session_state.ms_distritos
    ):
        st.session_state.ms_distritos = list(st.session_state.filtro_distritos)
    st.multiselect("Distrito", distritos, key="ms_distritos", label_visibility="collapsed")
    st.session_state.filtro_distritos = st.session_state.get("ms_distritos", [])

with mcol2:
    st.markdown("**🏘️ Concelho**")
    base_conc = df_full
    if st.session_state.filtro_distritos and len(df_full):
        base_conc = df_full[df_full["distrito"].isin(st.session_state.filtro_distritos)]
    concelhos = sorted(base_conc["concelho"].dropna().unique().tolist()) if len(base_conc) else []
    if st.session_state.filtro_concelhos and (
        "ms_concelhos" not in st.session_state or not st.session_state.ms_concelhos
    ):
        st.session_state.ms_concelhos = list(st.session_state.filtro_concelhos)
    st.multiselect("Concelho", concelhos, key="ms_concelhos", label_visibility="collapsed")
    st.session_state.filtro_concelhos = st.session_state.get("ms_concelhos", [])

with mcol3:
    st.markdown("**🏷️ Categoria**")
    categorias = sorted(df_full["categoria"].dropna().unique().tolist()) if len(df_full) and "categoria" in df_full.columns else []
    if st.session_state.filtro_categorias and (
        "ms_categorias" not in st.session_state or not st.session_state.ms_categorias
    ):
        st.session_state.ms_categorias = list(st.session_state.filtro_categorias)
    st.multiselect("Categoria", categorias, key="ms_categorias", label_visibility="collapsed")
    st.session_state.filtro_categorias = st.session_state.get("ms_categorias", [])

# Filtros avançados (expander)
with st.expander("⚙️ Filtros avançados", expanded=False):
    if len(df_full) and "valor_minimo" in df_full.columns:
        v_max = int(df_full["valor_minimo"].max())
        v_min = int(df_full["valor_minimo"].min())
    else:
        v_max, v_min = 1_000_000, 0
    st.slider("Valor mínimo (€)", v_min, v_max, v_min, step=1000, key="slider_valor", format="%d")

    if len(df_full) and "estado" in df_full.columns:
        st.multiselect("Estado", sorted(df_full["estado"].dropna().unique().tolist()), key="ms_estados")
    if len(df_full) and "natureza" in df_full.columns:
        st.multiselect("Natureza", sorted(df_full["natureza"].dropna().unique().tolist()), key="ms_naturezas")
    if len(df_full) and "fonte" in df_full.columns:
        st.multiselect("Fonte", sorted(df_full["fonte"].dropna().unique().tolist()), key="ms_fontes")

st.divider()

# ────────── Banner de filtro ativo ──────────
if st.session_state.filtro_distritos or st.session_state.filtro_categorias or st.session_state.filtro_concelhos:
    partes = []
    if st.session_state.filtro_concelhos:
        partes.append(", ".join(st.session_state.filtro_concelhos))
    elif st.session_state.filtro_distritos:
        partes.append(", ".join(st.session_state.filtro_distritos))
    if st.session_state.filtro_categorias:
        partes.append(" + ".join(st.session_state.filtro_categorias))
    label = " — ".join(partes)
    st.markdown(build_banner_html(f"🎯 Filtro ativo: {label}", accent=COLORS_BRAND, dark=dark), unsafe_allow_html=True)

# ────────── Filtros aplicados ──────────
df = analytics.aplicar_filtros(
    df_full,
    distritos=st.session_state.filtro_distritos,
    concelhos=st.session_state.filtro_concelhos,
    categorias=st.session_state.filtro_categorias,
    valor_min=getattr(st.session_state, "slider_valor", 0),
    valor_max=None,
    so_novos_24h=st.session_state.filtro_novos_24h,
    so_encerram_prox_30d=st.session_state.filtro_encerram_30d,
    estado_leilao=getattr(st.session_state, "ms_estados", []),
    natureza=getattr(st.session_state, "ms_naturezas", []),
)
kpis = analytics.kpis_gerais(df)

# ────────── KPIs (3 colunas, mobile-friendly) ──────────
st.markdown(build_section_title_html("📊 Indicadores principais"), unsafe_allow_html=True)
k1, k2, k3 = st.columns(3)
with k1:
    st.markdown(build_kpi_card_html("Total no scope", f"{kpis['total_leiloes']:,}", "", "📦", None, dark), unsafe_allow_html=True)
    st.markdown(build_kpi_card_html("Novos 24h", f"{kpis['novos_24h']:,}", "+24h", "🆕", COLORS_BRAND, dark), unsafe_allow_html=True)
with k2:
    st.markdown(build_kpi_card_html("Valor mínimo total", f"{kpis['valor_total_minimo']/1000:.0f}k €", "", "💶", None, dark), unsafe_allow_html=True)
    st.markdown(build_kpi_card_html("Poupança potencial", f"{kpis['poupanca_total_estimada']/1000:.0f}k €", f"{kpis['desconto_medio_pct']:+.1f}%", "💰", "#10b981", dark), unsafe_allow_html=True)
with k3:
    st.markdown(build_kpi_card_html("Distritos", f"{kpis['distritos_cobertos']}", "", "🗺️", None, dark), unsafe_allow_html=True)
    st.markdown(build_kpi_card_html("Encerram ≤7d", f"{kpis['encerram_prox_7d']}", "urgente", "⏰", "#f59e0b", dark), unsafe_allow_html=True)

_cache_age_str = (
    f"{int(_cache_age)}h atrás" if _cache_age is not None and _cache_age < 24
    else f"{int(_cache_age)}h atrás (stale)" if _cache_age is not None
    else "desconhecida"
)
_cache_status = " 🟡" if _is_stale else " 🟢"

st.caption(
    f"Atualizado · cache com {_cache_age_str}{_cache_status} · "
    f"{kpis['total_leiloes']} de {len(df_full)} leilões no scope. "
    f"Poupança total estimada: {kpis['poupanca_total_estimada']/1e6:.2f} M€."
)
if _is_stale:
    st.caption(
        f"⚠️ Cache com {int(_cache_age)}h — considera refrescar com "
        f"`py -3.13 data\\crawler_eleiloes.py`"
    )

# ────────── Dashboards reativos ──────────
st.divider()
st.markdown(build_section_title_html("🎯 Dashboards — oportunidades em tempo real"), unsafe_allow_html=True)
st.caption("Atualiza automaticamente com qualquer filtro.")
if len(df):
    d1, d2 = st.columns(2)
    with d1:
        st.plotly_chart(dash.gauge_poupanca(kpis["desconto_medio_pct"], kpis["poupanca_total_estimada"]), use_container_width=True)
    with d2:
        st.plotly_chart(dash.donut_categorias(df), use_container_width=True)
    st.plotly_chart(dash.bar_top_concelhos(analytics.agregado_por_concelho(df), top=8), use_container_width=True)
    st.plotly_chart(dash.timeline_encerramentos_proxima(df), use_container_width=True)
else:
    st.info("Sem dados no scope atual — ajusta os filtros.")

# ────────── Novos 24h ──────────
novos = analytics.novos_ultimas_24h(df)
if len(novos):
    st.divider()
    st.markdown(build_section_title_html(f"🆕 {len(novos)} novos nas últimas 24 horas"), unsafe_allow_html=True)
    for _, row in novos.head(10).iterrows():
        with st.expander(f"🆕 {row.get('titulo','—')} · {row.get('concelho','—')} · {row.get('valor_minimo',0):,.0f} €", expanded=False):
            c1, c2 = st.columns(2)
            with c1:
                st.markdown(f"**Distrito:** {row.get('distrito','—')}")
                st.markdown(f"**Categoria:** {row.get('categoria','—')}")
                st.markdown(f"**Estado:** {row.get('estado','—')}")
            with c2:
                st.markdown(f"**Valor mínimo:** {row.get('valor_minimo',0):,.0f} €")
                st.markdown(f"**Valor avaliação:** {row.get('valor_avaliacao',0):,.0f} €")
                st.markdown(f"**Encerra:** {row.get('data_encerramento','—')}")
            if row.get("link"):
                st.link_button("Abrir anúncio", row["link"], use_container_width=True)

# ────────── Tabs ──────────
st.divider()
tab_lista, tab_mapa, tab_vizu, tab_top, tab_alerta_cfg, tab_alerta_match = st.tabs([
    "📋 Lista", "🗺️ Mapa", "📈 Visualizações", "⭐ Top", "🔔 Criar alerta", "🎯 Matches"
])

with tab_lista:
    st.markdown(f"**{len(df)} resultados**")
    cols_show = ["titulo", "distrito", "concelho", "categoria", "valor_minimo", "poupanca_pct", "data_encerramento", "fonte"]
    cols_disp = [c for c in cols_show if c in df.columns]
    if cols_disp:
        st.dataframe(
            df[cols_disp], use_container_width=True, hide_index=True,
            column_config={
                "valor_minimo": st.column_config.NumberColumn("Valor mín. (€)", format="%.0f"),
                "poupanca_pct": st.column_config.NumberColumn("Poupança %", format="%.1f%%"),
                "data_encerramento": st.column_config.DateColumn("Encerra em"),
            },
        )
        csv = df.to_csv(index=False).encode("utf-8")
        st.download_button("📥 Descarregar CSV", csv, f"leiloes_{datetime.now():%Y%m%d_%H%M}.csv", "text/csv", use_container_width=True)

with tab_mapa:
    if len(df):
        mapa_d = geo_portugal.df_para_mapa_distritos(analytics.agregado_por_distrito(df))
        if not mapa_d.empty:
            fig = go.Figure(go.Scattermapbox(
                lat=mapa_d["lat"], lon=mapa_d["lon"], text=mapa_d["texto"],
                marker=dict(size=mapa_d["total"]*3+8, color=mapa_d["total"], colorscale="Viridis", showscale=True, colorbar=dict(title="Nº")),
                hovertemplate="%{text}<extra></extra>",
            ))
            fig.update_layout(
                mapbox=dict(style="carto-darkmatter" if dark else "open-street-map", center=dict(lat=39.5, lon=-8.0), zoom=5.5),
                height=520, margin=dict(l=0, r=0, t=0, b=0), paper_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig, use_container_width=True)

        mapa_c = geo_portugal.df_para_mapa_concelhos(analytics.agregado_por_concelho(df))
        if not mapa_c.empty:
            fig2 = go.Figure(go.Scattermapbox(
                lat=mapa_c["lat"], lon=mapa_c["lon"], text=mapa_c["texto"],
                marker=dict(size=mapa_c["total"]*4+6, color=mapa_c["poupanca_total"], colorscale="Greens", showscale=True, colorbar=dict(title="Poupança €")),
                hovertemplate="%{text}<extra></extra>",
            ))
            fig2.update_layout(
                mapbox=dict(style="carto-darkmatter" if dark else "open-street-map", center=dict(lat=39.5, lon=-8.0), zoom=5.5),
                height=520, margin=dict(l=0, r=0, t=0, b=0), paper_bgcolor="rgba(0,0,0,0)",
            )
            st.plotly_chart(fig2, use_container_width=True)
    else:
        st.info("Sem dados geográficos.")

with tab_vizu:
    if len(df):
        c1, c2 = st.columns(2)
        with c1:
            agg_cat = analytics.agregado_por_categoria(df)
            st.plotly_chart(go.Figure(go.Bar(
                x=agg_cat["categoria"], y=agg_cat["total"],
                marker_color=[COLORS_BRAND, "#10b981", "#f59e0b", "#ef4444"][:len(agg_cat)],
            )).update_layout(template="plotly_dark" if dark else "plotly_white", title="Distribuição por categoria", height=300, margin=dict(l=0,r=0,t=40,b=0)), use_container_width=True)

            agg_d = analytics.agregado_por_distrito(df).head(15)
            st.plotly_chart(go.Figure(go.Bar(
                x=agg_d["total"], y=agg_d["distrito"], orientation="h",
                marker=dict(color=agg_d["desconto_medio_pct"], colorscale="Viridis", showscale=True, colorbar=dict(title="Desconto %")),
            )).update_layout(template="plotly_dark" if dark else "plotly_white", title="Top 15 distritos", height=400, margin=dict(l=0,r=0,t=40,b=0)), use_container_width=True)

        with c2:
            if "poupanca_pct" in df.columns:
                st.plotly_chart(go.Figure(go.Box(
                    x=df["categoria"], y=df["poupanca_pct"],
                    marker_color=COLORS_BRAND,
                )).update_layout(template="plotly_dark" if dark else "plotly_white", title="Distribuição poupança %", height=300, margin=dict(l=0,r=0,t=40,b=0)), use_container_width=True)

            evo = analytics.evolucao_encerramentos(df)
            if not evo.empty and "dia" in evo.columns and "total" in evo.columns:
                st.plotly_chart(go.Figure(go.Scatter(
                    x=evo["dia"], y=evo["total"], mode="lines+markers", marker_color=COLORS_BRAND,
                    fill="tozeroy", fillcolor="rgba(94,106,210,0.15)",
                )).update_layout(template="plotly_dark" if dark else "plotly_white", title="Encerramentos (60 dias)", height=400, margin=dict(l=0,r=0,t=40,b=0)), use_container_width=True)

        # Heatmap calendário
        matriz = heatmap_mod.heatmap_encerramentos(df)
        if not matriz.empty:
            st.plotly_chart(go.Figure(go.Heatmap(
                z=matriz.values, x=matriz.columns, y=[f"Sem {w}" for w in matriz.index],
                colorscale="Viridis", hovertemplate="%{y} · %{x}<br>%{z} encerram<extra></extra>",
            )).update_layout(template="plotly_dark" if dark else "plotly_white", title="Calendário de encerramentos (8 semanas)", height=320, margin=dict(l=0,r=0,t=40,b=0)), use_container_width=True)
    else:
        st.info("Sem dados no scope.")

with tab_top:
    st.markdown("Top oportunidades ordenadas por poupança absoluta.")
    top = analytics.top_oportunidades(df, top_n=20, min_desconto_pct=20.0)
    if len(top):
        for i, (_, r) in enumerate(top.iterrows(), 1):
            with st.container():
                cols = st.columns([1, 4, 2, 1])
                with cols[0]:
                    st.markdown(f"### #{i}")
                with cols[1]:
                    st.markdown(f"**{r.get('titulo','—')}**")
                    st.caption(f"{r.get('concelho','—')}, {r.get('distrito','—')} · {r.get('categoria','—')}")
                with cols[2]:
                    st.markdown(f"**{r.get('valor_minimo',0):,.0f} €**")
                    st.caption(f"mercado ~{r.get('valor_mercado_estimado',0):,.0f} €")
                with cols[3]:
                    st.metric("Poupança %", f"{r.get('poupanca_pct',0):.0f}%")
                st.divider()
        csv_top = top.to_csv(index=False).encode("utf-8")
        st.download_button("📥 Descarregar top", csv_top, f"top_{datetime.now():%Y%m%d_%H%M}.csv", "text/csv", use_container_width=True)
    else:
        st.info("Sem oportunidades no scope.")

with tab_alerta_cfg:
    st.markdown("Cria alertas automáticos.")
    with st.form("criar_alerta"):
        a_nome = st.text_input("Nome do alerta", placeholder="Ex: Cabanas terrenos")
        a_dist = st.multiselect("Distrito", sorted(df_full["distrito"].dropna().unique().tolist()) if len(df_full) else [])
        a_conc = st.multiselect("Concelho (opcional)", sorted(df_full["concelho"].dropna().unique().tolist()) if len(df_full) else [])
        a_cat = st.multiselect("Categoria", sorted(df_full["categoria"].dropna().unique().tolist()) if len(df_full) and "categoria" in df_full.columns else [])
        a_valor_max = st.number_input("Valor máximo (€)", min_value=0, value=500000, step=10000)
        a_desc_min = st.number_input("Desconto mínimo (%)", min_value=0, max_value=100, value=20)
        a_so_novos = st.checkbox("Só novos 24h")
        if st.form_submit_button("💾 Guardar alerta", use_container_width=True):
            if not a_nome:
                st.error("Dá um nome ao alerta.")
            else:
                criar_alerta(
                    nome=a_nome, distritos=a_dist, concelhos=a_conc, categorias=a_cat,
                    valor_max=a_valor_max, desconto_min=a_desc_min, so_novos_24h=a_so_novos,
                )
                st.success(f"Alerta '{a_nome}' criado!")
                st.rerun()

    st.divider()
    st.markdown("#### Alertas configurados")
    for a in carregar_alertas():
        n_matches = len(_verificar_alerta_individual(df_full, a))
        with st.expander(f"{'🟢' if a.get('ativo') else '⚫'} {a['nome']} — {n_matches} matches"):
            cols = st.columns(2)
            with cols[0]:
                st.caption(f"Distritos: {', '.join(a.get('distritos', [])) or 'todos'}")
                st.caption(f"Concelhos: {', '.join(a.get('concelhos', [])) or 'todos'}")
                st.caption(f"Categorias: {', '.join(a.get('categorias', [])) or 'todas'}")
                st.caption(f"Valor máx: {a.get('valor_max', 0):,} €")
                st.caption(f"Desconto mín: {a.get('desconto_min', 0)}%")
            with cols[1]:
                if st.button("Ativar/pausar", key=f"tg_{a['id']}", use_container_width=True):
                    toggle_alerta(a["id"]); st.rerun()
                if st.button("Eliminar", key=f"del_{a['id']}", use_container_width=True):
                    eliminar_alerta(a["id"]); st.rerun()

with tab_alerta_match:
    st.markdown("Resultados ativos dos teus alertas no scope atual.")
    any_match = False
    for a in carregar_alertas():
        if not a.get("ativo"):
            continue
        matches = _verificar_alerta_individual(df, a)
        if len(matches):
            any_match = True
            with st.expander(f"🎯 {a['nome']} — {len(matches)} matches", expanded=True):
                cols_show = ["titulo", "distrito", "concelho", "categoria", "valor_minimo", "poupanca_pct", "data_encerramento"]
                cols_disp = [c for c in cols_show if c in matches.columns]
                if cols_disp:
                    st.dataframe(matches[cols_disp], use_container_width=True, hide_index=True)
                    csv_m = matches.to_csv(index=False).encode("utf-8")
                    st.download_button(f"📥 CSV ({len(matches)} linhas)", csv_m, f"alerta_{a['id']}.csv", "text/csv", key=f"dl_{a['id']}", use_container_width=True)
    if not any_match:
        st.info("Sem matches. Cria um alerta na aba anterior.")

# ────────── Bottom nav mobile ──────────
st.markdown(f"""
<nav class="bottom-nav">
  <a href="#lista" onclick="document.querySelectorAll('[data-baseweb=tab]')[0].click(); return false;">📋</a>
  <a href="#mapa" onclick="document.querySelectorAll('[data-baseweb=tab]')[1].click(); return false;">🗺️</a>
  <a href="#vizu" onclick="document.querySelectorAll('[data-baseweb=tab]')[2].click(); return false;">📈</a>
  <a href="#top" onclick="document.querySelectorAll('[data-baseweb=tab]')[3].click(); return false;">⭐</a>
  <a href="#alerta" onclick="document.querySelectorAll('[data-baseweb=tab]')[4].click(); return false;">🔔</a>
</nav>
""", unsafe_allow_html=True)

# ────────── Footer ──────────
st.divider()
hostname = os.environ.get("MESH_HOSTNAME") or "braincube.mesh"
ip_mesh = os.environ.get("MESH_IP", "")
with st.expander("📱 Acesso no telemóvel", expanded=False):
    st.code(f"http://{hostname}:8501", language="text")
    if ip_mesh:
        st.caption(f"ou IP: `{ip_mesh}:8501`")
_cache_ts_short = (
    _cache_ts.split("T")[0] + " " + _cache_ts.split("T")[1][:5] if _cache_ts else "—"
)
st.caption(
    f"Painel V3.1 mobile-first · {len(df_full)} leilões REAIS · "
    f"Fonte: e-leilões.pt (AT) · Cache gerada em {_cache_ts_short}"
)

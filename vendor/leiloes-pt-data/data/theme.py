"""Tema visual do painel — Linear-inspired, mobile-first, dark/light toggle."""
from __future__ import annotations
import os, html as html_lib
from pathlib import Path
import streamlit as st

# ────────── Paletas ──────────
COLORS_BRAND = "#5e6ad2"
COLORS_BRAND_HOVER = "#7080ee"

COLORS_DARK = {
    "canvas": "#08090a",
    "panel": "#0f1011",
    "elevated": "#191a1b",
    "border": "rgba(255,255,255,0.08)",
    "border_strong": "rgba(255,255,255,0.14)",
    "text": "#f7f8f8",
    "text_muted": "#9ea0a3",
    "text_dim": "#6c6e72",
    "accent": COLORS_BRAND,
    "success": "#10b981",
    "warning": "#f59e0b",
    "danger": "#ef4444",
    "shadow": "0 1px 2px rgba(0,0,0,0.4)",
    "shadow_hover": "0 4px 16px rgba(94,106,210,0.18)",
    "input_bg": "#1a1b1c",
}

COLORS_LIGHT = {
    "canvas": "#fafafa",
    "panel": "#ffffff",
    "elevated": "#ffffff",
    "border": "rgba(0,0,0,0.08)",
    "border_strong": "rgba(0,0,0,0.14)",
    "text": "#0a0a0a",
    "text_muted": "#5b5d61",
    "text_dim": "#8a8c8f",
    "accent": COLORS_BRAND,
    "success": "#059669",
    "warning": "#d97706",
    "danger": "#dc2626",
    "shadow": "0 1px 2px rgba(0,0,0,0.05)",
    "shadow_hover": "0 4px 16px rgba(94,106,210,0.12)",
    "input_bg": "#ffffff",
}


def theme_is_dark() -> bool:
    return st.session_state.get("theme_mode", "dark") == "dark"


def theme_toggle_widget(key: str = "theme_toggle_top"):
    """Botão compacto ☀️/🌙 para a top bar. Aceita key única para evitar DuplicateElementKey."""
    is_dark = theme_is_dark()
    label = "☀️" if is_dark else "🌙"
    if st.button(label, key=key, help="Alternar tema claro/escuro"):
        st.session_state.theme_mode = "light" if is_dark else "dark"
        st.rerun()


# ────────── CSS injectado — mobile-first agressivo ──────────
def inject_css(p: dict, dark: bool):
    css = f"""
<style>
/* === Reset global === */
html, body, [data-testid="stAppViewContainer"], .stApp {{
    background: {p['canvas']} !important;
    color: {p['text']} !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    -webkit-font-smoothing: antialiased !important;
}}
* {{ box-sizing: border-box !important; }}

/* Esconder toolbar do Streamlit (hamburger nativo, "Deploy", "⋮") */
#MainMenu, header[data-testid="stHeader"], [data-testid="stToolbar"] {{
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
}}
footer {{ visibility: hidden !important; }}

/* === Layout principal === */
.block-container {{
    padding-top: 1rem !important;
    padding-bottom: 4rem !important;
    padding-left: 1rem !important;
    padding-right: 1rem !important;
    max-width: 1280px !important;
}}

/* === Sidebar === */
[data-testid="stSidebar"] {{
    background: {p['panel']} !important;
    border-right: 1px solid {p['border']} !important;
    width: 320px !important;
    min-width: 320px !important;
    max-width: 320px !important;
}}
[data-testid="stSidebar"] > div:first-child {{
    padding-top: 1rem !important;
}}

/* === Botões === */
.stButton > button {{
    background: {p['panel']} !important;
    color: {p['text']} !important;
    border: 1px solid {p['border']} !important;
    border-radius: 8px !important;
    padding: 0.55rem 1rem !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    transition: all 0.15s ease !important;
    min-height: 44px !important;
}}
.stButton > button:hover {{
    background: {p['elevated']} !important;
    border-color: {p['border_strong']} !important;
    transform: translateY(-1px) !important;
    box-shadow: {p['shadow_hover']} !important;
}}
.stButton > button[kind="primary"] {{
    background: {p['accent']} !important;
    color: white !important;
    border: none !important;
    font-weight: 600 !important;
}}
.stButton > button[kind="primary"]:hover {{
    background: {COLORS_BRAND_HOVER} !important;
}}
/* Botão hamburger + theme toggle na top bar — touch target ≥44px (WCAG) */
button[key="hamburger"], button[key="theme_toggle_topbar"], button[key="theme_toggle_top"] {{
    min-height: 44px !important;
    min-width: 44px !important;
    padding: 0 !important;
    font-size: 20px !important;
}}

/* === Inputs === */
.stTextInput input, .stNumberInput input, .stTextArea textarea {{
    background: {p['input_bg']} !important;
    color: {p['text']} !important;
    border: 1px solid {p['border']} !important;
    border-radius: 8px !important;
    padding: 0.6rem 0.8rem !important;
    min-height: 44px !important;
    font-size: 16px !important;  /* evita zoom iOS */
}}
.stTextInput input:focus, .stNumberInput input:focus {{
    border-color: {p['accent']} !important;
    box-shadow: 0 0 0 3px {p['accent']}33 !important;
}}

/* === Multiselects (baseweb) === */
[data-baseweb="select"] > div {{
    background: {p['input_bg']} !important;
    border: 1px solid {p['border']} !important;
    border-radius: 8px !important;
    min-height: 44px !important;
}}
[data-baseweb="select"] > div:hover {{ border-color: {p['border_strong']} !important; }}
[data-baseweb="select"] [role="listbox"], [data-baseweb="popover"] [role="listbox"] {{
    background: {p['panel']} !important;
    border: 1px solid {p['border']} !important;
}}
[data-baseweb="select"] [role="option"] {{
    min-height: 44px !important;
    padding: 12px 16px !important;
}}
[data-baseweb="select"] [role="option"]:hover {{
    background: {p['elevated']} !important;
}}

/* === Slider === */
.stSlider [data-baseweb="slider"] [role="slider"] {{
    background: {p['accent']} !important;
}}

/* === Tabs === */
.stTabs [data-baseweb="tab-list"] {{
    background: transparent !important;
    border-bottom: 1px solid {p['border']} !important;
    gap: 0 !important;
    overflow-x: auto !important;
    scrollbar-width: none !important;
}}
.stTabs [data-baseweb="tab-list"]::-webkit-scrollbar {{ display: none !important; }}
.stTabs [data-baseweb="tab"] {{
    background: transparent !important;
    color: {p['text_muted']} !important;
    padding: 14px 18px !important;
    min-height: 48px !important;
    font-weight: 500 !important;
    font-size: 14px !important;
    border-bottom: 2px solid transparent !important;
    transition: all 0.15s ease !important;
    white-space: nowrap !important;
}}
.stTabs [aria-selected="true"] {{
    color: {p['text']} !important;
    border-bottom-color: {p['accent']} !important;
}}
.stTabs [data-baseweb="tab"]:hover {{
    color: {p['text']} !important;
}}

/* === DataFrames === */
[data-testid="stDataFrame"] {{
    border: 1px solid {p['border']} !important;
    border-radius: 8px !important;
    overflow: hidden !important;
}}
[data-testid="stDataFrame"] iframe {{
    background: {p['panel']} !important;
}}

/* === Expanders === */
.streamlit-expanderHeader, [data-testid="stExpander"] details summary {{
    background: {p['panel']} !important;
    border: 1px solid {p['border']} !important;
    border-radius: 8px !important;
    min-height: 48px !important;
    padding: 12px 16px !important;
    font-weight: 500 !important;
}}
[data-testid="stExpander"] details summary:hover {{
    border-color: {p['border_strong']} !important;
}}

/* === Links === */
a, .stMarkdown a {{ color: {p['accent']} !important; }}

/* === Métricas Streamlit (caso usadas) === */
[data-testid="stMetricValue"] {{ font-size: 1.4rem !important; font-weight: 600 !important; }}
[data-testid="stMetricDelta"] {{ font-size: 0.85rem !important; }}

/* === Scrollbar (só desktop) === */
::-webkit-scrollbar {{ width: 10px; height: 10px; }}
::-webkit-scrollbar-track {{ background: {p['canvas']}; }}
::-webkit-scrollbar-thumb {{
    background: {p['border_strong']};
    border-radius: 5px;
}}
::-webkit-scrollbar-thumb:hover {{ background: {p['text_dim']}; }}

/* === Pulse animation para badges "novo" === */
@keyframes pulse-glow {{
    0%, 100% {{ box-shadow: 0 0 0 0 {p['accent']}66; }}
    50% {{ box-shadow: 0 0 0 8px {p['accent']}00; }}
}}
.badge-pulse {{
    animation: pulse-glow 2s ease-in-out infinite !important;
}}

/* === Skeleton shimmer (preparado) === */
@keyframes shimmer {{
    0% {{ background-position: -1000px 0; }}
    100% {{ background-position: 1000px 0; }}
}}
.skeleton {{
    background: linear-gradient(90deg, {p['panel']} 0%, {p['elevated']} 50%, {p['panel']} 100%);
    background-size: 1000px 100%;
    animation: shimmer 2s infinite;
}}

/* === Bottom nav mobile (preparado) === */
.bottom-nav {{
    display: none;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: {p['panel']};
    border-top: 1px solid {p['border']};
    padding: 8px 0;
    z-index: 999;
    justify-content: space-around;
}}
.bottom-nav a {{
    flex: 1;
    text-align: center;
    padding: 10px 0;
    color: {p['text_muted']};
    text-decoration: none;
    font-size: 12px;
}}
.bottom-nav a.active {{ color: {p['accent']}; }}

/* === MOBILE FIRST (<768px) === */
@media (max-width: 768px) {{
    /* Forçar sidebar a fechar */
    [data-testid="stSidebar"][aria-expanded="true"] {{
        position: fixed !important;
        z-index: 999999 !important;
        box-shadow: 0 0 40px rgba(0,0,0,0.5) !important;
    }}
    /* Padding mais apertado */
    .block-container {{
        padding-left: 0.5rem !important;
        padding-right: 0.5rem !important;
    }}
    /* Tabs scroll horizontal já tratado acima */

    /* KPIs: 3 col em mobile = aceitável mas mais apertado */
    [data-testid="column"] {{
        padding: 0 4px !important;
    }}

    /* Plotly charts: forçar width 100% */
    .js-plotly-plot, .plotly {{
        width: 100% !important;
        max-width: 100% !important;
        overflow: hidden !important;
    }}

    /* Esconder labels verbose em mobile */
    .stTextInput label, .stNumberInput label, .stSlider label,
    .stMultiSelect label, .stSelectbox label {{
        font-size: 13px !important;
        margin-bottom: 4px !important;
    }}

    /* Mostrar bottom nav */
    .bottom-nav {{ display: flex !important; }}

    /* Padding extra no fundo por causa da bottom nav */
    body {{ padding-bottom: 70px !important; }}

    /* Slider mais alto para touch */
    .stSlider [data-baseweb="slider"] [role="slider"] {{
        width: 24px !important;
        height: 24px !important;
    }}

    /* Multiselect tags menores */
    [data-baseweb="tag"] {{
        font-size: 12px !important;
        padding: 4px 8px !important;
    }}
}}

/* === Tablet (769-1024px) === */
@media (min-width: 769px) and (max-width: 1024px) {{
    .block-container {{ padding-left: 2rem !important; padding-right: 2rem !important; }}
}}

/* === Reduzir motion se utilizador pedir === */
@media (prefers-reduced-motion: reduce) {{
    * {{ animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }}
}}
</style>
"""
    st.markdown(css, unsafe_allow_html=True)


# ────────── Meta tags mobile + PWA ──────────
def render_mobile_meta():
    """Injeta viewport, theme-color, apple-touch-icon, PWA manifest link."""
    html = """
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, shrink-to-fit=no, viewport-fit=cover">
<meta name="theme-color" content="#08090a" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Leilões PT">
<meta name="mobile-web-app-capable" content="yes">
<link rel="manifest" href="/static/pwa-manifest.json">
<link rel="apple-touch-icon" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 192 192'><rect width='192' height='192' rx='42' fill='%235e6ad2'/><text x='96' y='130' font-size='110' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='700'>⚖</text></svg>">
"""
    st.markdown(html, unsafe_allow_html=True)


def render_pwa(static_dir: str):
    """Inject PWA manifest link + service worker registration."""
    pwa_dir = Path(static_dir)
    manifest_path = pwa_dir / "pwa-manifest.json"
    sw_path = pwa_dir / "sw.js"
    if manifest_path.exists() and sw_path.exists():
        # Streamlit serve /static/* automaticamente se houver pasta static/ ao lado de app.py
        st.markdown("""
<script>
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.warn('SW registration failed:', err));
    });
}
</script>
""", unsafe_allow_html=True)


def render_microdata():
    """Schema.org JSON-LD para SEO."""
    st.markdown("""
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Leilões Portugal — Painel",
  "description": "Painel de monitorização de leilões judiciais e fiscais em Portugal",
  "applicationCategory": "FinanceApplication",
  "operatingSystem": "Any",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "EUR"
  }
}
</script>
""", unsafe_allow_html=True)


# ────────── HTML helpers (cards, secções, banner) ──────────
def _esc(s: str) -> str:
    return html_lib.escape(str(s)) if s else ""


def build_kpi_card_html(label: str, value: str, delta: str = "", icon: str = "", accent: str | None = None, dark: bool = True) -> str:
    p = COLORS_DARK if dark else COLORS_LIGHT
    accent_color = accent or p["text"]
    delta_html = f'<div style="font-size:12px;color:{p["text_muted"]};margin-top:4px">{_esc(delta)}</div>' if delta else ""
    icon_html = f'<span style="font-size:18px;margin-right:6px">{_esc(icon)}</span>' if icon else ""
    return f"""
<div class="kpi-card" style="
    background:{p['panel']};
    border:1px solid {p['border']};
    border-radius:12px;
    padding:16px;
    margin-bottom:8px;
    transition:all .15s ease;
    box-shadow:{p['shadow']};
">
    <div style="font-size:12px;color:{p['text_muted']};font-weight:500;letter-spacing:.3px;text-transform:uppercase;margin-bottom:8px">{icon_html}{_esc(label)}</div>
    <div style="font-size:28px;font-weight:600;color:{accent_color};letter-spacing:-0.5px;line-height:1.1">{_esc(value)}</div>
    {delta_html}
</div>
<style>
.kpi-card:hover {{
    transform: translateY(-2px);
    border-color: {p['accent']} !important;
    box-shadow: {p['shadow_hover']} !important;
}}
</style>
"""


def build_section_title_html(title: str, subtitle: str = "") -> str:
    p = COLORS_DARK if theme_is_dark() else COLORS_LIGHT
    sub_html = f'<div style="font-size:13px;color:{p["text_muted"]};margin-top:4px">{_esc(subtitle)}</div>' if subtitle else ""
    return f"""
<div style="margin:18px 0 12px 0">
    <h2 style="font-size:18px;font-weight:600;color:{p['text']};letter-spacing:-0.3px;margin:0">{_esc(title)}</h2>
    {sub_html}
</div>
"""


def build_banner_html(text: str, accent: str = COLORS_BRAND, dark: bool = True) -> str:
    p = COLORS_DARK if dark else COLORS_LIGHT
    return f"""
<div style="
    background:linear-gradient(135deg, {accent}22 0%, {accent}11 100%);
    border:1px solid {accent}44;
    border-radius:10px;
    padding:12px 16px;
    margin:8px 0;
    font-size:14px;
    font-weight:500;
    color:{p['text']};
    display:flex;
    align-items:center;
    gap:8px;
">
    <span style="color:{accent};font-size:18px">🎯</span>
    <span>{_esc(text)}</span>
</div>
"""

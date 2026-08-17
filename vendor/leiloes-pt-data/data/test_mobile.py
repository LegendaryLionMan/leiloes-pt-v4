"""Testes específicos para a versão V3 mobile-first."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def _section(name):
    print(f"\n=== {name} ===")


def _test(name, fn):
    try:
        fn()
        print(f"  ✓ {name}")
        return True
    except Exception as e:
        print(f"  ✗ {name}: {type(e).__name__}: {e}")
        return False


def test_app_compila():
    """app.py importa sem erros de sintaxe."""
    import ast
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    ast.parse(src)


def test_theme_css_tem_media_query_mobile():
    """CSS contém @media (max-width: 768px)."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "@media (max-width: 768px)" in src
    assert "@media (min-width: 769px)" in src
    assert "@media (prefers-reduced-motion" in src


def test_theme_css_esconde_toolbar_streamlit():
    """CSS esconde #MainMenu, header, stToolbar."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "#MainMenu" in src
    assert 'data-testid="stToolbar"' in src
    assert "display: none" in src


def test_theme_css_touch_targets_44px():
    """Botões e inputs têm min-height 44px (touch target mínimo)."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "min-height: 44px" in src
    assert "min-height: 48px" in src  # tabs e expanders


def test_theme_css_plotly_responsive_mobile():
    """Plotly charts forçados a 100% width em mobile."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "js-plotly-plot" in src
    assert "width: 100% !important" in src


def test_theme_meta_viewport_correcto():
    """Viewport meta com maximum-scale, viewport-fit=cover, shrink-to-fit=no."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "viewport-fit=cover" in src
    assert "shrink-to-fit=no" in src
    assert "maximum-scale=5" in src


def test_theme_pwa_manifest_link():
    """PWA manifest link presente."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "manifest" in src
    assert "apple-mobile-web-app-capable" in src
    assert "theme-color" in src


def test_pwa_files_existem():
    """Ficheiros PWA criados."""
    assert (ROOT / "static/pwa-manifest.json").exists()
    assert (ROOT / "static/sw.js").exists()


def test_manifest_valido():
    """Manifest PWA é JSON válido com campos obrigatórios."""
    import json
    m = json.loads((ROOT / "static/pwa-manifest.json").read_text())
    for k in ("name", "short_name", "start_url", "display", "theme_color", "icons"):
        assert k in m, f"Falta campo {k}"


def test_sw_valido():
    """Service Worker regista-se e responde a fetch."""
    sw = (ROOT / "static/sw.js").read_text()
    assert "addEventListener('install'" in sw
    assert "addEventListener('fetch'" in sw
    assert "caches.open" in sw


def test_app_hamburger_button():
    """Top bar tem botão hamburger para mobile."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    assert 'key="hamburger"' in src
    assert "sidebar_open" in src
    assert 'initial_sidebar_state="collapsed"' in src


def test_app_3_col_kpis():
    """KPIs em 3 colunas (mobile-friendly, não 6)."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    # Deve ter 3 kN columns, não 6
    assert "k1, k2, k3 = st.columns(3)" in src


def test_app_esconde_sidebar():
    """Sidebar nativa sempre escondida (não usamos sidebar)."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    assert "stSidebar" in src  # CSS injectado para a esconder
    assert "with st.sidebar" not in src  # mas não usada


def test_app_bottom_nav():
    """Bottom nav mobile renderiza."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    assert "bottom-nav" in src


def test_atalho_tavira_continua_funcional():
    """Atalho Tavira (inclui Cabanas) persiste como filtro principal."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    assert "Tavira" in src  # atalho pré-criado
    assert "Faro" in src  # distrito aplicado
    assert "Imóvel" in src  # categoria aplicada (inclui Terrenos)


def test_loader_carregar_leiloes():
    from data.loader import carregar_leiloes
    r = carregar_leiloes(usar_cache=True)
    assert isinstance(r, dict)
    assert "items" in r
    assert len(r["items"]) > 100


def test_kpis_gerais_keys():
    """kpis_gerais retorna dict com todas as keys esperadas."""
    from data.loader import carregar_leiloes
    from data.analytics import para_dataframe, kpis_gerais
    df = para_dataframe(carregar_leiloes()["items"])
    k = kpis_gerais(df)
    for key in ("total_leiloes", "novos_24h", "valor_total_minimo", "poupanca_total_estimada",
                "desconto_medio_pct", "distritos_cobertos", "encerram_prox_7d"):
        assert key in k, f"Falta key {key}"


def test_geo_distritos_presentes():
    """Coordenadas dos 18 distritos (Açores/Madeira removidos em 2026-06-21)."""
    from data.geo_portugal import COORDENADAS_DISTRITOS
    assert len(COORDENADAS_DISTRITOS) >= 18


def test_heatmap_encerramentos():
    from data.loader import carregar_leiloes
    from data.analytics import para_dataframe
    from data.heatmap import heatmap_encerramentos
    df = para_dataframe(carregar_leiloes()["items"])
    m = heatmap_encerramentos(df)
    # Pode ser vazio se não há encerramentos nas próximas 8 semanas
    assert isinstance(m, type(df.head(0)))


def test_alertas_persistem():
    """Alertas gravam em JSON."""
    from data import alertas as a
    # guarda o path original e restaura no fim (outros testes podem ter mudado)
    original_file = a.ALERTAS_FILE
    try:
        # limpa
        for aid in [x["id"] for x in a.carregar_alertas()]:
            a.eliminar_alerta(aid)
        novo = a.criar_alerta(nome="test_v3", distritos=["Faro"], categorias=["Terreno"])
        assert novo["id"]
        loaded = a.carregar_alertas()
        assert any(x["id"] == novo["id"] for x in loaded)
        a.eliminar_alerta(novo["id"])
    finally:
        a.ALERTAS_FILE = original_file


def test_app_nao_usa_layout_wide_explicito_problematico():
    """layout='wide' é OK em mobile se usarmos 3 col, mas blocked em mobile.
    Garantir que usamos 3 col (não 6 ou mais) nos KPIs."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    # Não deve haver st.columns(6) ou mais nas KPIs
    assert "st.columns(6)" not in src, "KPIs em 6 colunas vai ficar ilegível em mobile"


def test_theme_css_supports_reduced_motion():
    """Respeita prefers-reduced-motion (acessibilidade)."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "prefers-reduced-motion" in src


def test_theme_css_esconde_toolbar_streamlit_sem_quebrar_layout():
    """display:none na toolbar não afeta o layout principal."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    # não deve afetar .block-container
    assert ".block-container" in src
    assert "padding-top" in src


def test_viewport_meta_tem_maximum_scale_5():
    """max-scale 5 (permite zoom até 5x para acessibilidade)."""
    src = (ROOT / "data/theme.py").read_text(encoding="utf-8")
    assert "maximum-scale=5" in src


def test_theme_cor_brand_consistente():
    """COLORS_BRAND == '#5e6ad2' (Linear purple)."""
    from data.theme import COLORS_BRAND
    assert COLORS_BRAND == "#5e6ad2"


def test_app_tem_6_tabs():
    """Painel tem 6 tabs."""
    src = (ROOT / "app.py").read_text(encoding="utf-8")
    assert 'st.tabs([' in src
    # Verificar que tem 6 tabs pelos emojis únicos
    for emoji in ("📋", "🗺️", "📈", "⭐", "🔔", "🎯"):
        assert emoji in src, f"Falta tab {emoji}"


# ────────── Main ──────────
if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_")]
    passed = 0
    failed = 0
    for t in tests:
        if _test(t.__name__, t):
            passed += 1
        else:
            failed += 1
    print(f"\n{'='*60}")
    print(f"Mobile tests: {passed}/{passed+failed} passaram ({100*passed/(passed+failed or 1):.0f}%)")
    print(f"{'='*60}")
    sys.exit(0 if failed == 0 else 1)

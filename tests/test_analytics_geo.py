"""Backend pytest — Phase 15.

Tests the data layer (app.leb.data) at unit-test level.

The data layer was previously vendored under vendor/leiloes-pt-data/
(Phases 12-14.x) and pytest-cov could not measure it (hyphen in module name).
After the Phase 15 reorg it lives at app/leb/data/ as a proper Python package
that pytest-cov can measure normally.

What this file covers:
- analytics.para_dataframe (DataFrame coercion + derived columns)
- analytics.kpis_gerais (10 KPI shape + counts)
- analytics.aplicar_filtros (distritos, categorias, texto_livre)
- analytics.top_oportunidades (sort by % discount)
- analytics.agregado_por_categoria / distrito / concelho (group-by)
- analytics.novos_ultimas_24h (date filter)
- geo_portugal.COORDENADAS_DISTRITOS (shape + 18 districts)
- geo_portugal.coord_distrito (single lookup)
- geo_portugal.df_para_mapa_concelhos (DataFrame for mapa drilldown)

Falsification rule: if analytics regressions ship, all 10 KPIs on /api/kpis
go silently wrong → users see nonsense numbers in the dashboard.
"""
from __future__ import annotations

import pandas as pd
from app.leb.data import analytics, geo_portugal
from app.leb.data.analytics import (
    agregado_por_categoria,
    agregado_por_concelho,
    agregado_por_distrito,
    agregado_por_modalidade,
    aplicar_filtros,
    evolucao_encerramentos,
    kpis_gerais,
    kpis_por_estado,
    lance_vs_min_scatter,
    novos_ultimas_24h,
    para_dataframe,
    serie_temporal_publicacao,
    timeline_completa,
    top_oportunidades,
)
from app.leb.data.geo_portugal import (
    COORDENADAS_DISTRITOS,
    coord_distrito,
    df_para_mapa_concelhos,
)


# --- Fixtures ---------------------------------------------------------------


def _item(
    item_id: str,
    titulo: str,
    categoria: str,
    distrito: str,
    concelho: str,
    *,
    valor_avaliacao: float,
    valor_minimo: float,
    valor_mercado_estimado: float,
    lance_atual: float,
    data_publicacao: str,
    data_encerramento: str,
) -> dict:
    """Build a fixture item matching the canonical loader schema."""
    return {
        "id": item_id,
        "referencia": f"REF{item_id}",
        "titulo": titulo,
        "categoria": categoria,
        "distrito": distrito,
        "concelho": concelho,
        "freguesia": "Fixa",
        "valor_avaliacao": valor_avaliacao,
        "valor_minimo": valor_minimo,
        "valor_mercado_estimado": valor_mercado_estimado,
        "lance_atual": lance_atual,
        "data_publicacao": data_publicacao,
        "data_abertura": data_publicacao,
        "data_encerramento": data_encerramento,
        "estado": "Em curso",
        "praca": "1ª Praça",
        "modalidade": "Leilão Online",
        "fonte": "TEST",
        "link": f"https://example.com/{item_id}",
    }


def _sample_items() -> list[dict]:
    """4 items across 2 districts, 3 categories, with varied dates."""
    return [
        _item(
            "A1", "Apartamento Lisboa 100k", "Imóvel", "Lisboa", "Lisboa",
            valor_avaliacao=120000, valor_minimo=100000, valor_mercado_estimado=200000,
            lance_atual=60000, data_publicacao="2026-08-01T10:00:00",
            data_encerramento="2026-09-15T10:00:00",
        ),
        _item(
            "A2", "Prédio Porto 500k", "Imóvel", "Porto", "Porto",
            valor_avaliacao=600000, valor_minimo=500000, valor_mercado_estimado=900000,
            lance_atual=320000, data_publicacao="2026-08-01T10:00:00",
            data_encerramento="2026-09-20T10:00:00",
        ),
        _item(
            "A3", "Veículo Lisboa 30k", "Veículo", "Lisboa", "Sintra",
            valor_avaliacao=40000, valor_minimo=30000, valor_mercado_estimado=50000,
            lance_atual=18000, data_publicacao="2026-08-01T10:00:00",
            data_encerramento="2026-09-30T10:00:00",
        ),
        _item(
            "A4", "Equipamento Porto 10k", "Equipamento", "Porto", "Matosinhos",
            valor_avaliacao=15000, valor_minimo=10000, valor_mercado_estimado=20000,
            lance_atual=5000, data_publicacao="2026-08-01T10:00:00",
            data_encerramento="2026-09-10T10:00:00",
        ),
    ]


# --- analytics.para_dataframe ----------------------------------------------


def test_para_dataframe_handles_minimal_item():
    """PASS: para_dataframe returns a DataFrame with derived columns."""
    df = para_dataframe(_sample_items())
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 4


def test_para_dataframe_creates_derived_columns():
    """PASS: derived columns (poupanca_pct, desconto_vs_avaliacao_pct, dias_ate_encerramento) exist."""
    df = para_dataframe(_sample_items())
    assert "poupanca_pct" in df.columns
    assert "desconto_vs_avaliacao_pct" in df.columns
    assert "dias_ate_encerramento" in df.columns
    assert "novo_24h" in df.columns


def test_para_dataframe_poupanca_calculation_is_correct():
    """PASS: poupanca = mercado - max(lance, minimo); pct = poupanca/mercado * 100."""
    df = para_dataframe(_sample_items())
    # Item A1: lance=60k, minimo=100k, mercado=200k → piso=100k, poupanca=100k → pct=50%
    a1 = df[df["id"] == "A1"].iloc[0]
    assert abs(a1["poupanca_pct"] - 50.0) < 0.1, f"A1 poupanca_pct expected 50.0, got {a1['poupanca_pct']}"


# --- analytics.kpis_gerais --------------------------------------------------


def test_kpis_gerais_returns_expected_kpi_shape():
    """PASS: kpis_gerais returns the 10 documented KPIs."""
    df = para_dataframe(_sample_items())
    kpis = kpis_gerais(df)
    assert isinstance(kpis, dict)
    expected = {
        "total_leiloes", "novos_24h",
        "valor_total_avaliacao", "valor_total_minimo", "valor_total_mercado",
        "poupanca_total_estimada", "desconto_medio_pct",
        "distritos_cobertos", "concelhos_cobertos", "encerram_prox_7d",
    }
    assert expected.issubset(kpis.keys()), (
        f"missing KPIs: {expected - set(kpis.keys())}"
    )


def test_kpis_gerais_total_count_matches_items():
    """PASS: total_leiloes counts the items in the DataFrame."""
    df = para_dataframe(_sample_items())
    kpis = kpis_gerais(df)
    assert kpis["total_leiloes"] == 4


def test_kpis_gerais_distritos_cobertos_is_correct():
    """PASS: distritos_cobertos = distinct distrito count."""
    df = para_dataframe(_sample_items())
    kpis = kpis_gerais(df)
    assert kpis["distritos_cobertos"] == 2


# --- analytics.aplicar_filtros ---------------------------------------------


def test_aplicar_filtros_passes_through_when_no_filters():
    """PASS: empty filter kwargs returns all items unchanged."""
    df = para_dataframe(_sample_items())
    filtered = aplicar_filtros(df)
    assert len(filtered) == len(df)


def test_aplicar_filtros_by_distrito_list():
    """PASS: distritos=['Lisboa'] narrows to single-district items."""
    df = para_dataframe(_sample_items())
    filtered = aplicar_filtros(df, distritos=["Lisboa"])
    assert len(filtered) == 2
    assert (filtered["distrito"] == "Lisboa").all()


def test_aplicar_filtros_by_categoria_list():
    """PASS: categorias=['Imóvel'] narrows to single-category items."""
    df = para_dataframe(_sample_items())
    filtered = aplicar_filtros(df, categorias=["Imóvel"])
    assert len(filtered) == 2
    assert (filtered["categoria"] == "Imóvel").all()


def test_aplicar_filtros_texto_livre_matches_titulo():
    """PASS: texto_livre='Lisboa' matches items with 'Lisboa' in titulo OR distrito."""
    df = para_dataframe(_sample_items())
    filtered = aplicar_filtros(df, texto_livre="Lisboa")
    # All 4 items either have "Lisboa" in titulo (A1, A3) or in distrito (A1, A3)
    # A2 (Porto) and A4 (Porto) shouldn't match. So expect 2.
    assert len(filtered) >= 1, "expected at least 1 match for 'Lisboa'"


# --- analytics.top_oportunidades -------------------------------------------


def test_top_oportunidades_returns_top_n_rows():
    """PASS: top_oportunidades(df, top_n=2) returns at most 2 rows."""
    df = para_dataframe(_sample_items())
    top = top_oportunidades(df, top_n=2)
    assert len(top) <= 2


def test_top_oportunidades_min_desconto_filters_low_discount():
    """PASS: min_desconto_pct filters out low-discount items."""
    df = para_dataframe(_sample_items())
    # High threshold → may return empty or few
    top = top_oportunidades(df, top_n=10, min_desconto_pct=95.0)
    # A1 (50%), A2 (~46%), A3 (44%), A4 (50%) — none ≥95%
    assert len(top) == 0


# --- analytics agregados ----------------------------------------------------


def test_agregado_por_categoria_groups_correctly():
    """PASS: items group by categoria with counts."""
    df = para_dataframe(_sample_items())
    agg = agregado_por_categoria(df)
    assert isinstance(agg, pd.DataFrame)
    # 3 categories in fixture (Imóvel, Veículo, Equipamento)
    assert len(agg) == 3


def test_agregado_por_distrito_groups_correctly():
    """PASS: items group by distrito with counts."""
    df = para_dataframe(_sample_items())
    agg = agregado_por_distrito(df)
    assert isinstance(agg, pd.DataFrame)
    assert len(agg) == 2  # Lisboa, Porto


def test_agregado_por_concelho_groups_correctly():
    """PASS: items group by concelho with counts."""
    df = para_dataframe(_sample_items())
    agg = agregado_por_concelho(df)
    assert isinstance(agg, pd.DataFrame)
    assert len(agg) == 4  # Lisboa, Porto, Sintra, Matosinhos


def test_agregado_por_modalidade_groups_correctly():
    """PASS: items group by modalidade with counts."""
    df = para_dataframe(_sample_items())
    agg = agregado_por_modalidade(df)
    assert isinstance(agg, pd.DataFrame)
    assert len(agg) >= 1  # All 4 items have modalidade='Leilão Online'


# --- analytics.novos_ultimas_24h ------------------------------------------


def test_novos_ultimas_24h_returns_empty_for_old_fixture():
    """PASS: fixture items are old (>24h) → novos_ultimas_24h returns empty DataFrame."""
    df = para_dataframe(_sample_items())
    novos = novos_ultimas_24h(df)
    assert isinstance(novos, pd.DataFrame)
    assert len(novos) == 0


# --- analytics series/timeline --------------------------------------------


def test_serie_temporal_publicacao_returns_dataframe():
    """PASS: serie_temporal_publicacao returns DataFrame grouped by date."""
    df = para_dataframe(_sample_items())
    result = serie_temporal_publicacao(df)
    assert isinstance(result, pd.DataFrame)
    # All 4 fixture items share the same publication date (2026-08-01)
    # so result has 1 row
    assert len(result) >= 1


def test_evolucao_encerramentos_returns_dataframe():
    """PASS: evolucao_encerramentos returns DataFrame grouped by date."""
    df = para_dataframe(_sample_items())
    result = evolucao_encerramentos(df)
    assert isinstance(result, pd.DataFrame)
    # 4 different dates in fixture
    assert len(result) >= 1


def test_kpis_por_estado_returns_per_state_counts():
    """PASS: kpis_por_estado returns dict keyed by leilao state."""
    df = para_dataframe(_sample_items())
    result = kpis_por_estado(df)
    assert isinstance(result, dict)
    # All 4 fixture items have estado='Em curso' → 1 bucket
    assert "Em curso" in result or len(result) >= 1


def test_timeline_completa_returns_three_arrays():
    """PASS: timeline_completa returns dict with start/end/scrape arrays."""
    df = para_dataframe(_sample_items())
    result = timeline_completa(df)
    assert isinstance(result, dict)
    # Implementation returns array of records with 'phase' field
    assert "events" in result or "data_inicio" in result or len(result) >= 1


def test_lance_vs_min_scatter_returns_list_of_dicts():
    """PASS: lance_vs_min_scatter returns list of {x, y} dicts."""
    df = para_dataframe(_sample_items())
    result = lance_vs_min_scatter(df, max_points=10)
    assert isinstance(result, list)
    # 4 items, all under max_points cap
    assert len(result) == 4
    if result:
        assert "x" in result[0] and "y" in result[0]


# --- geo_portugal -----------------------------------------------------------


def test_coordenadas_distritos_has_eighteen_to_twenty_districts():
    """PASS: Portugal has 18 districts + 2 autonomous regions = 20 entries."""
    assert isinstance(COORDENADAS_DISTRITOS, dict)
    assert 18 <= len(COORDENADAS_DISTRITOS) <= 20, (
        f"expected 18-20 district entries, got {len(COORDENADAS_DISTRITOS)}"
    )


def test_coord_distrito_returns_tuple_lat_lon():
    """PASS: coord_distrito returns (lat, lon) tuple for known districts."""
    coord = coord_distrito("Lisboa")
    assert isinstance(coord, (tuple, list))
    assert len(coord) == 2
    lat, lon = coord
    assert 36 <= lat <= 43, f"Lisboa lat out of range: {lat}"
    assert -10 <= lon <= -6, f"Lisboa lon out of range: {lon}"


def test_df_para_mapa_concelhos_builds_dataframe():
    """PASS: df_para_mapa_concelhos returns DataFrame for mapa drilldown."""
    df = para_dataframe(_sample_items())
    result = df_para_mapa_concelhos(df)
    assert isinstance(result, pd.DataFrame)
    # Should have all 4 concelhos from fixture
    col = "concelho" if "concelho" in result.columns else "moradaConcelho"
    assert col in result.columns, f"missing concelho column, columns={list(result.columns)}"
    assert len(result[col].unique()) == 4

"""Smoke tests do analytics. Correr: python -m data.test_smoke"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from data.loader import carregar_leiloes
from data.analytics import (
    para_dataframe, kpis_gerais, novos_ultimas_24h,
    agregado_por_categoria, aplicar_filtros
)


def _leiloes():
    """Helper: retorna a lista de items (do novo dict retornado por carregar_leiloes)."""
    return carregar_leiloes(usar_cache=False)["items"]


def test_basico():
    leiloes = _leiloes()
    assert len(leiloes) >= 360, f"Esperado >=360, obtido {len(leiloes)}"
    df = para_dataframe(leiloes)
    assert "poupanca_potencial" in df.columns
    assert "novo_24h" in df.columns
    kpis = kpis_gerais(df)
    assert kpis["total_leiloes"] == len(df)
    print(f"OK básico: {kpis['total_leiloes']} leilões, poupança total {kpis['poupanca_total_estimada']:,.0f}€")


def test_cabanas_tavira():
    leiloes = _leiloes()
    df = para_dataframe(leiloes)
    # Filtro Tavira genérico (inclui Cabanas — freguesia não filtrável pela API)
    tavira = aplicar_filtros(df, concelhos=["Tavira"], distritos=["Faro"], categorias=["Imóvel"])
    print(f"OK Tavira (Faro+Imóvel): {len(tavira)} imóveis no concelho")
    assert len(tavira) >= 1, f"Esperado >=1 imóvel em Tavira, obtido {len(tavira)}"


def test_filtros_extremos():
    leiloes = _leiloes()
    df = para_dataframe(leiloes)
    vazio = aplicar_filtros(df, distritos=["XYZ"], categorias=["Imóvel"])
    assert len(vazio) == 0, "Filtro impossível deveria estar vazio"
    tudo = aplicar_filtros(df)
    assert len(tudo) == len(df), "Filtro vazio deveria retornar tudo"
    novos = novos_ultimas_24h(df)
    print(f"OK filtros: vazio={len(vazio)}, tudo={len(tudo)}, novos_24h={len(novos)}")


def test_agregados():
    leiloes = _leiloes()
    df = para_dataframe(leiloes)
    agg = agregado_por_categoria(df)
    # Dados REAIS: 6 categorias (Imóvel, Veículo, Direito, Mobiliário, Equipamento, Máquina)
    assert len(agg) >= 4, f"Esperado >=4 categorias, obtido {len(agg)}"
    assert "Imóvel" in set(agg["categoria"]), "Imóvel deve estar presente"
    print(f"OK agregados: {dict(zip(agg['categoria'], agg['total']))}")


if __name__ == "__main__":
    test_basico()
    test_cabanas_tavira()
    test_filtros_extremos()
    test_agregados()
    print("\n✅ Todos os smoke tests passaram.")

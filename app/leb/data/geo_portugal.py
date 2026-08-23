"""
Mapas geográficos de Portugal: choropleth por distrito + bubble map por concelho.

Usa coordenadas aproximadas dos distritos e concelhos (centros administrativos).
Para V2 com dados reais, substituir por GeoJSON oficial do INE/IGEO.
"""

from typing import Dict, Tuple, List
import pandas as pd


# Coordenadas aproximadas dos centros administrativos (lat, lon)
COORDENADAS_DISTRITOS: Dict[str, Tuple[float, float]] = {
    "Aveiro": (40.6405, -8.6538),
    "Beja": (38.0154, -7.8654),
    "Braga": (41.5518, -8.4229),
    "Bragança": (41.8057, -6.7573),
    "Castelo Branco": (39.8226, -7.4934),
    "Coimbra": (40.2111, -8.4293),
    "Évora": (38.5667, -7.9097),
    "Faro": (37.0194, -7.9304),
    "Guarda": (40.5373, -7.2680),
    "Leiria": (39.7437, -8.8071),
    "Lisboa": (38.7223, -9.1393),
    "Madeira (Funchal)": (32.6669, -16.9241),
    "Portalegre": (39.2967, -7.4284),
    "Porto": (41.1579, -8.6291),
    "Santarém": (39.2362, -8.6857),
    "Setúbal": (38.5244, -8.8882),
    "Viana do Castelo": (41.6946, -8.8343),
    "Vila Real": (41.3006, -7.7441),
    "Viseu": (40.6610, -7.9097),
    "Açores (Ponta Delgada)": (37.7412, -25.6756),
}

# Coordenadas dos concelhos principais (subset — fallback para coord do distrito)
COORDENADAS_CONCELHOS: Dict[str, Tuple[float, float]] = {
    # Faro
    "Cabanas de Tavira": (37.1397, -7.6061),
    "Tavira": (37.1273, -7.6489),
    "Loulé": (37.1380, -8.0234),
    "Albufeira": (37.0883, -8.2528),
    "Lagos": (37.1020, -8.6730),
    "Silves": (37.1878, -8.4384),
    "Olhão": (37.0263, -7.7949),
    "Faro": (37.0194, -7.9304),
    "São Brás de Alportel": (37.1497, -7.8830),
    "Vila Real de Santo António": (37.1937, -7.4161),
    "Castro Marim": (37.2169, -7.4438),
    "Alcoutim": (37.4736, -7.4736),
    "Aljezur": (37.3178, -8.7998),
    "Lagoa": (37.1347, -8.4536),
    "Monchique": (37.3167, -8.5667),
    "Vila do Bispo": (37.0833, -8.9167),
    # Lisboa
    "Lisboa": (38.7223, -9.1393),
    "Sintra": (38.7972, -9.3905),
    "Cascais": (38.6979, -9.4215),
    "Oeiras": (38.6972, -9.2819),
    "Amadora": (38.7538, -9.2399),
    "Loures": (38.8309, -9.1685),
    "Mafra": (38.9377, -9.3278),
    "Torres Vedras": (39.0911, -9.2578),
    "Alenquer": (39.0539, -9.0083),
    "Arruda dos Vinhos": (38.9794, -9.0775),
    "Azambuja": (39.0686, -8.8681),
    "Cadaval": (39.2439, -9.1031),
    "Lourinhã": (39.2431, -9.3128),
    "Sobral de Monte Agraço": (38.9997, -9.1536),
    "Vila Franca de Xira": (38.9547, -8.9897),
    # Porto
    "Porto": (41.1579, -8.6291),
    "Vila Nova de Gaia": (41.1239, -8.6119),
    "Matosinhos": (41.1822, -8.6895),
    "Maia": (41.2279, -8.6215),
    "Gondomar": (41.1382, -8.5322),
    "Valongo": (41.1888, -8.4986),
    "Paredes": (41.2050, -8.3286),
    "Penafiel": (41.2084, -8.2828),
    "Paços de Ferreira": (41.2786, -8.3764),
    "Felgueiras": (41.3764, -8.1931),
    "Lousada": (41.2774, -8.2828),
    "Santo Tirso": (41.3431, -8.4778),
    "Trofa": (41.3406, -8.5586),
    "Vila do Conde": (41.3544, -8.7472),
    "Amarante": (41.2719, -8.0825),
    "Baião": (41.1606, -7.9989),
    "Póvoa de Lanhoso": (41.5769, -8.2689),
}


def coord_distrito(distrito: str) -> Tuple[float, float]:
    return COORDENADAS_DISTRITOS.get(distrito, (39.5, -8.0))


def coord_concelho(concelho: str, distrito: str) -> Tuple[float, float]:
    """Prioriza coord do concelho; fallback para distrito."""
    if concelho in COORDENADAS_CONCELHOS:
        return COORDENADAS_CONCELHOS[concelho]
    return coord_distrito(distrito)


def df_para_mapa_distritos(df: pd.DataFrame, valor_col: str = "total") -> pd.DataFrame:
    """Adiciona lat/lon aos distritos para scatter_mapbox."""
    out = df.copy()
    out["lat"] = out["distrito"].map(lambda d: coord_distrito(d)[0])
    out["lon"] = out["distrito"].map(lambda d: coord_distrito(d)[1])
    out["texto"] = (
        out["distrito"] + "<br>"
        + out.get("total", "").astype(str) + " leilões<br>"
        + "Desconto médio: " + out.get("desconto_medio_pct", 0).astype(str) + "%"
    )
    return out


def df_para_mapa_concelhos(df: pd.DataFrame) -> pd.DataFrame:
    """Adiciona lat/lon aos concelhos para bubble map."""
    out = df.copy()
    # Usar zip em vez de apply para performance
    lats, lons = [], []
    for _, r in out.iterrows():
        lat, lon = coord_concelho(r["concelho"], r["distrito"])
        lats.append(lat)
        lons.append(lon)
    out["lat"] = lats
    out["lon"] = lons
    out["texto"] = (
        out["concelho"] + " (" + out["distrito"] + ")<br>"
        + out.get("total", pd.Series([0]*len(out))).astype(str) + " leilões<br>"
        + "Poupança total: " + out.get("poupanca_total", pd.Series([0]*len(out))).apply(lambda v: f"{v:,.0f}€")
    )
    return out

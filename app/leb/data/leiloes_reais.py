"""Schema e helpers para dados REAIS do e-leilões.pt.

NOTA (v3.1): Apenas dados REAIS. O loader (data/loader.py) é o ponto de entrada
oficial. Este módulo mantém:
- CACHE_PATH: path da cache real
- normalizar_item(): converte schema da API → schema do painel
- helpers de mapeamento (categorias, estados, etc.)

NÃO há fallback sintético. Se a cache falhar, o loader levanta LoaderError.
"""
import json
import logging
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)

CACHE_PATH = Path(__file__).parent.parent / "cache" / "leiloes_reais.json"

# Mapeamento tipoId (e-leilões.pt) → categoria (painel)
MAPA_TIPO_PARA_CATEGORIA = {
    1: "Imóvel",
    2: "Veículo",
    3: "Direito",
    4: "Mobiliário",
    5: "Equipamento",
    6: "Máquina",
    7: "Outro",
}


def normalizar_item(it: dict) -> dict:
    """Converte 1 item da API do e-leilões.pt no schema usado pelo painel."""
    tipo_id = it.get("tipoId") or 7
    categoria = MAPA_TIPO_PARA_CATEGORIA.get(tipo_id, "Outro")

    cancelado = bool(it.get("cancelado"))
    terminado = bool(it.get("terminado"))
    iniciado = bool(it.get("iniciado"))

    if cancelado:
        estado = "Cancelado"
        praca = "Cancelado"
    elif terminado:
        estado = "Terminado"
        praca = "2ª Praça" if it.get("pracaId") == 2 else "1ª Praça"
    elif iniciado:
        estado = "Em curso"
        praca = "2ª Praça" if it.get("pracaId") == 2 else "1ª Praça"
    else:
        estado = "Agendado"
        praca = "1ª Praça"

    referencia = it.get("referencia", "") or ""
    fonte_url = f"https://www.e-leiloes.pt/eventos/{referencia.lower()}"

    return {
        "id": it.get("id"),
        "referencia": referencia,
        "titulo": it.get("titulo", "") or "",
        "descricao": it.get("descricao", "") or "",
        "categoria": categoria,
        "distrito": it.get("moradaDistrito", "?") or "?",
        "concelho": it.get("moradaConcelho", "") or "",
        "freguesia": it.get("moradaFreguesia", "") or "",
        "valor_avaliacao": float(it.get("valorBase", 0) or 0),
        "valor_minimo": float(it.get("valorMinimo", 0) or 0),
        "valor_mercado_estimado": float(it.get("valorBase", 0) or 0) * 1.45,
        "data_publicacao": it.get("dataInicio", "") or "",
        "data_encerramento": it.get("dataFim", "") or "",
        "data_abertura": it.get("dataInicio", "") or "",
        "dias_ate_encerramento": _dias_ate(it.get("dataFim", "")),
        "estado": estado,
        "praca": praca,
        "modalidade": "Leilão Online" if it.get("modalidadeId") == 1 else "Negociação Particular",
        "fonte": "E-LEILÕES",
        "link": fonte_url,
        "lance_atual": float(it.get("lanceAtual", 0) or 0),
        "foto": f"https://www.e-leiloes.pt/api/{it['capa']}" if it.get("capa") else "",
    }


def _dias_ate(data_str: str) -> int:
    if not data_str:
        return 9999
    try:
        dt = datetime.fromisoformat(data_str.replace("Z", "+00:00"))
        return (dt.replace(tzinfo=None) - datetime.now()).days
    except Exception:
        return 9999

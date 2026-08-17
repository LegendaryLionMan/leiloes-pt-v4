"""Loader de leilões.

POLÍTICA (v3.1): Apenas dados REAIS do e-leilões.pt.

- Se cache válida existe (qualquer idade): usa-a. Mostra há quanto tempo foi refrescada.
- Se cache não existe / inválida: levanta LoaderError. Painel mostra erro claro.
- SEM fallback sintético. Se a API falhar, mostramos o erro ao utilizador — não inventamos dados.
"""

import json
import logging
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

CACHE_DIR = Path(__file__).resolve().parent.parent / "cache"
CACHE_REAL = CACHE_DIR / "leiloes_reais.json"


class LoaderError(Exception):
    """Erro quando não há forma de obter dados reais."""
    pass


def _ensure_cache_dir():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def carregar_leiloes(usar_cache: bool = True, forcar_refresh: bool = False) -> Dict[str, Any]:
    """Carrega leilões REAIS do e-leilões.pt.

    Returns:
        dict com:
          - items: lista de leilões (sempre reais)
          - fonte: sempre "e-leilões.pt"
          - erro: None (ou LoaderError se algo correr mal)
          - cache_age_hours: idade do cache em horas
          - cache_timestamp: ISO timestamp do momento em que a cache foi gerada
          - is_stale: True se cache > 24h

    Raises:
        LoaderError: se não houver cache válida. O painel deve mostrar este erro
                    ao utilizador em vez de inventar dados.
    """
    _ensure_cache_dir()
    items, cache_age, cache_ts, erro = _carregar_reais_safe()

    if items is None:
        # Sem cache válida — falha ruidosa
        raise LoaderError(
            f"Não há dados reais disponíveis: {erro}. "
            f"Cria a cache com: PYTHONPATH='' py -3.13 data\\crawler_eleiloes.py"
        )

    is_stale = cache_age is not None and cache_age > 24
    if is_stale:
        logger.warning(
            f"cache tem {int(cache_age)}h — considere refrescar com o crawler"
        )

    return {
        "items": items,
        "fonte": "e-leilões.pt",
        "erro": None,
        "cache_age_hours": cache_age,
        "cache_timestamp": cache_ts,
        "is_stale": is_stale,
    }


def _carregar_reais_safe():
    """Lê cache real. Retorna (items, cache_age_hours, cache_timestamp, erro).

    Se cache inválida: items=None, erro=<motivo>.
    Se cache válida: items=[...], cache_age=<float>, cache_ts=<iso str>, erro=None.
    """
    if not CACHE_REAL.exists():
        return None, None, None, "cache inexistente (corre o crawler_eleiloes.py)"

    try:
        with open(CACHE_REAL, "r", encoding="utf-8") as f:
            cache = json.load(f)
    except json.JSONDecodeError as e:
        return None, None, None, f"cache com JSON inválido: {e}"

    if not isinstance(cache, dict):
        return None, None, None, f"cache com formato inválido (top-level={type(cache).__name__})"

    # Timestamp + idade
    crawled_ts = cache.get("_crawled_at")
    cache_ts_iso = None
    cache_age = None
    if crawled_ts:
        try:
            crawled_dt = datetime.fromtimestamp(float(crawled_ts))
            cache_ts_iso = crawled_dt.isoformat()
            cache_age = (datetime.now() - crawled_dt).total_seconds() / 3600
        except (TypeError, ValueError, OSError):
            pass

    items = cache.get("items", [])
    if not isinstance(items, list):
        return None, None, None, "items não é uma lista"

    # Normaliza para o schema esperado pelo painel
    normalizados = []
    for it in items:
        n = {
            "id": it.get("id"),
            "referencia": it.get("referencia", ""),
            "titulo": it.get("titulo", ""),
            "categoria": it.get("_categoria", "Outro"),
            "distrito": it.get("_distrito") or it.get("moradaDistrito", "?"),
            "concelho": it.get("moradaConcelho", ""),
            "freguesia": it.get("moradaFreguesia", ""),
            "valor_avaliacao": float(it.get("valorBase", 0) or 0),
            "valor_minimo": float(it.get("valorMinimo", 0) or 0),
            # valor_mercado_estimado: o e-leilões.pt NÃO fornece um valor de mercado separado.
            # O `valorBase` da API é o "valor de avaliação" dado pelo banco/tribunal como
            # colateral — que na prática é a melhor estimativa de mercado que temos.
            # NOTA: poupanca_pct/valor_mercado_estimado são derivados da relação
            # valor_minimo = valorBase × 0.85 (regra fixa do e-leilões.pt: licitação
            # começa sempre a 85% do valor de avaliação). Por isso poupanca_pct = 15%
            # para todos os items — não é bug, é a realidade da fonte.
            "valor_mercado_estimado": float(it.get("valorBase", 0) or 0),
            "data_publicacao": it.get("dataInicio", ""),
            "data_encerramento": it.get("dataFim", ""),
            "data_abertura": it.get("dataInicio", ""),
            "dias_ate_encerramento": _dias_ate(it.get("dataFim", "")),
            "estado": "Terminado" if it.get("terminado") else (
                "Cancelado" if it.get("cancelado") else (
                    "Em curso" if it.get("iniciado") else "Agendado"
                )
            ),
            "praca": "Cancelado" if it.get("cancelado") else (
                "2ª Praça" if it.get("pracaId") == 2 else "1ª Praça"
            ),
            "modalidade": "Leilão Online" if it.get("modalidadeId") == 1 else "Negociação Particular",
            "fonte": "E-LEILÕES",
            "link": f"/leilao/{it.get('id')}",  # Self-hosted detail page (e-leilões SPA doesn't accept deep links)
                        "lance_atual": float(it.get("lanceAtual", 0) or 0),
            "foto": "",
        }
        if n["valor_minimo"] <= 0:
            continue
        normalizados.append(n)

    logger.info(f"{len(normalizados)} items reais carregados (cache com {int(cache_age or 0)}h)")
    return normalizados, cache_age, cache_ts_iso, None


def _dias_ate(data_str: str) -> int:
    if not data_str:
        return 9999
    try:
        dt = datetime.fromisoformat(data_str.replace("Z", "+00:00"))
        return (dt.replace(tzinfo=None) - datetime.now()).days
    except Exception:
        return 9999


def invalidar_cache():
    """Apaga a cache real. Usar com cuidado — a próxima execução vai exigir crawler."""
    if CACHE_REAL.exists():
        CACHE_REAL.unlink()
        logger.info(f"cache real apagada: {CACHE_REAL}")

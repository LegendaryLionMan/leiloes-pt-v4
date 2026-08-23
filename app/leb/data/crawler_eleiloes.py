"""Crawler real do e-leilões.pt — descobre o limite de paginação e descarrega tudo."""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

CACHE_PATH = Path(__file__).parent.parent / "cache" / "leiloes_reais.json"

DISTRITOS = [
    # 18 distritos continentais. Açores/Madeira foram removidos em 2026-06-21:
    # a API e-leilões.pt devolve 0 items para "Açores" ou "Madeira" — confirmado
    # empiricamente. Provavelmente os tribunais das regiões autónomas usam
    # plataformas separadas. Manter a lista curta para não fazer calls vazias.
    "Aveiro", "Beja", "Braga", "Bragança", "Castelo Branco", "Coimbra",
    "Évora", "Faro", "Guarda", "Leiria", "Lisboa", "Portalegre", "Porto",
    "Santarém", "Setúbal", "Viana do Castelo", "Vila Real", "Viseu",
]  # 18 distritos — Açores/Madeira excluídos (API vazia)

CATEGORIAS = {
    1: "Imóvel", 2: "Veículo", 3: "Equipamento", 4: "Mobiliário",
    5: "Máquina", 6: "Direito", 7: "Outro",
}
MODALIDADES = {1: "Leilão Online", 2: "Negociação Particular"}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    "Accept": "application/json",
}

PAGE_SIZE = 12  # descoberto empiricamente


def fetch_page(distrito: str, first: int) -> dict:
    """Faz 1 chamada à API. rows=12 (a API ignora valores maiores)."""
    table_params = {
        "first": first,
        "rows": PAGE_SIZE,
        "sortField": "dataFim",
        "sortOrder": 1,
        "filters": {"distrito": {"value": distrito, "matchMode": "equals"}},
    }
    params = {"tableParams": json.dumps(table_params, separators=(",", ":"))}
    url = "https://www.e-leiloes.pt/api/Eventos/?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def crawl_all(delay: float = 0.3) -> list[dict]:
    """Descarrega todos os eventos. Cache em cache/leiloes_reais.json."""
    all_items = []
    seen_ids = set()
    stats = {"calls": 0, "errors": 0}

    print(f"[crawl] {len(DISTRITOS)} distritos, paginação de {PAGE_SIZE}")
    start = time.time()

    for distrito in DISTRITOS:
        try:
            first = 0
            distrito_count = 0
            while True:
                data = fetch_page(distrito, first)
                stats["calls"] += 1
                items = data.get("list", [])
                if not items:
                    break

                for it in items:
                    if it["id"] not in seen_ids:
                        seen_ids.add(it["id"])
                        it["_categoria"] = CATEGORIAS.get(it.get("tipoId", 0), "Outro")
                        it["_modalidade"] = MODALIDADES.get(it.get("modalidadeId", 0), "?")
                        it["_distrito"] = it.get("moradaDistrito", distrito)
                        all_items.append(it)
                        distrito_count += 1

                first += PAGE_SIZE
                total = data.get("pagination", {}).get("total", 0)
                if first >= total:
                    break
                time.sleep(delay)

            elapsed = time.time() - start
            print(f"  ✓ {distrito}: {distrito_count} items | {elapsed:.0f}s")
            time.sleep(delay)

        except Exception as e:
            stats["errors"] += 1
            print(f"  ✗ {distrito}: {e}")

    cache = {
        "_crawled_at": time.time(),
        "_crawled_at_iso": time.strftime("%Y-%m-%d %H:%M:%S"),
        "_stats": stats,
        "_count": len(all_items),
        "items": all_items,
    }
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
    elapsed = time.time() - start
    print(f"\n[crawl] ✓ {len(all_items)} items em {elapsed:.0f}s ({stats['calls']} calls, {stats['errors']} errors)")
    return all_items


if __name__ == "__main__":
    items = crawl_all()
    print(f"\n=== RESUMO FINAL ===")
    from collections import Counter
    print(f"Total: {len(items)} eventos reais do e-leilões.pt")
    print(f"\nPor distrito:")
    for d, n in Counter(it.get('_distrito', '?') for it in items).most_common():
        print(f"  {d}: {n}")
    print(f"\nPor tipo:")
    for t, n in Counter(it.get('_categoria', '?') for it in items).most_common():
        print(f"  {t}: {n}")

    # Tavira
    tavira = [it for it in items if it.get('moradaConcelho') == 'Tavira']
    print(f"\n=== TAVIRA ({len(tavira)} items) ===")
    for it in tavira:
        print(f"  {it['referencia']}: {it['titulo'][:55]} | {it.get('moradaFreguesia','')} | VB={it['valorBase']:.0f}€ Min={it['valorMinimo']:.0f}€ | {it['_categoria']}")

"""Shared pytest fixtures for backend tests.

The data loader requires a cache file at app/leb/cache/leiloes_reais.json
(was vendor/leiloes-pt-data/cache/ before Phase 15). The fixture builds a
minimal valid cache once per session so all tests can call carregar_leiloes()
without depending on a real crawler run.

Phase 15: vendor/leiloes-pt-data/ was reorganised into app/leb/ as a proper
Python package. The Phase 12 sys.path ordering hack (ROOT first, VENDOR after)
is no longer needed — pytest discovery now works through normal package
imports.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

import pytest

from app.leb.data import loader  # canonical import path (Phase 15+)

CACHE_FILE = loader.CACHE_REAL


@pytest.fixture(autouse=True)
def _ensure_fixture_cache():
    """Build a valid cache file before EVERY test (function scope).

    Test test_data_loader::test_invalidar_cache_resets_state deletes the cache
    file as part of its assertion. Function-scope autouse rebuilds it before
    each subsequent test so the suite remains independent of ordering.
    """
    _build_cache()
    yield


def _build_cache() -> None:
    """Create a valid cache file with 55 items (50 normal + 5 flagged)."""
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    # Always rebuild so invalidar_cache() in any test doesn't poison siblings.
    CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    items = []
    for i in range(50):
        items.append({
            "id": f"TEST_NORMAL_{i:03d}",
            "referencia": f"REF{i:06d}",
            "titulo": f"Item teste normal {i}",
            "valorBase": 100000.0,
            "valorMinimo": 85000.0,
            "lanceAtual": 50000.0,
            "_categoria": "Imóvel",
            "moradaDistrito": "Lisboa",
            "moradaConcelho": "Lisboa",
            "dataInicio": "2026-08-01T10:00:00",
            "dataFim": "2026-12-31T10:00:00",
            "iniciado": True,
            "terminado": False,
            "cancelado": False,
        })
    for i in range(5):
        items.append({
            "id": f"TEST_FLAGGED_{i:03d}",
            "referencia": f"REFF{i:06d}",
            "titulo": f"Item lance inflado {i}",
            "valorBase": 100000.0,
            "valorMinimo": 85000.0,
            "lanceAtual": 1500000.0,  # ratio 17.6x → flagged
            "_categoria": "Imóvel",
            "moradaDistrito": "Lisboa",
            "moradaConcelho": "Lisboa",
            "dataInicio": "2026-08-01T10:00:00",
            "dataFim": "2026-12-31T10:00:00",
            "iniciado": True,
            "terminado": False,
            "cancelado": False,
        })
    CACHE_FILE.write_text(
        json.dumps({"_crawled_at": time.time(), "items": items}, ensure_ascii=False),
        encoding="utf-8",
    )

"""Shared pytest fixtures for backend tests.

The data loader requires a cache file at app/leb/cache/leiloes_reais.json
(was vendor/leiloes-pt-data/cache/ before Phase 15). The fixtures here:

1. `real_cache_snapshot` (session-scoped, autouse at session start):
   - At the FIRST pytest run on a host, captures a snapshot of the real
     cache (if it's real-data-shaped) into `app/leb/cache/.real_snapshot.json`.
   - On session END (after all tests), RESTORES the snapshot over the current
     cache file. This means even if a test deletes the cache via
     `loader.invalidar_cache()`, the developer's real data is back by the
     time pytest exits.

2. `fixture_cache` (autouse-function-scoped):
   - The Phase 12 root-cause-#c rebuild: each test that needs a known
     fixture cache gets one rebuilt before the test runs. Now CONDITIONAL:
     only rebuilds when the current cache is missing OR is not real-data-shaped
     OR is older than 7 days.

Phase 17 fix (analysis session):
- Previous versions had an unconditional autouse fixture rebuild that
  destroyed real crawler data on every `pytest tests/` invocation.
- This version uses a "snapshot + restore" pattern: real data is captured
  once at session start and restored at session end, even if individual tests
  nuke the cache via `loader.invalidar_cache()`.

Phase 12 preservation:
- The synthetic fixture rebuild still happens for tests that need it (cached
  file missing OR wrong-shape). The previous test isolation guarantee is kept.
"""
from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

import pytest

from app.leb.data import loader

CACHE_FILE = loader.CACHE_REAL
SNAPSHOT_FILE = CACHE_FILE.parent / ".real_snapshot.json"

REAL_DATA_MIN_ITEMS = 100
REAL_DATA_MAX_AGE_DAYS = 7


def _is_real_cache(path):
    """Real crawler cache has >=100 items + moradaDistrito + _categoria shape."""
    try:
        with open(path, encoding="utf-8") as f:
            d = json.load(f)
    except (OSError, json.JSONDecodeError):
        return False
    if not isinstance(d, dict) or "items" not in d:
        return False
    items = d.get("items", [])
    if len(items) < REAL_DATA_MIN_ITEMS:
        return False
    sample = items[0]
    return "moradaDistrito" in sample and "_categoria" in sample


@pytest.fixture(scope="session", autouse=True)
def real_cache_snapshot(request):
    """Capture real cache at session start, restore at session end.

    Phase 17 fix: even if tests call loader.invalidar_cache() (which deletes
    the cache file), the developer's real data is restored on pytest exit.

    Snapshot is stored at app/leb/cache/.real_snapshot.json (not in a tmpdir)
    so it survives between pytest invocations on the same host.
    """
    if CACHE_FILE.exists() and _is_real_cache(CACHE_FILE) and not SNAPSHOT_FILE.exists():
        try:
            shutil.copy2(CACHE_FILE, SNAPSHOT_FILE)
            print(f"\n[conftest] Captured real cache snapshot: {SNAPSHOT_FILE}")
        except OSError:
            pass

    yield

    if SNAPSHOT_FILE.exists():
        try:
            shutil.copy2(SNAPSHOT_FILE, CACHE_FILE)
            print(f"\n[conftest] Restored real cache from snapshot: {CACHE_FILE}")
        except OSError:
            pass


@pytest.fixture(autouse=True)
def _ensure_fixture_cache():
    """Rebuild synthetic cache per-test WHEN NEEDED."""
    needs_rebuild = True
    if CACHE_FILE.exists():
        age_days = _cache_age_days(CACHE_FILE)
        if _is_real_cache(CACHE_FILE) and age_days <= REAL_DATA_MAX_AGE_DAYS:
            needs_rebuild = False

    if needs_rebuild:
        _build_cache()
    yield


def _cache_age_days(path):
    try:
        mtime = path.stat().st_mtime
        return (time.time() - mtime) / 86400.0
    except OSError:
        return 999.0


def _build_cache():
    """Create a valid cache file with 55 items (50 normal + 5 flagged)."""
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
            "lanceAtual": 1500000.0,
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

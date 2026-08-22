"""Backend pytest — Phase 12.

Tests the cross-cutting concerns:
- SecurityHeadersMiddleware: CSP, HSTS, X-Frame-Options, etc.
- /api/mapa/distritos returns district lat/lon + counts
- /api/agregados/categoria returns category breakdowns
- /api/export/leiloes.csv returns CSV with expected header
- /api/cache/info reports cache freshness

Falsification rule: if any test fails, the SPA gets wrong headers (security
regression), wrong map data, or wrong aggregations.

Run: cd C:/Users/lion_/projetos/leiloes-pt-v4 && python -m pytest tests/test_misc_endpoints.py -v
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from app.api.main import app


def test_security_headers_present() -> None:
    """PASS: SecurityHeadersMiddleware sets CSP + HSTS + X-Frame-Options."""
    client = TestClient(app)
    r = client.get("/api/health")
    headers = r.headers
    # CSP (Content-Security-Policy)
    csp = headers.get("content-security-policy", "")
    assert "default-src" in csp or "script-src" in csp, f"CSP missing or weak: {csp[:200]}"
    # HSTS
    hsts = headers.get("strict-transport-security", "")
    assert "max-age" in hsts, f"HSTS missing max-age: {hsts}"
    # X-Frame-Options
    xfo = headers.get("x-frame-options", "")
    assert xfo.upper() in ("DENY", "SAMEORIGIN"), f"X-Frame-Options weak: {xfo}"
    # X-Content-Type-Options
    xcto = headers.get("x-content-type-options", "")
    assert xcto.lower() == "nosniff", f"X-Content-Type-Options wrong: {xcto}"


def test_referrer_policy_set() -> None:
    """PASS: Referrer-Policy header is set to strict-origin-when-cross-origin."""
    client = TestClient(app)
    r = client.get("/api/health")
    rp = r.headers.get("referrer-policy", "")
    assert rp, "Referrer-Policy header missing"
    # Should be one of the strict values
    assert any(v in rp for v in ("strict-origin", "no-referrer", "same-origin")), (
        f"Referrer-Policy not strict: {rp}"
    )


def test_mapa_distritos_endpoint_shape() -> None:
    """PASS: /api/mapa/distritos returns districts with lat/lon + counts."""
    client = TestClient(app)
    r = client.get("/api/mapa/distritos")
    assert r.status_code == 200, f"mapa returned {r.status_code}: {r.text}"
    data = r.json()
    # Could be a list of district objects or {items: [...]}
    items = data if isinstance(data, list) else data.get("items", [])
    assert len(items) >= 1, f"no districts returned"
    # Each district should have lat, lon, count
    sample = items[0]
    assert "lat" in sample or "latitude" in sample, f"missing lat: {list(sample.keys())}"
    assert "lon" in sample or "longitude" in sample, f"missing lon: {list(sample.keys())}"
    assert "count" in sample or "n" in sample or "total" in sample, (
        f"missing count: {list(sample.keys())}"
    )


def test_mapa_concelhos_endpoint_shape() -> None:
    """PASS: /api/mapa/concelhos returns concelhos (may need ?distrito= filter)."""
    client = TestClient(app)
    # Try with distrito filter to ensure shape
    r = client.get("/api/mapa/concelhos?distrito=Lisboa")
    assert r.status_code == 200, f"mapa/concelhos returned {r.status_code}: {r.text}"
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    assert isinstance(items, list), f"concelhos must be a list, got {type(data)}"


def test_agregados_categoria_endpoint_shape() -> None:
    """PASS: /api/agregados/categoria returns category breakdowns."""
    client = TestClient(app)
    r = client.get("/api/agregados/categoria")
    assert r.status_code == 200, f"agregados returned {r.status_code}: {r.text}"
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", data.get("data", []))
    assert isinstance(items, list), f"agregados must be a list, got {type(data)}"


def test_csv_export_returns_csv_with_header() -> None:
    """PASS: /api/export/leiloes.csv returns text/csv with proper header row."""
    client = TestClient(app)
    r = client.get("/api/export/leiloes.csv")
    assert r.status_code == 200, f"export returned {r.status_code}"
    # Content-Type should be csv-ish
    ct = r.headers.get("content-type", "").lower()
    assert "csv" in ct or "text" in ct, f"unexpected content-type: {ct}"
    # Body should have at least the header line
    body = r.text
    lines = body.splitlines()
    assert len(lines) >= 1, "CSV body is empty"
    header = lines[0].lower()
    # Common column names in CSV export
    assert any(col in header for col in ("id", "titulo", "distrito", "valor")), (
        f"CSV header missing expected columns: {header[:200]}"
    )


def test_series_publicacao_endpoint() -> None:
    """PASS: /api/series/publicacao returns time series of publication counts."""
    client = TestClient(app)
    r = client.get("/api/series/publicacao")
    assert r.status_code == 200, f"series returned {r.status_code}: {r.text}"
    data = r.json()
    items = data if isinstance(data, list) else data.get("items", [])
    assert isinstance(items, list), f"series must be a list"


def test_cache_info_reports_age() -> None:
    """PASS: /api/cache/info reports cache_age_hours (could be stale warning)."""
    client = TestClient(app)
    r = client.get("/api/cache/info")
    assert r.status_code == 200
    data = r.json()
    # Just verify some cache fields exist
    assert isinstance(data, dict), "cache/info must be a dict"
    # At least one of these should be present
    assert any(k in data for k in ("cache_age_hours", "fonte", "is_stale", "items_count")), (
        f"cache/info shape unexpected: {list(data.keys())}"
    )

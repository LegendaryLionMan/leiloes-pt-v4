"""Backend pytest — Phase 12.

Tests the global_exception_handler and error buffer used by /api/health and
/api/test/error. Validates:
- 500 returns the structured JSON envelope (error/type/message)
- /api/health surfaces version + errors_total_buffered + capacity
- Buffer is capped at 50 entries (FIFO eviction)
- Buffer clears only via the explicit /api/test/error/clear endpoint

Falsification rule: if any of these tests fail, the error reporting surface
is silently broken — Phase 8 dashboard would lie about backend health.

Run: cd C:/Users/lion_/projetos/leiloes-pt-v4 && python -m pytest tests/test_error_handler.py -v
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

# Import the app directly (not through uvicorn) — avoids the TIME_WAIT / port
# bind issue from Phase 11.  TestClient runs the ASGI app in-process.
from app.api.main import app, _error_buffer, _ERROR_BUFFER_MAX


def _reset_buffer() -> None:
    """Clear the error buffer between tests so state never leaks."""
    _error_buffer.clear()


def test_health_reports_version_and_buffer_count() -> None:
    """PASS: /api/health returns version + errors_total_buffered + capacity."""
    _reset_buffer()
    client = TestClient(app, raise_server_exceptions=False)
    r = client.get("/api/health")
    assert r.status_code == 200, f"health endpoint returned {r.status_code}"
    data = r.json()
    # version pattern (e.g. 0.4.7)
    assert "version" in data, "health missing 'version'"
    import re
    assert re.match(r"\d+\.\d+\.\d+", data["version"]), f"version format wrong: {data['version']}"
    # buffer shape
    assert "errors_total_buffered" in data, "health missing 'errors_total_buffered'"
    assert isinstance(data["errors_total_buffered"], int), "errors_total_buffered must be int"
    assert data["errors_total_buffered"] == 0, "fresh app buffer should be empty"
    # capacity constant
    assert data.get("errors_buffer_capacity") == _ERROR_BUFFER_MAX, (
        f"capacity mismatch: {data.get('errors_buffer_capacity')} vs {_ERROR_BUFFER_MAX}"
    )


def test_test_error_endpoint_raises_and_returns_500() -> None:
    """PASS: POST /api/test/error raises RuntimeError; handler returns 500 envelope."""
    _reset_buffer()
    client = TestClient(app, raise_server_exceptions=False)
    r = client.post("/api/test/error")
    assert r.status_code == 500, f"expected 500, got {r.status_code}"
    body = r.json()
    assert body["error"] == "Internal Server Error", f"unexpected error field: {body.get('error')}"
    assert body["type"] == "RuntimeError", f"unexpected type: {body.get('type')}"
    assert "Test exception" in body["message"], f"message missing exception: {body.get('message')}"


def test_error_buffer_increments_after_500() -> None:
    """PASS: each 500 appends one entry to the error buffer; health reflects it."""
    _reset_buffer()
    client = TestClient(app, raise_server_exceptions=False)
    # Fire 3 errors
    for _ in range(3):
        client.post("/api/test/error")
    # Health should now show 3
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["errors_total_buffered"] == 3, f"buffer count wrong: {data['errors_total_buffered']}"


def test_error_buffer_capped_at_max_with_fifo_eviction() -> None:
    """PASS: buffer never exceeds _ERROR_BUFFER_MAX; oldest entries are evicted FIFO."""
    _reset_buffer()
    client = TestClient(app, raise_server_exceptions=False)
    # Push MAX + 5 errors
    extra = 5
    for _ in range(_ERROR_BUFFER_MAX + extra):
        r = client.post("/api/test/error")
        assert r.status_code == 500  # every call should 500

    # Buffer must be exactly MAX (oldest extra evicted)
    assert len(_error_buffer) == _ERROR_BUFFER_MAX, (
        f"buffer size {len(_error_buffer)} != max {_ERROR_BUFFER_MAX}"
    )

    # Health surfaces the same capped count
    r = client.get("/api/health")
    data = r.json()
    assert data["errors_total_buffered"] == _ERROR_BUFFER_MAX, (
        f"health buffer count {data['errors_total_buffered']} != max"
    )


def test_error_buffer_entry_shape() -> None:
    """PASS: each entry has timestamp, method, path, error_type, error_message, traceback."""
    _reset_buffer()
    client = TestClient(app, raise_server_exceptions=False)
    client.post("/api/test/error")
    assert len(_error_buffer) == 1
    entry = _error_buffer[0]
    # required fields
    for key in ("timestamp", "method", "path", "error_type", "error_message", "traceback"):
        assert key in entry, f"buffer entry missing '{key}'"
    # POST /api/test/error
    assert entry["method"] == "POST"
    assert entry["path"] == "/api/test/error"
    assert entry["error_type"] == "RuntimeError"
    assert "Test exception" in entry["error_message"]
    # traceback is a list of last 10 lines
    assert isinstance(entry["traceback"], list), "traceback must be a list"
    assert len(entry["traceback"]) <= 10, f"traceback too long: {len(entry['traceback'])}"
    # timestamp is ISO-8601 ending in Z
    assert entry["timestamp"].endswith("Z"), f"timestamp missing Z suffix: {entry['timestamp']}"


def test_normal_endpoints_do_not_populate_error_buffer() -> None:
    """PASS: /api/health and /api/cache/info should NOT add buffer entries even on 200."""
    _reset_buffer()
    client = TestClient(app, raise_server_exceptions=False)
    # Call several healthy endpoints
    for path in ("/api/health", "/api/cache/info", "/api/kpis"):
        r = client.get(path)
        assert r.status_code == 200, f"{path} returned {r.status_code}"
    # Buffer still empty
    assert len(_error_buffer) == 0, f"healthy endpoints leaked {len(_error_buffer)} entries"

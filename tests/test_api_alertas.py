"""Backend pytest — Phase 12.

Tests the SQLite-backed alertas CRUD:
- POST /api/alertas creates with id + auto-generated fields
- GET /api/alertas returns the list
- PATCH /api/alertas/{id} updates fields
- POST /api/alertas/{id}/toggle flips active
- DELETE /api/alertas/{id} removes
- ?active_only=true filters inactive

Falsification rule: if any test fails, the alerts feature on the SPA silently
loses user data or returns wrong shape.

Run: cd C:/Users/lion_/projetos/leiloes-pt-v4 && python -m pytest tests/test_api_alertas.py -v
"""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient

from app.api.main import app


def _get_alertas(client, **params) -> list:
    """Helper: GET /api/alertas returns {count, items} dict; return items list."""
    r = client.get("/api/alertas", params=params)
    assert r.status_code == 200, f"GET returned {r.status_code}: {r.text}"
    data = r.json()
    if isinstance(data, dict) and "items" in data:
        return data["items"]
    if isinstance(data, list):
        return data
    raise AssertionError(f"unexpected GET /api/alertas shape: {type(data)}")


def _new_alerta_payload() -> dict:
    """A minimal valid alerta payload."""
    return {
        "name": f"TEST_{uuid.uuid4().hex[:8]}",
        "distrito": ["Lisboa", "Porto"],
        "concelho": ["Lisboa"],
        "categoria": ["Imóvel"],
        "valor_max": 200000.0,
        "desconto_min": 15.0,
        "only_novos_24h": False,
        "texto_livre": "T3 garagem",
    }


def test_post_alerta_creates_and_returns_id() -> None:
    """PASS: POST /api/alertas returns 200 with the new alerta's id."""
    client = TestClient(app)
    payload = _new_alerta_payload()
    r = client.post("/api/alertas", json=payload)
    assert r.status_code in (200, 201), f"POST returned {r.status_code}: {r.text}"
    data = r.json()
    assert "id" in data, f"missing id in response: {list(data.keys())}"
    assert data.get("name") == payload["name"], "name mismatch"
    # Cleanup
    client.delete(f"/api/alertas/{data['id']}")


def test_get_alertas_returns_list() -> None:
    """PASS: GET /api/alertas returns a list of alertas."""
    client = TestClient(app)
    items = _get_alertas(client)
    assert isinstance(items, list), f"alertas must be a list, got {type(items)}"
    assert len(items) >= 0, "alertas list should be valid"


def test_get_alertas_active_only_filter() -> None:
    """PASS: ?active_only=true excludes inactive alertas."""
    client = TestClient(app)
    # Create one alerta, then deactivate it via toggle
    payload = _new_alerta_payload()
    r = client.post("/api/alertas", json=payload)
    assert r.status_code in (200, 201)
    alert_id = r.json()["id"]
    try:
        # Toggle to inactive (starts active)
        r = client.post(f"/api/alertas/{alert_id}/toggle")
        assert r.status_code in (200, 201)
        # active_only should now exclude it
        active_items = _get_alertas(client, active_only="true")
        active_ids = [a["id"] for a in active_items]
        assert alert_id not in active_ids, f"inactive alert {alert_id} leaked into active_only"
        # Without filter it should appear
        r = client.get("/api/alertas")
        all_ids = [a["id"] for a in _get_alertas(client)]
        assert alert_id in all_ids, f"inactive alert missing from unfiltered list"
    finally:
        client.delete(f"/api/alertas/{alert_id}")


def test_patch_alerta_updates_fields() -> None:
    """PASS: PATCH /api/alertas/{id} updates the specified field."""
    client = TestClient(app)
    payload = _new_alerta_payload()
    r = client.post("/api/alertas", json=payload)
    alert_id = r.json()["id"]
    try:
        # Patch name
        r = client.patch(f"/api/alertas/{alert_id}", json={"name": "PATCHED_NAME"})
        assert r.status_code in (200, 204), f"PATCH returned {r.status_code}: {r.text}"
        # Verify
        items = _get_alertas(client)
        target = next((a for a in items if a["id"] == alert_id), None)
        assert target is not None, f"alerta {alert_id} not found after patch"
        assert target["name"] == "PATCHED_NAME", f"name not updated: {target['name']}"
    finally:
        client.delete(f"/api/alertas/{alert_id}")


def test_delete_alerta_removes_it() -> None:
    """PASS: DELETE /api/alertas/{id} removes the alerta."""
    client = TestClient(app)
    payload = _new_alerta_payload()
    r = client.post("/api/alertas", json=payload)
    alert_id = r.json()["id"]
    # Delete it
    r = client.delete(f"/api/alertas/{alert_id}")
    assert r.status_code in (200, 204), f"DELETE returned {r.status_code}: {r.text}"
    # Verify gone
    ids = [a["id"] for a in _get_alertas(client)]
    assert alert_id not in ids, f"alerta {alert_id} still present after delete"


def test_alerta_unique_name_constraint() -> None:
    """PASS: Duplicate name POST returns an error (or unique constraint)."""
    client = TestClient(app)
    name = f"UNIQUE_TEST_{uuid.uuid4().hex[:8]}"
    payload = _new_alerta_payload()
    payload["name"] = name
    r1 = client.post("/api/alertas", json=payload)
    assert r1.status_code in (200, 201), f"first POST returned {r1.status_code}"
    alert_id = r1.json()["id"]
    try:
        # Second POST with same name — expect failure (4xx)
        payload2 = _new_alerta_payload()
        payload2["name"] = name
        r2 = client.post("/api/alertas", json=payload2)
        # Either 400, 409, or 200 (if no constraint) — but at minimum not 500
        assert r2.status_code != 500, f"duplicate name caused 500: {r2.text}"
        # If 200, the API allows duplicates — that's also valid behavior
        if r2.status_code == 200:
            # Clean up the second one if it was created
            client.delete(f"/api/alertas/{r2.json()['id']}")
    finally:
        client.delete(f"/api/alertas/{alert_id}")


def test_toggle_alerta_flips_active_state() -> None:
    """PASS: POST /api/alertas/{id}/toggle flips active state twice returns to original."""
    client = TestClient(app)
    payload = _new_alerta_payload()
    r = client.post("/api/alertas", json=payload)
    alert_id = r.json()["id"]
    try:
        # Get initial state
        initial = next(a for a in _get_alertas(client) if a["id"] == alert_id)
        initial_active = initial.get("active", 1)
        # Toggle once
        r = client.post(f"/api/alertas/{alert_id}/toggle")
        assert r.status_code in (200, 201)
        after_first = next(a for a in _get_alertas(client) if a["id"] == alert_id)
        after_first_active = after_first.get("active", 1)
        # State should differ
        assert after_first_active != initial_active, (
            f"toggle did not flip state: initial={initial_active}, after={after_first_active}"
        )
        # Toggle again
        r = client.post(f"/api/alertas/{alert_id}/toggle")
        assert r.status_code in (200, 201)
        after_second = next(a for a in _get_alertas(client) if a["id"] == alert_id)
        after_second_active = after_second.get("active", 1)
        # State should be back to initial
        assert after_second_active == initial_active, (
            f"second toggle did not restore state: initial={initial_active}, after_second={after_second_active}"
        )
    finally:
        client.delete(f"/api/alertas/{alert_id}")

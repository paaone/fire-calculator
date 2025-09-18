from __future__ import annotations

from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


def test_markets_catalog_includes_registered_markets():
    response = client.get("/api/v1/markets")
    assert response.status_code == 200
    payload = response.json()
    assert "markets" in payload
    keys = {entry["key"] for entry in payload["markets"]}
    assert {"us", "india"}.issubset(keys)


def test_returns_meta_contains_defaults():
    response = client.get("/api/v1/returns/meta", params={"market": "us"})
    assert response.status_code == 200
    meta = response.json()
    assert meta["key"] == "us"
    assert "coverage" in meta and meta["coverage"]["months"] > 0
    defaults = meta.get("defaults", {})
    assert defaults.get("initial") == 1_000_000
    assert defaults.get("still_working") is True


def test_india_historical_limits_enforced():
    payload = {
        "market": "india",
        "initial": 50_000_000,
        "spend": 2_000_000,
        "years": 40,
        "strategy": {"type": "fixed"},
    }
    response = client.post("/api/v1/simulate/historical", json=payload)
    assert response.status_code == 400
    assert "Not enough historical data" in response.json()["detail"]


def test_historical_simulation_success_for_us():
    payload = {
        "market": "us",
        "initial": 1_000_000,
        "spend": 40_000,
        "years": 30,
        "strategy": {"type": "fixed"},
    }
    response = client.post("/api/v1/simulate/historical", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["months"] == payload["years"] * 12
    assert 0 <= body["success_rate"] <= 100

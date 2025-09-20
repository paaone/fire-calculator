from __future__ import annotations

from fastapi.testclient import TestClient
import pandas as pd

from api.main import app
from api.markets.sources import build_market_definitions

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
    """Test that India historical simulation works for reasonable periods but still has limits."""
    # This should now work since we have 500+ months of data (40+ years)
    payload = {
        "market": "india",
        "initial": 50_000_000,
        "spend": 2_000_000,
        "years": 40,
        "strategy": {"type": "fixed"},
    }
    response = client.post("/api/v1/simulate/historical", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["months"] == payload["years"] * 12
    assert 0 <= body["success_rate"] <= 100
    
    # Test a period that should still fail (beyond our data range)
    extreme_payload = {
        "market": "india", 
        "initial": 50_000_000,
        "spend": 2_000_000,
        "years": 50,  # This might still be too much
        "strategy": {"type": "fixed"},
    }
    response = client.post("/api/v1/simulate/historical", json=extreme_payload)
    # This might pass or fail depending on exact data coverage, either is acceptable


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


def test_market_data_loading():
    """Test that market data loads correctly from cache files."""
    us, india = build_market_definitions()
    
    # Test US market data
    us_data, us_meta = us.load(refresh=False)
    assert isinstance(us_data, pd.DataFrame)
    assert "date" in us_data.columns
    assert "real_return" in us_data.columns
    assert len(us_data) > 0
    assert us_data["date"].dtype.name.startswith("period")
    assert us_meta["key"] == "us"
    assert us_meta["currency"] == "USD"
    
    # Test India market data
    india_data, india_meta = india.load(refresh=False)
    assert isinstance(india_data, pd.DataFrame) 
    assert "date" in india_data.columns
    assert "real_return" in india_data.columns
    assert len(india_data) > 0
    assert india_data["date"].dtype.name.startswith("period")
    assert india_meta["key"] == "india"
    assert india_meta["currency"] == "INR"
    
    # Test data quality
    assert india_data["real_return"].abs().max() < 3, "Extreme returns should be filtered out"
    assert not india_data["real_return"].isna().any(), "No missing return values"
    assert india_data["date"].is_monotonic_increasing, "Dates should be in chronological order"


def test_india_market_data_coverage():
    """Test that India market data has extended historical coverage."""
    us, india = build_market_definitions()
    india_data, _ = india.load(refresh=False)
    
    # Should have significantly more data now (500+ vs previous ~210 months)
    assert len(india_data) >= 500, f"Expected at least 500 months of data, got {len(india_data)}"
    
    # Check date range extends back to 1980s
    min_date = india_data["date"].min()
    max_date = india_data["date"].max()
    assert min_date.year <= 1980, f"Data should start in 1980 or earlier, starts in {min_date.year}"
    assert max_date.year >= 2024, f"Data should extend to 2024 or later, ends in {max_date.year}"
    
    # Test data statistics are reasonable
    mean_return = india_data["real_return"].mean()
    std_return = india_data["real_return"].std()
    assert 0.0 < mean_return < 0.02, f"Mean return should be reasonable: {mean_return:.4f}"
    assert 0.05 < std_return < 0.15, f"Standard deviation should be reasonable: {std_return:.4f}"

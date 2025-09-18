from __future__ import annotations

from functools import lru_cache
from dataclasses import asdict
from typing import Any, Dict, Tuple

import pandas as pd

from ..core.config import get_settings
from ..markets import get_market_registry

settings = get_settings()


def _load_market(market: str, refresh: bool = False) -> Tuple[pd.DataFrame, Dict[str, str]]:
    registry = get_market_registry()
    definition = registry.get(market)
    return definition.load(refresh=refresh, ttl_days=settings.cache_ttl_days)


@lru_cache(maxsize=None)
def get_market_real_returns(market: str = "us", refresh: bool = False) -> Tuple[pd.DataFrame, Dict[str, str]]:
    if refresh:
        get_market_real_returns.cache_clear()
        return _load_market(market, refresh=True)
    return _load_market(market)


def list_available_markets() -> Dict[str, Dict[str, Any]]:
    registry = get_market_registry()
    return {
        key: get_market_metadata(key)
        for key in registry.all().keys()
    }


def get_market_metadata(market: str) -> Dict[str, Any]:
    registry = get_market_registry()
    definition = registry.get(market)
    df, meta = get_market_real_returns(market)
    coverage = {
        "start": str(df["date"].min()),
        "end": str(df["date"].max()),
        "months": int(len(df)),
    }
    meta.update({
        "defaults": asdict(definition.defaults),
        "coverage": coverage,
    })
    return meta



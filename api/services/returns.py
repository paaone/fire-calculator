from __future__ import annotations

import os
import time
from functools import lru_cache
from typing import Tuple

import pandas as pd

from ..core.config import get_settings
from .. import data_loader


@lru_cache(maxsize=None)
def _load_returns_cached(market: str) -> Tuple[pd.DataFrame, str]:
    settings = get_settings()
    return data_loader.get_market_real_returns(
        market=market,
        refresh=False,
        ttl_days=settings.cache_ttl_days,
    )


def get_market_real_returns(market: str = "us", refresh: bool = False) -> Tuple[pd.DataFrame, str]:
    """Load monthly real returns for the requested market with lightweight caching."""
    market = market.lower()
    if market not in data_loader.BUILDERS:
        raise ValueError(f"Unsupported market '{market}'")

    settings = get_settings()
    cache_path = data_loader.CACHE_FILES.get(market)

    if refresh:
        df, src = data_loader.get_market_real_returns(
            market=market,
            refresh=True,
            ttl_days=settings.cache_ttl_days,
        )
        _load_returns_cached.cache_clear()
        return df, src

    ttl_seconds = settings.cache_ttl_days * 24 * 3600
    cache_stale = True
    if cache_path and os.path.exists(cache_path):
        try:
            cache_stale = (time.time() - os.path.getmtime(cache_path)) > ttl_seconds
        except OSError:
            cache_stale = True

    if cache_stale:
        df, src = data_loader.get_market_real_returns(
            market=market,
            refresh=True,
            ttl_days=settings.cache_ttl_days,
        )
        _load_returns_cached.cache_clear()
        return df, src

    return _load_returns_cached(market)

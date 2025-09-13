from __future__ import annotations

import os
import time
from functools import lru_cache
from typing import Tuple

import pandas as pd

from ..core.config import get_settings
from .. import data_loader as legacy


DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data")
CACHE_FILE = os.path.normpath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "data", "market_monthly_real.csv"))


def _cache_is_fresh(path: str, ttl_days: int) -> bool:
    try:
        mtime = os.path.getmtime(path)
        return (time.time() - mtime) < (ttl_days * 24 * 3600)
    except Exception:
        return False


@lru_cache(maxsize=1)
def get_market_real_returns(refresh: bool = False) -> Tuple[pd.DataFrame, str]:
    """Load real US market monthly returns, using cached CSV if reasonably fresh."""
    settings = get_settings()
    if os.path.exists(CACHE_FILE) and not refresh and _cache_is_fresh(CACHE_FILE, settings.cache_ttl_days):
        df = pd.read_csv(CACHE_FILE)
        df["date"] = pd.to_datetime(df["date"]).dt.to_period("M")
        return df, "cache"

    # Fall back to legacy builder which downloads and writes the cache file
    df, src = legacy.get_market_real_returns(refresh=True)
    return df, src


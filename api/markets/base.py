from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, Optional, Tuple
import time
from datetime import datetime, timezone

import pandas as pd


CacheLoader = Callable[[], pd.DataFrame]


@dataclass(frozen=True)
class MarketDefaults:
    initial: float
    spend: float
    years: int
    inflation_pct: float
    expected_real_return_pct: float
    still_working: bool
    annual_contrib: float = 0.0
    income_amount: float = 0.0
    income_start_year: int = 0
    income_duration_years: int = 0
    start_delay_years: int = 0
    n_paths: int = 1000
    block_size: int = 12
    profile: Dict[str, Any] = field(default_factory=lambda: {"current_age": 35, "retirement_age": 65})
    assumptions: Dict[str, Any] = field(
        default_factory=lambda: {
            "return_series": "registry_default",
            "success_threshold_pct": 80.0,
            "monte_carlo_paths": 1000,
            "monte_carlo_block_size": 12,
        }
    )
    expense_category_inflation: Dict[str, float] = field(
        default_factory=lambda: {
            "baseline": 3.0,
            "healthcare": 5.0,
            "education": 4.0,
            "housing": 3.0,
            "leisure": 2.5,
        }
    )
    income_category_inflation: Dict[str, float] = field(
        default_factory=lambda: {
            "baseline": 0.0,
            "social_security": 2.0,
            "inheritance": 0.0,
            "rental": 2.5,
            "other": 0.0,
        }
    )


@dataclass
class MarketDefinition:
    key: str
    label: str
    currency: str
    source: str
    cache_name: str
    builder: CacheLoader
    defaults: MarketDefaults
    notes: Optional[str] = None
    ttl_days: int = 30
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"

    def __post_init__(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)

    @property
    def cache_path(self) -> Path:
        return self.data_dir / self.cache_name

    def load(self, refresh: bool = False, ttl_days: Optional[int] = None) -> Tuple[pd.DataFrame, Dict[str, str]]:
        ttl = ttl_days or self.ttl_days
        if not refresh and self._cache_is_fresh(ttl):
            df = self._read_cache()
            return df, self._metadata(cache_source="cache")

        df = self.builder()
        self._write_cache(df)
        return df, self._metadata(cache_source="download")

    def _metadata(self, cache_source: str) -> Dict[str, str]:
        info = {
            "key": self.key,
            "label": self.label,
            "currency": self.currency,
            "source": self.source,
            "cache_source": cache_source,
        }
        if self.notes:
            info["notes"] = self.notes
        return info

    def _cache_is_fresh(self, ttl_days: int) -> bool:
        try:
            mtime = self.cache_path.stat().st_mtime
        except FileNotFoundError:
            return False
        return (time.time() - mtime) < ttl_days * 24 * 3600

    def _read_cache(self) -> pd.DataFrame:
        df = pd.read_csv(self.cache_path)
        df["date"] = pd.to_datetime(df["date"]).dt.to_period("M")
        return df

    def _write_cache(self, df: pd.DataFrame) -> None:
        snapshot = df.copy()
        snapshot["date"] = snapshot["date"].dt.to_timestamp().dt.strftime("%Y-%m-%d")
        snapshot.to_csv(self.cache_path, index=False)

    def _last_updated_iso(self) -> str:
        try:
            ts = self.cache_path.stat().st_mtime
        except FileNotFoundError:
            return datetime.now(timezone.utc).isoformat()
        return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()



class MarketRegistry:
    def __init__(self) -> None:
        self._definitions: Dict[str, MarketDefinition] = {}

    def register(self, definition: MarketDefinition) -> None:
        key = definition.key.lower()
        if key in self._definitions:
            raise ValueError(f"Market '{key}' is already registered")
        self._definitions[key] = definition

    def get(self, key: str) -> MarketDefinition:
        try:
            return self._definitions[key.lower()]
        except KeyError as exc:
            raise KeyError(f"Unknown market '{key}'") from exc

    def all(self) -> Dict[str, MarketDefinition]:
        return dict(self._definitions)




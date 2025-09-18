from __future__ import annotations

from .base import MarketRegistry
from .sources import build_market_definitions


_registry: MarketRegistry | None = None


def get_market_registry() -> MarketRegistry:
    global _registry
    if _registry is None:
        _registry = MarketRegistry()
        for definition in build_market_definitions():
            _registry.register(definition)
    return _registry


__all__ = ["get_market_registry"]

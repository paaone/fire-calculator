from __future__ import annotations

from .schemas.plan import (
    StrategyModel,
    SimRequest,
    MCRequest,
    CategorisedIncome,
    CategorisedExpense,
    ClientProfile,
    PlanAssumptions,
)
from pydantic import BaseModel


class Quantiles(BaseModel):
    p5: list[float]
    p50: list[float]
    p95: list[float]


class SimResult(BaseModel):
    months: int
    num_windows: int
    success_rate: float
    ending_balances: list[float]
    quantiles: Quantiles
    sample_path: list[float]


__all__ = [
    "StrategyModel",
    "SimRequest",
    "MCRequest",
    "CategorisedIncome",
    "CategorisedExpense",
    "ClientProfile",
    "PlanAssumptions",
    "Quantiles",
    "SimResult",
]

from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator


StrategyType = Literal["fixed", "variable_percentage", "guardrails"]


class StrategyModel(BaseModel):
    type: StrategyType = "fixed"
    percentage: Optional[float] = Field(
        None, description="For variable_percentage, annual fraction of balance (e.g., 0.04)"
    )
    guard_band: Optional[float] = Field(0.20, description="±band of initial WR for guardrails")
    adjust_step: Optional[float] = Field(0.10, description="±adjust step for guardrails")

    @field_validator("percentage")
    @classmethod
    def _check_pct(cls, v: Optional[float]) -> Optional[float]:
        if v is None:
            return v
        if not (0.0 <= v <= 0.2):
            raise ValueError("percentage must be between 0.0 and 0.2")
        return v


class SimRequest(BaseModel):
    initial: float = Field(1_000_000, ge=0)
    spend: float = Field(40_000, ge=0)
    years: int = Field(30, ge=1, le=60)
    strategy: StrategyModel = Field(default_factory=StrategyModel)
    # Optional: planning details
    start_delay_years: int = Field(0, ge=0, le=40, description="Years until retirement start; no withdrawals until then")
    annual_contrib: float = Field(0, ge=0, description="Annual savings contributed each year until retirement starts")
    income_amount: float = Field(0, ge=0, description="Annual recurring income (SS/pension) during retirement")
    income_start_year: int = Field(0, ge=0, le=60, description="Year in retirement when income starts (0 = first year)")


class MCRequest(SimRequest):
    n_paths: int = Field(1000, ge=100, le=10000)
    block_size: int = Field(12, ge=1, le=60)


class Quantiles(BaseModel):
    p10: list[float]
    p50: list[float]
    p90: list[float]


class SimResult(BaseModel):
    months: int
    num_windows: int
    success_rate: float
    ending_balances: list[float]
    quantiles: Quantiles
    sample_path: list[float]

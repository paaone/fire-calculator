from __future__ import annotations

from typing import Literal, Optional
from pydantic import BaseModel, Field, field_validator

from ..markets import get_market_registry

StrategyType = Literal["fixed", "variable_percentage", "guardrails"]
ExpenseCategory = Literal["baseline", "healthcare", "education", "housing", "leisure"]
IncomeCategory = Literal["baseline", "social_security", "inheritance", "rental", "other"]

CATEGORY_DEFAULT_INFLATION = {
    "baseline": 3.0,
    "healthcare": 5.0,
    "education": 4.0,
    "housing": 3.0,
    "leisure": 2.5,
}

INCOME_DEFAULT_INFLATION = {
    "baseline": 0.0,
    "social_security": 2.0,
    "inheritance": 0.0,
    "rental": 2.5,
    "other": 0.0,
}


class CategorisedIncome(BaseModel):
    amount: float = Field(..., ge=0)
    start_year: int = Field(0, ge=0, le=60)
    category: IncomeCategory = "baseline"
    inflation_pct: Optional[float] = None

    @field_validator("inflation_pct")
    @classmethod
    def _default_income_inflation(cls, value: Optional[float], info: dict) -> Optional[float]:
        if value is not None:
            return value
        category = info["data"]["category"]
        return INCOME_DEFAULT_INFLATION.get(category, 0.0)


class CategorisedExpense(BaseModel):
    amount: float = Field(..., ge=0)
    at_year_from_now: int = Field(..., ge=0, le=60)
    category: ExpenseCategory = "baseline"
    inflation_pct: Optional[float] = None

    @field_validator("inflation_pct")
    @classmethod
    def _default_expense_inflation(cls, value: Optional[float], info: dict) -> Optional[float]:
        if value is not None:
            return value
        category = info["data"]["category"]
        return CATEGORY_DEFAULT_INFLATION.get(category, 3.0)


class StrategyModel(BaseModel):
    type: StrategyType = "fixed"
    percentage: Optional[float] = Field(
        None, description="For variable_percentage, annual fraction of balance (e.g., 0.04)"
    )
    guard_band: Optional[float] = Field(0.20, description="Tolerance band for guardrails strategy")
    adjust_step: Optional[float] = Field(0.10, description="Adjustment step for guardrails strategy")

    @field_validator("percentage")
    @classmethod
    def _check_pct(cls, value: Optional[float]) -> Optional[float]:
        if value is None:
            return value
        if not (0.0 <= value <= 0.2):
            raise ValueError("percentage must be between 0.0 and 0.2")
        return value


class PlanAssumptions(BaseModel):
    description: Optional[str] = None
    return_series: str = Field(..., description="Market return series identifier")
    monte_carlo_paths: int = Field(1000, ge=100, le=10000)
    monte_carlo_block_size: int = Field(12, ge=1, le=60)
    success_threshold_pct: float = Field(80.0, ge=0, le=100)


class ClientProfile(BaseModel):
    current_age: int = Field(35, ge=0, le=120)
    retirement_age: Optional[int] = Field(None, ge=0, le=120)
    household_size: Optional[int] = Field(None, ge=1, le=10)
    location: Optional[str] = None
    notes: Optional[str] = None


class SimRequest(BaseModel):
    market: str = Field("us", description="Market key registered with the market registry")
    initial: float = Field(1_000_000, ge=0)
    spend: float = Field(40_000, ge=0)
    years: int = Field(30, ge=1, le=60)
    strategy: StrategyModel = Field(default_factory=StrategyModel)
    profile: ClientProfile = Field(default_factory=ClientProfile)
    assumptions: PlanAssumptions = Field(default_factory=lambda: PlanAssumptions(return_series="registry_default"))
    start_delay_years: int = Field(0, ge=0, le=40)
    annual_contrib: float = Field(0, ge=0)
    income_amount: float = Field(0, ge=0)
    income_start_year: int = Field(0, ge=0, le=60)
    income_duration_years: int = Field(0, ge=0, le=60)
    other_incomes: list[CategorisedIncome] = Field(default_factory=list)
    one_time_expenses: list[CategorisedExpense] = Field(default_factory=list)

    @field_validator("market")
    @classmethod
    def _ensure_market_registered(cls, value: str) -> str:
        registry = get_market_registry()
        registry.get(value)  # raises if missing
        return value


class MCRequest(SimRequest):
    n_paths: int = Field(1000, ge=100, le=10000)
    block_size: int = Field(12, ge=1, le=60)


__all__ = [
    "SimRequest",
    "MCRequest",
    "CategorisedIncome",
    "CategorisedExpense",
    "ClientProfile",
    "PlanAssumptions",
    "StrategyModel",
]

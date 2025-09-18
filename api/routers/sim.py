from __future__ import annotations

from typing import Any, Dict, Tuple
from fastapi import APIRouter, HTTPException

from ..models import MCRequest, SimRequest
from ..services.returns import (
    get_market_real_returns,
    get_market_metadata,
    list_available_markets,
)
from ..services.simulator import Strategy, simulate_historical, simulate_monte_carlo


router = APIRouter(tags=["simulation"])


def _to_real(amount: float, inflation_pct: float | None, years: int) -> float:
    rate = (inflation_pct or 0.0) / 100.0
    if rate <= 0:
        return amount
    return amount / ((1 + rate) ** years)


def _prepare_cashflows(req: SimRequest) -> Tuple[list[dict], list[dict], list[dict], list[dict]]:
    prepared_incomes: list[dict] = []
    raw_incomes: list[dict] = []
    for item in req.other_incomes:
        years = max(item.start_year, 0)
        amount_real = _to_real(item.amount, item.inflation_pct, years)
        prepared_incomes.append({"amount": amount_real, "start_year": item.start_year})
        raw_incomes.append(item.model_dump())

    prepared_expenses: list[dict] = []
    raw_expenses: list[dict] = []
    for item in req.one_time_expenses:
        years = max(item.at_year_from_now, 0)
        amount_real = _to_real(item.amount, item.inflation_pct, years)
        prepared_expenses.append({"amount": amount_real, "at_year_from_now": item.at_year_from_now})
        raw_expenses.append(item.model_dump())

    return prepared_incomes, prepared_expenses, raw_incomes, raw_expenses


@router.get("/markets")
def markets_catalog() -> Dict[str, Any]:
    return {"markets": list(list_available_markets().values())}


@router.get("/returns/meta")
def returns_meta(market: str = "us") -> Dict[str, Any]:
    return get_market_metadata(market)


@router.post("/simulate/historical")
def simulate_historical_api(req: SimRequest) -> Dict[str, Any]:
    df, _ = get_market_real_returns(market=req.market)
    strategy = Strategy(
        type=req.strategy.type,
        percentage=req.strategy.percentage,
        guard_band=req.strategy.guard_band,
        adjust_step=req.strategy.adjust_step,
    )
    other_incomes, one_time_expenses, raw_incomes, raw_expenses = _prepare_cashflows(req)
    try:
        result = simulate_historical(
            returns=df["real_return"],
            initial_balance=req.initial,
            annual_spending=req.spend,
            years=req.years,
            strategy=strategy,
            start_delay_years=req.start_delay_years,
            annual_contrib=req.annual_contrib,
            income_amount=req.income_amount,
            income_start_year=req.income_start_year,
            other_incomes=other_incomes,
            one_time_expenses=one_time_expenses,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    result["profile"] = req.profile.model_dump()
    result["assumptions"] = req.assumptions.model_dump()
    result["inputs"] = {
        "market": req.market,
        "initial": req.initial,
        "spend": req.spend,
        "years": req.years,
        "start_delay_years": req.start_delay_years,
        "annual_contrib": req.annual_contrib,
        "income_amount": req.income_amount,
        "income_start_year": req.income_start_year,
        "other_incomes": raw_incomes,
        "one_time_expenses": raw_expenses,
    }
    return result


@router.post("/simulate/montecarlo")
def simulate_montecarlo_api(req: MCRequest) -> Dict[str, Any]:
    df, _ = get_market_real_returns(market=req.market)
    strategy = Strategy(
        type=req.strategy.type,
        percentage=req.strategy.percentage,
        guard_band=req.strategy.guard_band,
        adjust_step=req.strategy.adjust_step,
    )
    other_incomes, one_time_expenses, raw_incomes, raw_expenses = _prepare_cashflows(req)
    try:
        result = simulate_monte_carlo(
            historical_returns=df["real_return"],
            initial_balance=req.initial,
            annual_spending=req.spend,
            years=req.years,
            strategy=strategy,
            n_paths=req.n_paths,
            block_size=req.block_size,
            start_delay_years=req.start_delay_years,
            annual_contrib=req.annual_contrib,
            income_amount=req.income_amount,
            income_start_year=req.income_start_year,
            other_incomes=other_incomes,
            one_time_expenses=one_time_expenses,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    result["profile"] = req.profile.model_dump()
    result["assumptions"] = req.assumptions.model_dump()
    result["inputs"] = {
        "market": req.market,
        "initial": req.initial,
        "spend": req.spend,
        "years": req.years,
        "start_delay_years": req.start_delay_years,
        "annual_contrib": req.annual_contrib,
        "income_amount": req.income_amount,
        "income_start_year": req.income_start_year,
        "other_incomes": raw_incomes,
        "one_time_expenses": raw_expenses,
    }
    return result

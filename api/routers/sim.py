from __future__ import annotations

from typing import Any, Dict
from fastapi import APIRouter, HTTPException

from ..models import MCRequest, SimRequest
from ..services.returns import get_market_real_returns
from ..services.simulator import Strategy, simulate_historical, simulate_monte_carlo


router = APIRouter(tags=["simulation"])


@router.get("/returns/meta")
def returns_meta(market: str = "us") -> Dict[str, Any]:
    df, source = get_market_real_returns(market=market)
    start = str(df["date"].min())
    end = str(df["date"].max())
    return {"source": source, "start": start, "end": end, "months": int(len(df)), "market": market}


@router.post("/simulate/historical")
def simulate_historical_api(req: SimRequest) -> Dict[str, Any]:
    df, _ = get_market_real_returns(market=req.market)
    strategy = Strategy(
        type=req.strategy.type,
        percentage=req.strategy.percentage,
        guard_band=req.strategy.guard_band,
        adjust_step=req.strategy.adjust_step,
    )
    try:
        return simulate_historical(
            returns=df["real_return"],
            initial_balance=req.initial,
            annual_spending=req.spend,
            years=req.years,
            strategy=strategy,
            start_delay_years=req.start_delay_years,
            annual_contrib=req.annual_contrib,
            income_amount=req.income_amount,
            income_start_year=req.income_start_year,
            other_incomes=req.other_incomes,
            one_time_expenses=req.one_time_expenses,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/simulate/montecarlo")
def simulate_montecarlo_api(req: MCRequest) -> Dict[str, Any]:
    df, _ = get_market_real_returns(market=req.market)
    strategy = Strategy(
        type=req.strategy.type,
        percentage=req.strategy.percentage,
        guard_band=req.strategy.guard_band,
        adjust_step=req.strategy.adjust_step,
    )
    try:
        return simulate_monte_carlo(
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
            other_incomes=req.other_incomes,
            one_time_expenses=req.one_time_expenses,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


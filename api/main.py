from __future__ import annotations

from typing import Any, Dict, Literal, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .data_loader import get_market_real_returns
from .engine import Strategy, simulate_historical, simulate_monte_carlo


app = FastAPI(title="FIRE Calculator API", version="0.1.0")

# Allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class StrategyModel(BaseModel):
    type: Literal["fixed", "variable_percentage", "guardrails"] = "fixed"
    percentage: Optional[float] = Field(None, description="for variable_percentage")
    guard_band: Optional[float] = Field(0.20, description="±band of initial WR")
    adjust_step: Optional[float] = Field(0.10, description="±step to adjust spending")


class SimRequest(BaseModel):
    initial: float = 1_000_000
    spend: float = 40_000
    years: int = 30
    strategy: StrategyModel = StrategyModel()


class MCRequest(SimRequest):
    n_paths: int = 1000
    block_size: int = 12


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {"status": "ok"}


@app.get("/api/returns/meta")
def returns_meta() -> Dict[str, Any]:
    df, source = get_market_real_returns()
    start = str(df["date"].min())
    end = str(df["date"].max())
    return {
        "source": source,
        "start": start,
        "end": end,
        "months": int(len(df)),
    }


@app.post("/api/simulate/historical")
def simulate_historical_api(req: SimRequest) -> Dict[str, Any]:
    df, _ = get_market_real_returns()
    strategy = Strategy(
        type=req.strategy.type,
        percentage=req.strategy.percentage,
        guard_band=req.strategy.guard_band,
        adjust_step=req.strategy.adjust_step,
    )
    result = simulate_historical(
        returns=df["real_return"],
        initial_balance=req.initial,
        annual_spending=req.spend,
        years=req.years,
        strategy=strategy,
    )
    return result


@app.post("/api/simulate/montecarlo")
def simulate_montecarlo_api(req: MCRequest) -> Dict[str, Any]:
    df, _ = get_market_real_returns()
    strategy = Strategy(
        type=req.strategy.type,
        percentage=req.strategy.percentage,
        guard_band=req.strategy.guard_band,
        adjust_step=req.strategy.adjust_step,
    )
    result = simulate_monte_carlo(
        historical_returns=df["real_return"],
        initial_balance=req.initial,
        annual_spending=req.spend,
        years=req.years,
        strategy=strategy,
        n_paths=req.n_paths,
        block_size=req.block_size,
    )
    return result


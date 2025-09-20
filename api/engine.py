from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Literal, Tuple

import numpy as np
import pandas as pd


StrategyType = Literal["fixed", "variable_percentage", "guardrails"]


@dataclass
class Strategy:
    type: StrategyType
    # for variable_percentage
    percentage: float | None = None  # e.g., 0.04
    # for guardrails
    guard_band: float | None = None  # e.g., 0.20 (±20% of initial WR)
    adjust_step: float | None = None  # e.g., 0.10 (±10% spending)


def _simulate_path(
    monthly_returns: np.ndarray,
    initial_balance: float,
    annual_spending: float,
    years: int,
    strategy: Strategy,
) -> Tuple[np.ndarray, float]:
    months = years * 12
    if months > len(monthly_returns):
        raise ValueError("Not enough monthly returns for requested horizon")

    balance = float(initial_balance)
    balances = np.empty(months, dtype=float)
    spend_this_year = float(annual_spending)

    # For strategies that depend on initial withdrawal rate
    initial_wr = annual_spending / initial_balance if initial_balance > 0 else 0.0

    for m in range(months):
        r = monthly_returns[m]
        balance *= (1.0 + r)

        # withdrawal at the end of each 12th month
        if (m + 1) % 12 == 0:
            # Determine spending based on strategy
            if strategy.type == "fixed":
                # Real returns, so keep spend constant in real terms
                spend = spend_this_year
            elif strategy.type == "variable_percentage":
                pct = strategy.percentage or 0.04
                spend = balance * pct
            elif strategy.type == "guardrails":
                band = strategy.guard_band if strategy.guard_band is not None else 0.20
                step = strategy.adjust_step if strategy.adjust_step is not None else 0.10
                # Adjust spend_this_year if withdrawal rate drifts outside band
                current_wr = spend_this_year / balance if balance > 0 else float("inf")
                lower = initial_wr * (1.0 - band)
                upper = initial_wr * (1.0 + band)
                if current_wr > upper:
                    spend_this_year *= (1.0 - step)
                elif current_wr < lower:
                    spend_this_year *= (1.0 + step)
                spend = spend_this_year
            else:
                spend = spend_this_year

            if spend > balance:
                # Deplete and stop
                balance = 0.0
                balances[m] = balance
                # Fill remainder with zeros
                if m < months - 1:
                    balances[m + 1 :] = 0.0
                return balances, 0.0
            balance -= spend

        balances[m] = balance

    return balances, balance


def simulate_historical(
    returns: pd.Series,
    initial_balance: float,
    annual_spending: float,
    years: int,
    strategy: Strategy,
) -> Dict:
    """
    Slide a window of `years*12` across historical monthly real returns.
    Return success rate, ending balances, and quantiles per month (p10,p50,p90).
    """
    months = years * 12
    r = returns.values.astype(float)
    if months > len(r):
        raise ValueError("Not enough historical data for requested horizon")

    windows = []  # shape: (num_windows, months)
    endings = []
    for start in range(0, len(r) - months + 1):
        path = r[start : start + months]
        balances, final_bal = _simulate_path(
            path, initial_balance, annual_spending, years, strategy
        )
        windows.append(balances)
        endings.append(final_bal)

    windows_arr = np.vstack(windows)
    endings_arr = np.array(endings)
    success_rate = float(np.mean(endings_arr > 0.0) * 100.0)

    # Quantiles across windows at each month
    q5 = np.percentile(windows_arr, 5, axis=0).tolist()
    q50 = np.percentile(windows_arr, 50, axis=0).tolist()
    q95 = np.percentile(windows_arr, 95, axis=0).tolist()

    # Provide a sample path (the first one) to plot a single trajectory if desired
    sample_path = windows_arr[0, :].tolist()

    return {
        "months": months,
        "num_windows": int(windows_arr.shape[0]),
        "success_rate": success_rate,
        "ending_balances": endings_arr.tolist(),
        "quantiles": {"p5": q5, "p50": q50, "p95": q95},
        "sample_path": sample_path,
    }


def _bootstrap_monthly_returns(
    base_returns: np.ndarray, months: int, block_size: int = 12
) -> np.ndarray:
    """Simple block bootstrap of monthly returns to a desired length."""
    out = []
    n = len(base_returns)
    while len(out) < months:
        start = np.random.randint(0, max(1, n - block_size))
        block = base_returns[start : start + block_size]
        out.extend(block.tolist())
    return np.array(out[:months], dtype=float)


def simulate_monte_carlo(
    historical_returns: pd.Series,
    initial_balance: float,
    annual_spending: float,
    years: int,
    strategy: Strategy,
    n_paths: int = 1000,
    block_size: int = 12,
) -> Dict:
    """
    Monte Carlo via block bootstrap of historical real monthly returns.
    Returns success rate and quantiles similar to historical simulation.
    """
    months = years * 12
    base = historical_returns.values.astype(float)
    windows = []
    endings = []
    for _ in range(int(n_paths)):
        path_returns = _bootstrap_monthly_returns(base, months, block_size)
        balances, final_bal = _simulate_path(
            path_returns, initial_balance, annual_spending, years, strategy
        )
        windows.append(balances)
        endings.append(final_bal)

    windows_arr = np.vstack(windows)
    endings_arr = np.array(endings)
    success_rate = float(np.mean(endings_arr > 0.0) * 100.0)

    q5 = np.percentile(windows_arr, 5, axis=0).tolist()
    q50 = np.percentile(windows_arr, 50, axis=0).tolist()
    q95 = np.percentile(windows_arr, 95, axis=0).tolist()
    sample_path = windows_arr[0, :].tolist()

    return {
        "months": months,
        "num_windows": int(windows_arr.shape[0]),
        "success_rate": success_rate,
        "ending_balances": endings_arr.tolist(),
        "quantiles": {"p5": q5, "p50": q50, "p95": q95},
        "sample_path": sample_path,
    }


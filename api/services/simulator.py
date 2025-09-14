from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal, Tuple, List, Optional

import numpy as np
import pandas as pd

StrategyType = Literal["fixed", "variable_percentage", "guardrails"]


@dataclass
class Strategy:
    type: StrategyType
    percentage: float | None = None
    guard_band: float | None = None
    adjust_step: float | None = None


def _simulate_path_with_planning(
    monthly_returns: np.ndarray,
    initial_balance: float,
    annual_spending: float,
    years: int,
    strategy: Strategy,
    start_delay_years: int = 0,
    annual_contrib: float = 0.0,
    income_amount: float = 0.0,
    income_start_year: int = 0,
    other_incomes: Optional[List[Dict]] = None,
    one_time_expenses: Optional[List[Dict]] = None,
    assets: Optional[List[Dict]] = None,
) -> Tuple[np.ndarray, float]:
    months_total = (start_delay_years + years) * 12
    if months_total > len(monthly_returns):
        raise ValueError("Not enough monthly returns for requested horizon")
    # If assets provided, sum to override initial
    if assets:
        total_assets = 0.0
        for a in assets:
            try:
                total_assets += float(a.get("amount", 0.0))
            except Exception:
                pass
        if total_assets > 0:
            initial_balance = total_assets
    balance = float(initial_balance)
    balances = np.empty(months_total, dtype=float)
    spend_this_year = float(annual_spending)
    initial_wr = (annual_spending / initial_balance) if initial_balance > 0 else 0.0
    other_incomes = other_incomes or []
    one_time_expenses = one_time_expenses or []
    for m in range(months_total):
        balance *= (1.0 + monthly_returns[m])
        if (m + 1) % 12 == 0:
            year_index = m // 12  # 0-based
            if year_index < start_delay_years:
                balance += max(0.0, annual_contrib)
            else:
                if strategy.type == "fixed":
                    spend = spend_this_year
                elif strategy.type == "variable_percentage":
                    pct = strategy.percentage or 0.04
                    spend = balance * pct
                elif strategy.type == "guardrails":
                    band = strategy.guard_band if strategy.guard_band is not None else 0.20
                    step = strategy.adjust_step if strategy.adjust_step is not None else 0.10
                    current_wr = (spend_this_year / balance) if balance > 0 else float("inf")
                    lower = initial_wr * (1.0 - band)
                    upper = initial_wr * (1.0 + band)
                    if current_wr > upper:
                        spend_this_year *= (1.0 - step)
                    elif current_wr < lower:
                        spend_this_year *= (1.0 + step)
                    spend = spend_this_year
                else:
                    spend = spend_this_year

                retire_year = year_index - start_delay_years
                income = income_amount if retire_year >= max(0, income_start_year) else 0.0
                # Add other recurring incomes that have started
                for inc in other_incomes:
                    try:
                        amt = float(inc.get("amount", 0.0))
                        start_y = int(inc.get("start_year", 0))
                    except Exception:
                        continue
                    if retire_year >= max(0, start_y):
                        income += max(0.0, amt)
                net = max(spend - income, 0.0)
                # Apply one-time expenses scheduled for this absolute year index
                for exp in one_time_expenses:
                    try:
                        amt = float(exp.get("amount", 0.0))
                        at_y = int(exp.get("at_year_from_now", -1))
                    except Exception:
                        continue
                    if year_index == at_y:
                        net += max(0.0, amt)
                if net > balance:
                    balance = 0.0
                    balances[m] = 0.0
                    if m < months_total - 1:
                        balances[m + 1 :] = 0.0
                    return balances, 0.0
                balance -= net
        balances[m] = balance
    return balances, balance


def simulate_historical(
    returns: pd.Series,
    initial_balance: float,
    annual_spending: float,
    years: int,
    strategy: Strategy,
    start_delay_years: int = 0,
    annual_contrib: float = 0.0,
    income_amount: float = 0.0,
    income_start_year: int = 0,
    other_incomes: Optional[List[Dict]] = None,
    one_time_expenses: Optional[List[Dict]] = None,
    assets: Optional[List[Dict]] = None,
) -> Dict:
    months = (start_delay_years + years) * 12
    r = returns.values.astype(float)
    windows = []
    endings = []
    for start in range(0, len(r) - months + 1):
        path = r[start : start + months]
        balances, final_bal = _simulate_path_with_planning(
            path,
            initial_balance,
            annual_spending,
            years,
            strategy,
            start_delay_years,
            annual_contrib,
            income_amount,
            income_start_year,
            other_incomes,
            one_time_expenses,
            assets,
        )
        windows.append(balances)
        endings.append(final_bal)
    windows_arr = np.vstack(windows)
    endings_arr = np.array(endings)
    success_rate = float(np.mean(endings_arr > 0.0) * 100.0)
    q10 = np.percentile(windows_arr, 10, axis=0).tolist()
    q50 = np.percentile(windows_arr, 50, axis=0).tolist()
    q90 = np.percentile(windows_arr, 90, axis=0).tolist()
    sample_path = windows_arr[0, :].tolist()
    return {
        "months": months,
        "num_windows": int(windows_arr.shape[0]),
        "success_rate": success_rate,
        "ending_balances": endings_arr.tolist(),
        "quantiles": {"p10": q10, "p50": q50, "p90": q90},
        "sample_path": sample_path,
    }


def _bootstrap_monthly_returns(base_returns: np.ndarray, months: int, block_size: int = 12) -> np.ndarray:
    out: list[float] = []
    n = len(base_returns)
    while len(out) < months:
        start = np.random.randint(0, max(1, n - block_size))
        out.extend(base_returns[start : start + block_size].tolist())
    return np.array(out[:months], dtype=float)


def simulate_monte_carlo(
    historical_returns: pd.Series,
    initial_balance: float,
    annual_spending: float,
    years: int,
    strategy: Strategy,
    n_paths: int = 1000,
    block_size: int = 12,
    start_delay_years: int = 0,
    annual_contrib: float = 0.0,
    income_amount: float = 0.0,
    income_start_year: int = 0,
    other_incomes: Optional[List[Dict]] = None,
    one_time_expenses: Optional[List[Dict]] = None,
    assets: Optional[List[Dict]] = None,
) -> Dict:
    months = (start_delay_years + years) * 12
    base = historical_returns.values.astype(float)
    windows = []
    endings = []
    for _ in range(int(n_paths)):
        path_returns = _bootstrap_monthly_returns(base, months, block_size)
        balances, final_bal = _simulate_path_with_planning(
            path_returns,
            initial_balance,
            annual_spending,
            years,
            strategy,
            start_delay_years,
            annual_contrib,
            income_amount,
            income_start_year,
            other_incomes,
            one_time_expenses,
            assets,
        )
        windows.append(balances)
        endings.append(final_bal)
    windows_arr = np.vstack(windows)
    endings_arr = np.array(endings)
    success_rate = float(np.mean(endings_arr > 0.0) * 100.0)
    q10 = np.percentile(windows_arr, 10, axis=0).tolist()
    q50 = np.percentile(windows_arr, 50, axis=0).tolist()
    q90 = np.percentile(windows_arr, 90, axis=0).tolist()
    sample_path = windows_arr[0, :].tolist()
    return {
        "months": months,
        "num_windows": int(windows_arr.shape[0]),
        "success_rate": success_rate,
        "ending_balances": endings_arr.tolist(),
        "quantiles": {"p10": q10, "p50": q50, "p90": q90},
        "sample_path": sample_path,
    }

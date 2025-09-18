import argparse
import csv
from pathlib import Path
from typing import Iterable

from api.services.returns import get_market_real_returns


def load_returns_from_csv(path: Path) -> Iterable[float]:
    with path.open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            yield float(row["real_return"])


def resolve_returns(market: str | None, data_path: str | None, refresh: bool) -> Iterable[float]:
    if data_path:
        return load_returns_from_csv(Path(data_path))
    df, _ = get_market_real_returns(market or "us", refresh=refresh)
    return df["real_return"].tolist()


def run_simulation(initial_balance: float, annual_spending: float, years: int, returns: Iterable[float]):
    returns = list(returns)
    months = years * 12
    windows = []
    for start in range(len(returns) - months + 1):
        balance = initial_balance
        for m in range(months):
            balance *= 1 + returns[start + m]
            if (m + 1) % 12 == 0:
                balance -= annual_spending
            if balance <= 0:
                balance = 0
                break
        windows.append(balance)
    success = sum(1 for b in windows if b > 0) / len(windows) * 100 if windows else 0
    return success, windows


def main():
    parser = argparse.ArgumentParser(description="Simple FIRE simulation using historical returns")
    parser.add_argument("--initial", type=float, default=1_000_000, help="Initial portfolio balance")
    parser.add_argument("--spend", type=float, default=40_000, help="Annual spending")
    parser.add_argument("--years", type=int, default=30, help="Duration of retirement in years")
    parser.add_argument("--market", choices=["us", "india"], default="us", help="Market key registered with the API")
    parser.add_argument("--data", help="Optional path to a CSV file with monthly real returns")
    parser.add_argument("--refresh", action="store_true", help="Refresh cached market data before running")
    args = parser.parse_args()

    returns = resolve_returns(args.market, args.data, args.refresh)
    success, outcomes = run_simulation(args.initial, args.spend, args.years, returns)
    print(f"Success rate: {success:.1f}% over {len(outcomes)} historical periods")


if __name__ == "__main__":
    main()

from __future__ import annotations

import io
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Tuple

import pandas as pd
import requests

from .base import MarketDefaults, MarketDefinition

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
USER_AGENT = "fire-calculator/1 (https://github.com/)"


def _download_csv(url: str, *, params: dict | None = None) -> str:
    resp = requests.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding
    return resp.text


def _download_french_market_monthly() -> pd.DataFrame:
    url = "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/F-F_Research_Data_Factors_CSV.zip"
    with requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30) as resp:
        resp.raise_for_status()
        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            csv_name = next((n for n in zf.namelist() if n.lower().endswith(".csv")), None)
            if not csv_name:
                raise RuntimeError("Could not find CSV in Ken French zip")
            raw = zf.read(csv_name).decode("utf-8", errors="ignore")

    lines = raw.splitlines()
    try:
        hdr_idx = next(i for i, ln in enumerate(lines) if ("Mkt-RF" in ln and ",RF" in ln))
    except StopIteration as exc:
        raise RuntimeError("Unable to locate monthly header in Ken French data") from exc

    end_idx = None
    for i in range(hdr_idx + 1, len(lines)):
        if not lines[i].strip() or lines[i].strip().lower().startswith("annual factors"):
            end_idx = i
            break
    if end_idx is None:
        end_idx = len(lines)

    monthly_text = "\n".join(lines[hdr_idx:end_idx])
    df = pd.read_csv(io.StringIO(monthly_text))
    date_col = "Date" if "Date" in df.columns else df.columns[0]
    df = df.rename(columns={date_col: "date", "Mkt-RF": "mkt_rf", "RF": "rf"})
    df = df[pd.to_numeric(df["date"], errors="coerce").notna()].copy()
    df["date"] = pd.to_datetime(df["date"].astype(str), format="%Y%m").dt.to_period("M")
    df["mkt_rf"] = pd.to_numeric(df["mkt_rf"], errors="coerce") / 100.0
    df["rf"] = pd.to_numeric(df["rf"], errors="coerce") / 100.0
    df = df[["date", "mkt_rf", "rf"]].dropna()
    return df


def _download_cpi_monthly(series_id: str) -> pd.DataFrame:
    csv = _download_csv("https://fred.stlouisfed.org/graph/fredgraph.csv", params={"id": series_id})
    df = pd.read_csv(io.StringIO(csv))
    df = df.rename(columns={"observation_date": "date", "DATE": "date"})
    value_col = next((c for c in df.columns if c != "date"), None)
    if not value_col:
        raise RuntimeError(f"No value column in FRED series {series_id}")
    df = df.rename(columns={value_col: "value"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.to_period("M")
    df = df.dropna(subset=["value", "date"]).sort_values("date")
    df["inflation"] = df["value"].pct_change()
    return df.dropna(subset=["inflation"])[["date", "inflation"]]


def build_us_real_returns() -> pd.DataFrame:
    mkt = _download_french_market_monthly()
    cpi = _download_cpi_monthly("CPIAUCSL")
    df = pd.merge(mkt, cpi, on="date", how="inner")
    df["real_return"] = (1.0 + df["mkt_rf"] + df["rf"]) / (1.0 + df["inflation"]) - 1.0
    return df.loc[:, ["date", "real_return"]].dropna().sort_values("date").reset_index(drop=True)


def _download_yahoo_monthly(symbol: str) -> pd.DataFrame:
    url = "https://query1.finance.yahoo.com/v8/finance/chart/" + symbol
    params = {"interval": "1mo", "range": "max", "includeAdjustedClose": "true"}
    resp = requests.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    result = payload.get("chart", {}).get("result")
    if not result:
        raise RuntimeError(f"Yahoo Finance returned no data for {symbol}: {payload}")
    chart = result[0]
    timestamps = chart.get("timestamp") or []
    adj_payload = chart.get("indicators", {}).get("adjclose") or []
    if not timestamps or not adj_payload:
        raise RuntimeError(f"Yahoo Finance missing adjclose series for {symbol}")
    adj = adj_payload[0].get("adjclose") or []
    if not adj:
        raise RuntimeError(f"Yahoo Finance returned empty adjclose series for {symbol}")
    df = pd.DataFrame({"timestamp": timestamps, "adjclose": adj}).dropna()
    df["date"] = pd.to_datetime(df["timestamp"], unit="s").dt.to_period("M")
    df = df.groupby("date", as_index=False).last().sort_values("date")
    df["return"] = df["adjclose"].pct_change()
    return df.dropna(subset=["return"])[["date", "return"]]


def build_india_real_returns() -> pd.DataFrame:
    idx = _download_yahoo_monthly("%5ENSEI")
    cpi = _download_cpi_monthly("INDCPIALLMINMEI")
    df = pd.merge(idx, cpi, on="date", how="inner")
    df["real_return"] = (1.0 + df["return"]) / (1.0 + df["inflation"]) - 1.0
    df = df.loc[:, ["date", "real_return"]].dropna().sort_values("date").reset_index(drop=True)
    return df[df["real_return"].abs() < 3]


def build_market_definitions() -> Tuple[MarketDefinition, MarketDefinition]:
    us_defaults = MarketDefaults(
        initial=1_000_000,
        spend=40_000,
        years=30,
        inflation_pct=3.0,
        expected_real_return_pct=5.0,
        still_working=True,
        annual_contrib=20_000,
        income_amount=0.0,
        income_start_year=0,
        income_duration_years=0,
        start_delay_years=0,
    )
    india_defaults = MarketDefaults(
        initial=50_000_000,
        spend=2_000_000,
        years=16,
        inflation_pct=6.0,
        expected_real_return_pct=10.0,
        still_working=False,
        annual_contrib=0.0,
        income_amount=0.0,
        income_start_year=0,
        income_duration_years=0,
        start_delay_years=0,
    )

    us = MarketDefinition(
        key="us",
        label="US",
        currency="USD",
        source="Ken French CRSP market + FRED CPIAUCSL",
        cache_name="market_us_monthly_real.csv",
        builder=build_us_real_returns,
        defaults=us_defaults,
        notes="CRSP value-weighted market premium combined with risk-free rate and CPI.",
    )

    india = MarketDefinition(
        key="india",
        label="India",
        currency="INR",
        source="Yahoo Finance ^NSEI + FRED INDCPIALLMINMEI",
        cache_name="market_india_monthly_real.csv",
        builder=build_india_real_returns,
        defaults=india_defaults,
        notes="NIFTY 50 total return proxy with Indian CPI deflator.",
    )

    return us, india


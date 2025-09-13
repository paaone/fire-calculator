import io
import os
import time
import zipfile
from datetime import datetime
from typing import Tuple

import numpy as np
import pandas as pd
import requests

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
CACHE_FILE = os.path.join(DATA_DIR, "market_monthly_real.csv")


def _ensure_data_dir() -> None:
    os.makedirs(DATA_DIR, exist_ok=True)


def _download_french_market_monthly() -> pd.DataFrame:
    """
    Download Ken French "F-F Research Data Factors" monthly CSV (zipped), and
    return a DataFrame with columns ['date', 'mkt_rf', 'rf'] where date is a
    pandas Period (M) representing YYYY-MM.
    """
    url = (
        "https://mba.tuck.dartmouth.edu/pages/faculty/ken.french/ftp/"
        "F-F_Research_Data_Factors_CSV.zip"
    )
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
        # Find the CSV (name can vary slightly, so pick first .CSV)
        csv_name = next((n for n in zf.namelist() if n.lower().endswith(".csv")), None)
        if not csv_name:
            raise RuntimeError("Could not find CSV in Ken French zip")
        raw = zf.read(csv_name).decode("utf-8", errors="ignore")

    # The file has header comments; locate monthly section by header containing 'Mkt-RF'
    lines = raw.splitlines()
    hdr_idx = next(i for i, ln in enumerate(lines) if ("Mkt-RF" in ln and ",RF" in ln))
    # Monthly section ends at a blank line or when 'Annual Factors:' appears
    end_idx = None
    for i in range(hdr_idx + 1, len(lines)):
        if not lines[i].strip() or lines[i].strip().lower().startswith("annual factors"):
            end_idx = i
            break
    if end_idx is None:
        end_idx = len(lines)
    monthly_text = "\n".join(lines[hdr_idx:end_idx])
    df = pd.read_csv(io.StringIO(monthly_text))
    # First column may be unnamed
    if "Date" in df.columns:
        date_col = "Date"
    else:
        date_col = df.columns[0]
    df = df.rename(columns={date_col: "date", "Mkt-RF": "mkt_rf", "RF": "rf"})
    # Keep numeric rows only (dates like '192607')
    df = df[pd.to_numeric(df["date"], errors="coerce").notna()].copy()
    df["date"] = df["date"].astype(str)
    # Convert YYYYMM to Period(M)
    df["date"] = pd.to_datetime(df["date"], format="%Y%m").dt.to_period("M")
    # Convert to decimal
    df["mkt_rf"] = pd.to_numeric(df["mkt_rf"], errors="coerce") / 100.0
    df["rf"] = pd.to_numeric(df["rf"], errors="coerce") / 100.0
    df = df[["date", "mkt_rf", "rf"]].dropna()
    return df


def _download_cpi_monthly() -> pd.DataFrame:
    """
    Download CPI (CPIAUCSL) monthly from FRED and compute monthly inflation rate.
    Returns DataFrame with ['date', 'inflation'] where date is pandas Period (M).
    """
    url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIAUCSL"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    # Expected columns: observation_date, CPIAUCSL
    df = df.rename(columns={"observation_date": "date", "DATE": "date", "CPIAUCSL": "cpi"})
    df["date"] = pd.to_datetime(df["date"]).dt.to_period("M")
    df["cpi"] = pd.to_numeric(df["cpi"], errors="coerce")
    df = df.dropna()
    df = df.sort_values("date")
    df["inflation"] = df["cpi"].pct_change()
    df = df.dropna(subset=["inflation"]).loc[:, ["date", "inflation"]]
    return df


def build_market_real_returns() -> pd.DataFrame:
    """
    Build a DataFrame of monthly real total US stock market returns using
    Ken French market (CRSP value-weighted) and CPI from FRED.

    Returns DataFrame with columns ['date','real_return'].
    """
    mkt = _download_french_market_monthly()
    cpi = _download_cpi_monthly()
    df = pd.merge(mkt, cpi, on="date", how="inner")
    # Nominal market: Mkt = (Mkt-RF + RF)
    df["mkt_nominal"] = df["mkt_rf"] + df["rf"]
    # Real return: (1+nominal)/(1+inflation) - 1
    df["real_return"] = (1.0 + df["mkt_nominal"]) / (1.0 + df["inflation"]) - 1.0
    out = df.loc[:, ["date", "real_return"]].copy()
    return out.dropna()


def get_market_real_returns(refresh: bool = False) -> Tuple[pd.DataFrame, str]:
    """
    Load or build the monthly real returns for the US market.
    - If cached CSV exists (and not too old), load it.
    - Otherwise, download and compute, then cache.

    Returns (df, source), where source is 'cache' or 'download'.
    """
    _ensure_data_dir()
    if os.path.exists(CACHE_FILE) and not refresh:
        try:
            # Consider cache fresh if modified within last 30 days
            mtime = os.path.getmtime(CACHE_FILE)
            if time.time() - mtime < 30 * 24 * 3600:
                df = pd.read_csv(CACHE_FILE)
                df["date"] = pd.to_datetime(df["date"]).dt.to_period("M")
                return df, "cache"
        except Exception:
            pass

    df = build_market_real_returns()
    # Save as YYYY-MM string for readability
    to_save = df.copy()
    to_save["date"] = to_save["date"].dt.to_timestamp().dt.strftime("%Y-%m-%d")
    to_save.to_csv(CACHE_FILE, index=False)
    return df, "download"

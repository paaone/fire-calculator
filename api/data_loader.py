import io
import os
import time
import zipfile
from typing import Dict, Literal, Tuple

import pandas as pd
import requests

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
MARKET_CODES = Literal["us", "india"]
CACHE_FILES: Dict[str, str] = {
    "us": os.path.join(DATA_DIR, "market_us_monthly_real.csv"),
    "india": os.path.join(DATA_DIR, "market_india_monthly_real.csv"),
}
SOURCE_LABELS: Dict[str, str] = {
    "us": "Ken French market + FRED CPI",
    "india": "Yahoo Finance ^NSEI + FRED INDCPIALLMINMEI",
}


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


def _download_fred_series(series_id: str) -> pd.DataFrame:
    """Generic loader for a monthly FRED series returning ['date','value']."""
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    df = pd.read_csv(io.StringIO(resp.text))
    df.columns = [c.strip() for c in df.columns]
    if "observation_date" in df.columns:
        df = df.rename(columns={"observation_date": "date"})
    elif "DATE" in df.columns:
        df = df.rename(columns={"DATE": "date"})
    else:
        raise RuntimeError(f"Unexpected columns for FRED series {series_id}: {df.columns}")
    value_col = next((c for c in df.columns if c != "date"), None)
    if not value_col:
        raise RuntimeError(f"No value column for FRED series {series_id}")
    df = df.rename(columns={value_col: "value"})
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.to_period("M")
    df["value"] = pd.to_numeric(df["value"], errors="coerce")
    df = df.dropna(subset=["date", "value"])
    return df


def _download_cpi_monthly(series_id: str) -> pd.DataFrame:
    """
    Download CPI monthly from FRED and compute monthly inflation rate.
    Returns DataFrame with ['date', 'inflation'].
    """
    df = _download_fred_series(series_id)
    df = df.sort_values("date")
    df["inflation"] = df["value"].pct_change()
    return df.dropna(subset=["inflation"])[["date", "inflation"]]


def _download_yahoo_monthly(symbol: str) -> pd.DataFrame:
    """Load monthly adjusted close data for an index from Yahoo Finance."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"interval": "1mo", "range": "max", "includeAdjustedClose": "true"}
    headers = {"User-Agent": "fire-calculator/1 (+https://github.com/)"}
    resp = requests.get(url, params=params, headers=headers, timeout=30)
    resp.raise_for_status()
    payload = resp.json()
    result = payload.get("chart", {}).get("result")
    if not result:
        error = payload.get("chart", {}).get("error", {})
        raise RuntimeError(f"Yahoo Finance returned no data for {symbol}: {error}")
    chart = result[0]
    timestamps = chart.get("timestamp") or []
    adj_payload = chart.get("indicators", {}).get("adjclose") or []
    if not timestamps or not adj_payload:
        raise RuntimeError(f"Yahoo Finance missing adjclose for {symbol}")
    adj_values = adj_payload[0].get("adjclose") or []
    if not adj_values:
        raise RuntimeError(f"Yahoo Finance returned empty adjclose for {symbol}")
    df = pd.DataFrame({"timestamp": timestamps, "adjclose": adj_values})
    df = df.dropna(subset=["adjclose"])
    df["date"] = pd.to_datetime(df["timestamp"], unit="s").dt.to_period("M")
    df = df.groupby("date", as_index=False).last().sort_values("date")
    df["return"] = df["adjclose"].pct_change()
    return df.dropna(subset=["return"])[["date", "return"]]


def build_market_real_returns_us() -> pd.DataFrame:
    """
    Build a DataFrame of monthly real total US stock market returns using
    Ken French market (CRSP value-weighted) and CPI from FRED.

    Returns DataFrame with columns ['date','real_return'].
    """
    mkt = _download_french_market_monthly()
    cpi = _download_cpi_monthly("CPIAUCSL")
    df = pd.merge(mkt, cpi, on="date", how="inner")
    # Nominal market: Mkt = (Mkt-RF + RF)
    df["mkt_nominal"] = df["mkt_rf"] + df["rf"]
    # Real return: (1+nominal)/(1+inflation) - 1
    df["real_return"] = (1.0 + df["mkt_nominal"]) / (1.0 + df["inflation"]) - 1.0
    out = df.loc[:, ["date", "real_return"]].copy()
    return out.dropna()


def build_market_real_returns_india() -> pd.DataFrame:
    """Build monthly real returns for India using NIFTY 50 and CPI."""
    idx = _download_yahoo_monthly("%5ENSEI")
    cpi = _download_cpi_monthly("INDCPIALLMINMEI")
    df = pd.merge(idx, cpi, on="date", how="inner")
    df["real_return"] = (1.0 + df["return"]) / (1.0 + df["inflation"]) - 1.0
    out = df.loc[:, ["date", "real_return"]].copy()
    # Drop unreasonably large magnitude outliers that indicate data quality issues
    out = out[(out["real_return"].abs() < 3)].copy()
    return out.dropna()


BUILDERS = {
    "us": build_market_real_returns_us,
    "india": build_market_real_returns_india,
}


def get_market_real_returns(market: MARKET_CODES = "us", refresh: bool = False, ttl_days: int = 30) -> Tuple[pd.DataFrame, str]:
    """
    Load or build the monthly real returns for the requested market.
    - If cached CSV exists (and not too old), load it.
    - Otherwise, download and compute, then cache.

    Returns (df, source), where source includes the data providers used.
    """
    market = market.lower()
    if market not in BUILDERS:
        raise ValueError(f"Unsupported market '{market}'")

    _ensure_data_dir()
    cache_path = CACHE_FILES[market]
    if os.path.exists(cache_path) and not refresh:
        try:
            # Consider cache fresh if modified within last 30 days
            mtime = os.path.getmtime(cache_path)
            if time.time() - mtime < ttl_days * 24 * 3600:
                df = pd.read_csv(cache_path)
                df["date"] = pd.to_datetime(df["date"]).dt.to_period("M")
                return df, "cache"
        except Exception:
            pass

    builder = BUILDERS[market]
    df = builder()
    to_save = df.copy()
    to_save["date"] = to_save["date"].dt.to_timestamp().dt.strftime("%Y-%m-%d")
    to_save.to_csv(cache_path, index=False)
    return df, SOURCE_LABELS.get(market, "download")



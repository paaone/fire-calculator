# Modern FIRE Calculator

A modern full-stack FIRE calculator with a FastAPI backend and a React + TypeScript frontend. It now supports both US and India market histories and lets you toggle which market drives the simulations.

## What’s Included

- **Backend (`api/`)**: FastAPI service that
  - Downloads and caches monthly real returns for the selected market. The US feed combines the Ken French CRSP market factor with CPIAUCSL. The India feed pulls NIFTY 50 monthly closes from Yahoo Finance and deflates with India CPI (INDCPIALLMINMEI).
  - Exposes endpoints for historical sequence backtesting and block-bootstrap Monte Carlo simulations.
  - Withdrawal strategies: fixed real withdrawals, variable-percentage (VPW), and guardrails (Guyton–Klinger style adjustments).
- **Frontend (`web/`)**: Vite + React app with a refreshed, responsive UI
  - Market selector (US ? India) that updates the entire analysis.
  - Projection charts (P10/P50/P90), a cash-flow table, and an ending balance histogram with improved layout.

## Run It

Prereqs: Python 3.10+ and Node 18+.

1. **Backend**
   - `pip install -r requirements.txt`
   - `python -m uvicorn api.main:app --reload --port 8000`

   The first run downloads the chosen market data and writes a cache file under `data/` (`market_us_monthly_real.csv` or `market_india_monthly_real.csv`).

2. **Frontend**
   - `cd web`
   - `npm install`
   - `npm run dev`

The UI expects the API at `http://localhost:8000` (override with `VITE_API_BASE`).

## API

- `GET /api/v1/returns/meta?market=us|india` — dataset coverage summary for the chosen market.
- `POST /api/v1/simulate/historical`
  - body: `{ market, initial, spend, years, strategy, … }`
- `POST /api/v1/simulate/montecarlo`
  - body: `{ market, initial, spend, years, strategy, n_paths?, block_size?, … }`

Strategy shapes:

- Fixed: `{ "type": "fixed" }`
- Variable percentage (VPW): `{ "type": "variable_percentage", "percentage": 0.04 }`
- Guardrails: `{ "type": "guardrails", "guard_band": 0.20, "adjust_step": 0.10 }`

Responses include success rate, ending balances, and monthly quantiles (P10/P50/P90).

## CLI Prototype (optional)

`firecalc.py` remains for quick CLI testing. Point it at the cached market data you want to use:\n\n```bash\npython firecalc.py --data data/market_india_monthly_real.csv --initial 1000000 --spend 40000 --years 30\n```

## Data Sources

- **US market**: Ken French “F-F Research Data Factors” monthly file (CRSP value-weighted market). Real returns are computed with CPIAUCSL from FRED.
- **India market**: Yahoo Finance monthly data for the NIFTY 50 index (`^NSEI`) with adjusted closes. Real returns use India CPI (INDCPIALLMINMEI) from FRED.
- Cached CSVs live under `data/` and refresh automatically (default TTL: 30 days).



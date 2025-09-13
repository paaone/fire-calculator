# Modern FIRE Calculator

A modern, full‑stack FIRE calculator prototype with a FastAPI backend and a React + TypeScript frontend. It backtests against real US total market returns and includes a Monte Carlo simulator with flexible withdrawal strategies.

## What’s Included

- Backend (`api/`): FastAPI service that
  - Downloads and caches real monthly US market returns (CRSP value‑weighted "market" from the Kenneth French library combined with CPI from FRED) to `data/market_monthly_real.csv`.
  - Endpoints for historical backtesting and Monte Carlo simulations.
  - Strategies: fixed real withdrawals, variable‑percentage (VPW), and guardrails (Guyton–Klinger style adjustment).
- Frontend (`web/`): Vite + React app with interactive inputs and charts (Recharts)
  - Projection charts showing P10/P50/P90 quantiles over time.
  - Histogram of ending balances.

## Run It

Prereqs: Python 3.10+ and Node 18+.

1) Backend

- Install deps: `pip install -r requirements.txt`
- Start API: `python -m uvicorn api.main:app --reload --port 8000`

The first run downloads market and CPI data and writes `data/market_monthly_real.csv`.

2) Frontend

- `cd web`
- `npm install`
- Dev server: `npm run dev` (http://localhost:5173)

The UI calls the API at `http://localhost:8000`.

## API

- `GET /api/returns/meta` → dataset coverage summary
- `POST /api/simulate/historical`
  - body: `{ initial, spend, years, strategy }`
- `POST /api/simulate/montecarlo`
  - body: `{ initial, spend, years, strategy, n_paths?, block_size? }`

Strategy shapes:

- Fixed: `{ "type": "fixed" }`
- Variable percentage (VPW): `{ "type": "variable_percentage", "percentage": 0.04 }`
- Guardrails: `{ "type": "guardrails", "guard_band": 0.20, "adjust_step": 0.10 }`

Responses include success rate, ending balances, and monthly quantiles (P10/P50/P90).

## CLI Prototype (optional)

`firecalc.py` remains for quick CLI testing and now defaults to the real dataset:

```bash
python firecalc.py --initial 1000000 --spend 40000 --years 30
```

## Notes on Data

- Market returns come from the Kenneth French “F‑F Research Data Factors” monthly file (CRSP value‑weighted market). Nominal returns are converted to real using CPI (FRED CPIAUCSL monthly). Coverage is 1947‑present.
- The old synthetic dataset (`generate_data.py`, `data/sp500_monthly.csv`) is kept for reference but no longer used by default.


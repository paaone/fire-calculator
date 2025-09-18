# Modern FIRE Calculator

A modern full-stack FIRE planning tool composed of a FastAPI backend and a React + TypeScript frontend. The platform now features a pluggable market registry, modular theming, automated tests, and cross-platform deployment scripts.

## Architecture Highlights

- **Market registry (`api/markets/`)** – Market data sources are registered once and exposed through metadata, defaults, and coverage. Adding a market only requires a new `MarketDefinition`; validation happens centrally.
- **Service layer (`api/services/returns.py`)** – Provides cached access to markets, exposes coverage, and powers a new `GET /api/v1/markets` endpoint used by the UI.
- **React app (`web/src/`)** – Fetches market metadata on load, applies per-market defaults, and keeps the UI synchronized with shareable URLs. Styling is split across `styles/base.css`, `styles/components.css`, and theme modules.
- **Theme system (`web/src/theme/`)** – A `ThemeProvider` controls CSS variables via `.theme-light` / `.theme-dark`, with a toggle exposed in the results pane. All currency formatting adjusts to market locale (USD vs. INR).
- **Tests** – `pytest` covers API routes and validation. Vitest exercises UI utilities (currently the theme provider) and runs as part of the deployment scripts.

## API Surface

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/markets` | Returns all registered markets, metadata, defaults, and coverage. |
| `GET /api/v1/returns/meta?market=...` | Coverage + defaults for a specific market. |
| `POST /api/v1/simulate/historical` | Deterministic historical backtest. |
| `POST /api/v1/simulate/montecarlo` | Block-bootstrap Monte Carlo simulation. |

Request bodies accept a dynamic `market` value; validation is driven by the registry instead of static literals.

## Running Locally

Prerequisites: Python 3.10+ and Node 18+

### Backend
```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
pytest api/tests
uvicorn api.main:app --reload --port 8000
```
The first run caches market data under `data/market_<key>_monthly_real.csv`. Cache lifetime defaults to 30 days (configurable via `CACHE_TTL_DAYS`).

### Frontend
```bash
cd web
npm install
npm run test -- --run
npm run dev
```
Set `VITE_API_BASE` to point at a non-local API instance if needed.

### CLI Prototype

`firecalc.py` consumes either a registered market or a custom CSV:
```bash
python firecalc.py --market india --initial 50000000 --spend 2000000 --years 16
```
Pass `--refresh` to rebuild cached data or `--data <path>` to operate on an arbitrary CSV of real returns.

## Deployment Scripts

Cross-platform helpers live in `scripts/`:

- `deploy_web.sh` / `deploy_web.ps1` – Install dependencies, run Vitest in CI mode, and build the Vite bundle.
- `deploy_api.sh` / `deploy_api.ps1` – Create a virtualenv, install dependencies, run pytest, pre-compile modules, and launch Uvicorn (`API_PORT` overridable).
- `deploy_all.sh` / `deploy_all.ps1` – Run the web build followed by the API deployment pipeline.

## Theming & Styling

Global styles are modularized:

- `styles/base.css` – Resets, typography, scrollbar styling.
- `styles/components.css` – Layout, panels, grids, and utility classes.
- `styles/theme/light.css` and `styles/theme/dark.css` – CSS variable palettes applied through the theme provider.

The React `ThemeProvider` persists the user’s choice (light/dark) and toggles a button rendered with the results summary.

## Tests

- Backend: `pytest api/tests`
- Frontend: `npm run test -- --run`

Both suites run in the deployment scripts and should remain green before shipping changes.

## Data Sources

- **United States** – Ken French CRSP value-weighted market + risk-free rate combined with CPIAUCSL (FRED).
- **India** – Yahoo Finance `^NSEI` adjusted closes deflated by FRED INDCPIALLMINMEI series.

Each market definition captures defaults (initial balance, spending rate, inflation, etc.) that seed the UI when the market is selected.

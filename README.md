# Modern FIRE Calculator

This repository explores the requirements for a modern replacement of the [FireCalc](https://www.firecalc.com/) retirement calculator and provides a small Python prototype of the core simulation engine.

## 🔍 FireCalc at a Glance

FireCalc is a popular Financial Independence, Retire Early (FIRE) tool. Key characteristics:

- **Input parameters** – starting portfolio, annual spending, retirement length and optional social security or pension income.
- **Historical back‑testing** – uses U.S. stock/bond returns going back to the late 1800s. Each possible retirement window is tested to compute a *success rate* (how often money lasts for the full period).
- **Fixed withdrawal strategy** – the same dollar amount (inflation adjusted) is withdrawn each year.
- **Outputs** – success percentage, ending balances for each historical scenario and line charts for individual simulations.

## 🧭 Requirements for a Modern Version

1. **Technology stack**
   - **Frontend:** React + TypeScript with a charting library such as D3 or Plotly for smooth, interactive graphs.
   - **Backend:** Python (FastAPI) or Node.js for fast API responses. Python is well suited for numerical work and reuses the prototype in this repo.
   - **State management:** React Query/Recoil for instant updates when inputs change.
2. **Core features**
   - Real‑time graphs of portfolio value, success rate and distribution of outcomes.
   - Ability to adjust asset allocation, withdrawal strategies (fixed, Guyton‑Klinger, variable) and add additional income streams.
   - Display of historical sequences and Monte‑Carlo simulations side by side.
   - Export/Share functionality for scenarios.
3. **User experience**
   - Clear explanations of each input with links to educational resources.
   - Responsive layout and dark/light themes.
   - Step‑by‑step mode for beginners plus an advanced tab for power users.
4. **Model**
   - Use long‑term U.S. market data (stocks, bonds and inflation) identical to the original FireCalc dataset.
   - Portfolio growth: `balance = balance * (1 + monthly_return) - withdrawal` with withdrawals taken annually and adjusted for inflation.
   - Success defined as ending balance ≥ 0 for the requested horizon.

## 🧮 Prototype Simulation

`firecalc.py` contains a minimal implementation of the back‑testing model. It expects a CSV file of monthly **real** (inflation adjusted) returns.

Example:

```bash
python firecalc.py --initial 1000000 --spend 40000 --years 30
```

The script reports the percentage of historical periods in which the portfolio survived.

## 📊 Dataset

The repository ships with `data/sp500_monthly.csv`, a synthetic dataset of U.S. stock market real returns from 1926‑2023. Values are generated from a normal distribution with a 0.67 % mean and 4.5 % standard deviation per month—roughly matching historical statistics. `generate_data.py` recreates the file.

In a production application this dataset should be replaced with an authoritative source such as Shiller’s or Fama‑French market return series.

## 🚀 Next Steps

1. Replace the synthetic dataset with real historical returns.
2. Wrap the simulation engine in a web API (FastAPI/Flask).
3. Build a React interface that calls the API and renders charts.
4. Add Monte‑Carlo simulation and flexible withdrawal strategies.

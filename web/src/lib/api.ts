export type MarketCode = "us" | "india"

export type Strategy =
  | { type: "fixed" }
  | { type: "variable_percentage"; percentage: number }
  | { type: "guardrails"; guard_band: number; adjust_step: number }

export interface SimRequest {
  market: MarketCode
  initial: number
  spend: number
  years: number
  strategy: Strategy
  // Planning
  start_delay_years?: number
  annual_contrib?: number
  income_amount?: number
  income_start_year?: number
  // Extended inputs
  other_incomes?: { amount: number; start_year: number }[]
  one_time_expenses?: { amount: number; at_year_from_now: number }[]
}

export interface SimResult {
  months: number
  num_windows: number
  success_rate: number
  ending_balances: number[]
  quantiles: { p10: number[]; p50: number[]; p90: number[] }
  sample_path: number[]
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:8000"

export async function fetchHistorical(req: SimRequest): Promise<SimResult> {
  const res = await fetch(`${API_BASE}/api/v1/simulate/historical`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) throw new Error(`Historical sim failed: ${res.status}`)
  return res.json()
}

export async function fetchMonteCarlo(req: SimRequest & { n_paths?: number; block_size?: number }): Promise<SimResult> {
  const payload = { n_paths: 1000, block_size: 12, ...req }
  const res = await fetch(`${API_BASE}/api/v1/simulate/montecarlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Monte Carlo sim failed: ${res.status}`)
  return res.json()
}

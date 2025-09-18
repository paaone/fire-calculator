export type MarketCode = string

export type Strategy =
  | { type: "fixed" }
  | { type: "variable_percentage"; percentage: number }
  | { type: "guardrails"; guard_band: number; adjust_step: number }

export interface MarketDefaults {
  initial: number
  spend: number
  years: number
  inflation_pct: number
  expected_real_return_pct: number
  still_working: boolean
  annual_contrib: number
  income_amount: number
  income_start_year: number
  start_delay_years: number
  n_paths: number
  block_size: number
}

export interface MarketCoverage {
  start: string
  end: string
  months: number
}

export interface MarketMetadata {
  key: MarketCode
  label: string
  currency: string
  source: string
  notes?: string
  cache_source: string
  last_updated: string
  defaults: MarketDefaults
  coverage: MarketCoverage
}

export interface MarketCatalog {
  markets: MarketMetadata[]
}

export interface SimRequest {
  market: MarketCode
  initial: number
  spend: number
  years: number
  strategy: Strategy
  start_delay_years?: number
  annual_contrib?: number
  income_amount?: number
  income_start_year?: number
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

async function throwFromResponse(res: Response, fallback: string): Promise<never> {
  let message = ${fallback} ()
  try {
    const text = await res.text()
    if (text) {
      try {
        const data = JSON.parse(text)
        if (typeof data?.detail === "string") {
          message = data.detail
        } else if (data?.detail) {
          message = JSON.stringify(data.detail)
        } else if (data?.message) {
          message = data.message
        } else {
          message = text
        }
      } catch {
        message = text
      }
    }
  } catch {
    // ignore parse issues and keep fallback message
  }
  throw new Error(message)
}

async function request<T>(path: string, init?: RequestInit, fallbackError = "Request failed"): Promise<T> {
  const res = await fetch(${API_BASE}, init)
  if (!res.ok) {
    await throwFromResponse(res, fallbackError)
  }
  return res.json() as Promise<T>
}

export async function fetchMarkets(): Promise<MarketCatalog> {
  return request<MarketCatalog>("/api/v1/markets", undefined, "Failed to load markets")
}

export async function fetchHistorical(req: SimRequest): Promise<SimResult> {
  return request<SimResult>(
    "/api/v1/simulate/historical",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    },
    "Historical simulation failed",
  )
}

export async function fetchMonteCarlo(req: SimRequest & { n_paths?: number; block_size?: number }): Promise<SimResult> {
  const payload = { n_paths: 1000, block_size: 12, ...req }
  return request<SimResult>(
    "/api/v1/simulate/montecarlo",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Monte Carlo simulation failed",
  )
}


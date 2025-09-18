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
  let message = `${fallback} (${res.status})`
  try {
    const text = await res.text()
    if (text) {
      try {
        const data = JSON.parse(text)
        if (typeof data?.detail === "string") {
          message = data.detail
        } else if (data?.detail) {
          message = JSON.stringify(data.detail)
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

export async function fetchHistorical(req: SimRequest): Promise<SimResult> {
  const res = await fetch(`${API_BASE}/api/v1/simulate/historical`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  })
  if (!res.ok) {
    await throwFromResponse(res, "Historical simulation failed")
  }
  return res.json()
}

export async function fetchMonteCarlo(req: SimRequest & { n_paths?: number; block_size?: number }): Promise<SimResult> {
  const payload = { n_paths: 1000, block_size: 12, ...req }
  const res = await fetch(`${API_BASE}/api/v1/simulate/montecarlo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    await throwFromResponse(res, "Monte Carlo simulation failed")
  }
  return res.json()
}

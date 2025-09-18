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

export interface ClientProfile {
  current_age: number
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
  profile?: ClientProfile
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

const VALIDATION_LABELS: Record<string, string> = {
  market: "Market data set",
  initial: "Current invested portfolio",
  spend: "Total annual living expenses",
  years: "Years to fund",
  strategy: "Withdrawal strategy",
  start_delay_years: "Years until retirement",
  annual_contrib: "Annual savings until retirement",
  income_amount: "Recurring income amount",
  income_start_year: "Recurring income start year",
  other_incomes: "Other incomes",
  one_time_expenses: "Future spending events",
  n_paths: "Simulated paths",
  block_size: "Block size",
}

function friendlyFieldLabel(field: string | number | undefined): string {
  if (typeof field !== "string" || !field.length) return "This field"
  return VALIDATION_LABELS[field] ?? field.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase())
}

function formatValidationIssues(detail: unknown): string | undefined {
  if (!Array.isArray(detail)) return undefined
  const lines: string[] = []
  for (const issue of detail as any[]) {
    const location = Array.isArray(issue?.loc) ? issue.loc[issue.loc.length - 1] : undefined
    const label = friendlyFieldLabel(location)
    if (issue?.type === "greater_than_equal" && issue?.ctx?.ge !== undefined) {
      lines.push(`${label} must be at least ${issue.ctx.ge}. Update ${label.toLowerCase()} and try again.`)
      continue
    }
    if (issue?.type === "greater_than" && issue?.ctx?.gt !== undefined) {
      lines.push(`${label} must be greater than ${issue.ctx.gt}. Try a higher value.`)
      continue
    }
    if (issue?.type === "less_than_equal" && issue?.ctx?.le !== undefined) {
      lines.push(`${label} must be ${issue.ctx.le} or less.`)
      continue
    }
    if (issue?.type === "missing" || issue?.type === "value_error.missing") {
      lines.push(`Please enter a value for ${label.toLowerCase()}.`)
      continue
    }
    if (typeof issue?.msg === "string") {
      lines.push(`${label}: ${issue.msg}`)
    }
  }
  if (!lines.length) return undefined
  return lines.join(" ")
}

async function throwFromResponse(res: Response, fallback: string): Promise<never> {
  let message = `${fallback} (${res.status})`
  try {
    const text = await res.text()
    if (text) {
      try {
        const data = JSON.parse(text)
        const detail = data?.detail
        if (Array.isArray(detail)) {
          const formatted = formatValidationIssues(detail)
          message = formatted ?? JSON.stringify(detail)
        } else if (typeof detail === "string") {
          message = detail
        } else if (detail) {
          message = JSON.stringify(detail)
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
  const res = await fetch(`${API_BASE}${path}`, init)
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


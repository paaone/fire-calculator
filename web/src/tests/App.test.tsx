import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "../theme/ThemeProvider"
import App from "../App"

const mockMarkets = {
  markets: [
    {
      key: "us",
      label: "US",
      currency: "USD",
      source: "Test",
      notes: "",
      cache_source: "download",
      last_updated: new Date().toISOString(),
      defaults: {
        initial: 1_000_000,
        spend: 40_000,
        years: 30,
        inflation_pct: 3,
        expected_real_return_pct: 5,
        still_working: true,
        annual_contrib: 20_000,
        income_amount: 0,
        income_start_year: 0,
        start_delay_years: 0,
        n_paths: 1000,
        block_size: 12,
      },
      coverage: { start: "2000-01", end: "2024-01", months: 288 },
    },
  ],
}

const mockSimResult = {
  months: 360,
  num_windows: 1,
  success_rate: 100,
  ending_balances: [1],
  quantiles: { p5: [1], p50: [1], p95: [1] },
  sample_path: [1],
}

describe("App", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = typeof input === "string" ? input : input.url
        if (url.includes("/api/v1/markets")) {
          return new Response(JSON.stringify(mockMarkets), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        }
        return new Response(JSON.stringify(mockSimResult), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      }),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    global.fetch = originalFetch
  })

  it("applies presets without throwing", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    render(
      <QueryClientProvider client={client}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>,
    )

    await screen.findByText(/quick presets/i)

    fireEvent.click(screen.getByRole("button", { name: /fat fire/i }))

    await waitFor(() => {
      expect(screen.getByDisplayValue("$2,000,000")).toBeInTheDocument()
    })
  })
})

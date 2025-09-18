import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import Inputs, { StrategyName } from "./Inputs"

describe("Inputs", () => {
  const baseProps = {
    market: "us",
    markets: [
      { key: "us", label: "United States" },
      { key: "india", label: "India" },
    ],
    onMarketChange: vi.fn(),
    currencyCode: "USD",
    initial: 1_000_000,
    onInitial: vi.fn(),
    spend: 40_000,
    onSpend: vi.fn(),
    years: 30,
    onYears: vi.fn(),
    strategy: "fixed" as StrategyName,
    onStrategy: vi.fn(),
    vpwPct: 4,
    onVpwPct: vi.fn(),
    guardBand: 20,
    onGuardBand: vi.fn(),
    guardStep: 10,
    onGuardStep: vi.fn(),
    startDelayYears: 0,
    onStartDelay: vi.fn(),
    annualContrib: 0,
    onAnnualContrib: vi.fn(),
    incomeAmount: 0,
    onIncomeAmount: vi.fn(),
    incomeStartYear: 0,
    onIncomeStartYear: vi.fn(),
    stillWorking: true,
    onStillWorking: vi.fn(),
    expectedRealReturn: 5,
    onExpectedRealReturn: vi.fn(),
    currentAge: 30,
    onCurrentAge: vi.fn(),
    inflationPct: 3,
    onInflationPct: vi.fn(),
    otherIncomes: [],
    onOtherIncomesChange: vi.fn(),
    expenses: [],
    onExpensesChange: vi.fn(),
    onRun: vi.fn(),
    running: false,
  }

  it("renders market options and triggers change handler", () => {
    const onMarketChange = vi.fn()
    render(<Inputs {...baseProps} onMarketChange={onMarketChange} />)

    const indiaButton = screen.getByRole("button", { name: /india/i })
    fireEvent.click(indiaButton)
    expect(onMarketChange).toHaveBeenCalledWith("india")
  })

  it("renders income and expense sections without crashing", () => {
    const utils = render(
      <Inputs
        {...baseProps}
        otherIncomes={[{ amount: 1_000, start_year: 1 }]}
        expenses={[{ amount: 5_000, at_year_from_now: 2 }]}
      />,
    )

    const incomeAccordion = utils.getAllByRole("button", { name: /income in retirement/i })[0]
    const expenseAccordion = utils.getAllByRole("button", { name: /one-time expenses/i })[0]
    fireEvent.click(incomeAccordion)
    fireEvent.click(expenseAccordion)

    expect(screen.getByRole("button", { name: /add income line/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /add one-time expense/i })).toBeInTheDocument()
  })
})


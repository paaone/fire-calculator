import { describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import type { ComponentProps } from "react"
import Inputs from "./Inputs"

type InputsProps = ComponentProps<typeof Inputs>

const makeProps = (overrides: Partial<InputsProps> = {}): InputsProps => ({
  market: "us",
  markets: [
    { key: "us", label: "US" },
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
  strategy: "fixed",
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
  incomeDurationYears: 0,
  onIncomeDurationYears: vi.fn(),
  stillWorking: true,
  onStillWorking: vi.fn(),
  expectedRealReturn: 5,
  onExpectedRealReturn: vi.fn(),
  currentAge: 30,
  onCurrentAge: vi.fn(),
  inflationPct: 3,
  onInflationPct: vi.fn(),
  onApplyPreset: undefined,
  spendingCategories: [
    { id: "cat-1", label: "Housing & utilities", amount: 20_000, inflation: 3, category: "housing" },
    { id: "cat-2", label: "Groceries & dining", amount: 10_000, inflation: 3, category: "food" },
  ],
  onSpendingCategoriesChange: vi.fn(),
  futureExpenses: [],
  onFutureExpensesChange: vi.fn(),
  futureIncomes: [],
  onFutureIncomesChange: vi.fn(),
  onRun: vi.fn(),
  running: false,
  ...overrides,
})

describe("Inputs", () => {
  it("renders market options and triggers change handler", () => {
    const onMarketChange = vi.fn()
    render(<Inputs {...makeProps({ onMarketChange })} />)

    const indiaButton = screen.getByRole("button", { name: /india/i })
    fireEvent.click(indiaButton)
    expect(onMarketChange).toHaveBeenCalledWith("india")
  })

  it("shows expense and income controls", () => {
    const futureExpenses = [
      {
        id: "exp-1",
        label: "College fund",
        amount: 12_000,
        startYear: 3,
        years: 4,
        inflation: 6,
        category: "education" as const,
        frequency: "recurring" as const,
      },
    ]
    const futureIncomes = [
      {
        id: "inc-1",
        label: "Part-time consulting",
        amount: 15_000,
        startYear: 2,
        years: 5,
        inflation: 3,
        category: "other" as const,
        frequency: "recurring" as const,
      },
    ]

    const utils = render(<Inputs {...makeProps({ futureExpenses, futureIncomes })} />)

    const addGoalButtons = screen.getAllByRole("button", { name: /add goal or milestone/i })
    expect(addGoalButtons.length).toBeGreaterThan(0)

    const incomeAccordion = utils.getAllByRole("button", { name: /additional income sources/i })[0]
    fireEvent.click(incomeAccordion)

    expect(screen.getByRole("button", { name: /add income stream/i })).toBeInTheDocument()
  })
})

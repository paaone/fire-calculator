import Accordion from "./Accordion"
import CurrencyInput from "./CurrencyInput"
import {
  SpendingCategoryPlan,
  FutureExpensePlan,
  FutureIncomePlan,
  SPENDING_CATEGORY_PRESETS,
  FUTURE_EXPENSE_OPTIONS,
  FUTURE_INCOME_OPTIONS,
  suggestedInflationForSpending,
  suggestedInflationForExpense,
  suggestedInflationForIncome,
  createId,
  defaultSpendingCategories,
  totalSpendingFromCategories,
} from "../lib/planning"

export type StrategyName = "fixed" | "variable_percentage" | "guardrails"
export type MarketSelection = string

interface MarketOption {
  key: MarketSelection
  label: string
}

type Props = {
  market: MarketSelection
  markets: MarketOption[]
  onMarketChange: (market: MarketSelection) => void
  currencyCode: string
  initial: number
  onInitial: (v: number) => void
  spend: number
  onSpend: (v: number) => void
  years: number
  onYears: (v: number) => void
  strategy: StrategyName
  onStrategy: (v: StrategyName) => void
  vpwPct: number
  onVpwPct: (v: number) => void
  guardBand: number
  onGuardBand: (v: number) => void
  guardStep: number
  onGuardStep: (v: number) => void
  startDelayYears: number
  onStartDelay: (v: number) => void
  annualContrib: number
  onAnnualContrib: (v: number) => void
  incomeAmount: number
  onIncomeAmount: (v: number) => void
  incomeStartYear: number
  onIncomeStartYear: (v: number) => void
  stillWorking: boolean
  onStillWorking: (v: boolean) => void
  expectedRealReturn: number
  onExpectedRealReturn: (v: number) => void
  currentAge?: number
  onCurrentAge?: (v: number) => void
  inflationPct?: number
  onInflationPct?: (v: number) => void
  onApplyPreset?: (name: "lean" | "baseline" | "fat") => void
  spendingCategories: SpendingCategoryPlan[]
  onSpendingCategoriesChange: (rows: SpendingCategoryPlan[]) => void
  futureExpenses: FutureExpensePlan[]
  onFutureExpensesChange: (rows: FutureExpensePlan[]) => void
  futureIncomes: FutureIncomePlan[]
  onFutureIncomesChange: (rows: FutureIncomePlan[]) => void
  onRun: () => void
  running: boolean
}

function FieldHeader({ label, help }: { label: string; help?: string }) {
  return (
    <div className="field-header">
      <span className="label">{label}</span>
      {help && <span className="label-help">{help}</span>}
    </div>
  )
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <h4 className="title" style={{ marginBottom: 4 }}>{title}</h4>
      {hint && <p className="subtitle" style={{ marginBottom: 12 }}>{hint}</p>}
    </div>
  )
}

const frequencyOptions = [
  { value: "one_time" as const, label: "One-time" },
  { value: "recurring" as const, label: "Recurring" },
]

export default function Inputs({
  market,
  markets,
  onMarketChange,
  currencyCode,
  initial,
  onInitial,
  spend,
  onSpend,
  years,
  onYears,
  strategy,
  onStrategy,
  vpwPct,
  onVpwPct,
  guardBand,
  onGuardBand,
  guardStep,
  onGuardStep,
  startDelayYears,
  onStartDelay,
  annualContrib,
  onAnnualContrib,
  incomeAmount,
  onIncomeAmount,
  incomeStartYear,
  onIncomeStartYear,
  stillWorking,
  onStillWorking,
  expectedRealReturn,
  onExpectedRealReturn,
  currentAge = 0,
  onCurrentAge,
  inflationPct = 3,
  onInflationPct,
  onApplyPreset,
  spendingCategories,
  onSpendingCategoriesChange,
  futureExpenses,
  onFutureExpensesChange,
  futureIncomes,
  onFutureIncomesChange,
  onRun,
  running,
}: Props) {
  const totalBreakdown = totalSpendingFromCategories(spendingCategories)

  const handleCategoryChange = (index: number, update: Partial<SpendingCategoryPlan>) => {
    const next = spendingCategories.map((item, idx) => (idx === index ? { ...item, ...update } : item))
    onSpendingCategoriesChange(next)
  }

  const handleCategorySelect = (index: number, category: SpendingCategoryPlan["category"]) => {
    const preset = SPENDING_CATEGORY_PRESETS.find((option) => option.key === category)
    handleCategoryChange(index, {
      category,
      label: preset?.label ?? spendingCategories[index]?.label ?? "Custom",
      inflation: suggestedInflationForSpending(category),
    })
  }

  const handleAddCategory = () => {
    const fallback = SPENDING_CATEGORY_PRESETS.find((option) => option.key === "other")
    const next = [
      ...spendingCategories,
      {
        id: createId(),
        label: fallback?.label ?? "Custom need",
        amount: 0,
        inflation: fallback?.inflation ?? 2.5,
        category: (fallback?.key ?? "other") as SpendingCategoryPlan["category"],
      },
    ]
    onSpendingCategoriesChange(next)
  }

  const handleRemoveCategory = (index: number) => {
    const next = spendingCategories.filter((_, idx) => idx !== index)
    if (!next.length) {
      onSpendingCategoriesChange(defaultSpendingCategories(spend))
      return
    }
    onSpendingCategoriesChange(next)
  }

  const handleExpenseChange = (index: number, update: Partial<FutureExpensePlan>) => {
    const next = futureExpenses.map((item, idx) => (idx === index ? { ...item, ...update } : item))
    onFutureExpensesChange(next)
  }

  const handleExpenseCategory = (index: number, category: FutureExpensePlan["category"]) => {
    const option = FUTURE_EXPENSE_OPTIONS.find((item) => item.key === category)
    handleExpenseChange(index, {
      category,
      label: option?.label ?? futureExpenses[index]?.label ?? "Goal",
      inflation: suggestedInflationForExpense(category),
    })
  }

  const handleAddExpense = () => {
    const option = FUTURE_EXPENSE_OPTIONS[0]
    onFutureExpensesChange([
      ...futureExpenses,
      {
        id: createId(),
        label: option.label,
        amount: 0,
        startYear: 1,
        years: 1,
        inflation: option.defaultInflation,
        category: option.key,
        frequency: "one_time",
      },
    ])
  }

  const handleRemoveExpense = (index: number) => {
    onFutureExpensesChange(futureExpenses.filter((_, idx) => idx !== index))
  }

  const handleIncomeChange = (index: number, update: Partial<FutureIncomePlan>) => {
    const next = futureIncomes.map((item, idx) => (idx === index ? { ...item, ...update } : item))
    onFutureIncomesChange(next)
  }

  const handleIncomeCategory = (index: number, category: FutureIncomePlan["category"]) => {
    const option = FUTURE_INCOME_OPTIONS.find((item) => item.key === category)
    handleIncomeChange(index, {
      category,
      label: option?.label ?? futureIncomes[index]?.label ?? "Income",
      inflation: suggestedInflationForIncome(category),
    })
  }

  const handleAddIncome = () => {
    const option = FUTURE_INCOME_OPTIONS[0]
    onFutureIncomesChange([
      ...futureIncomes,
      {
        id: createId(),
        label: option.label,
        amount: 0,
        startYear: 1,
        years: 30,
        inflation: option.defaultInflation,
        category: option.key,
        frequency: "recurring",
      },
    ])
  }

  const handleRemoveIncome = (index: number) => {
    onFutureIncomesChange(futureIncomes.filter((_, idx) => idx !== index))
  }

  return (
    <div className="panel vstack plan-card">
      <div className="plan-card__heading">
        <div>
          <h3 className="title">Your Plan</h3>
          <p className="subtitle">Outline your profile, goals, and assumptions. We'll translate everything into real-dollar cash flows.</p>
        </div>
        {onApplyPreset && (
          <div className="preset-row">
            <span className="label">Quick presets</span>
            <div className="segmented">
              <button type="button" onClick={() => onApplyPreset("lean")}>Lean</button>
              <button type="button" onClick={() => onApplyPreset("baseline")}>Baseline</button>
              <button type="button" onClick={() => onApplyPreset("fat")}>Fat FIRE</button>
            </div>
          </div>
        )}
      </div>

      <div className="plan-card__market">
        <span className="label">Market data set</span>
        <div className="segmented segmented-lg">
          {markets.map((option) => (
            <button key={option.key} type="button" className={market === option.key ? "active" : ""} onClick={() => onMarketChange(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      <SectionHeader title="Household snapshot" hint="Capture your age, retirement horizon, and how long the plan should last." />
      <div className="row">
        <div>
          <FieldHeader label="Current age" />
          <input className="input" type="number" min={0} max={120} step={1} value={currentAge} onChange={(e) => onCurrentAge?.(Number(e.target.value))} />
        </div>
        <div>
          <FieldHeader label="Working status" help="Helps determine whether we assume ongoing savings before retirement." />
          <select className="select" value={stillWorking ? "yes" : "no"} onChange={(e) => onStillWorking(e.target.value === "yes")}>
            <option value="yes">Still working</option>
            <option value="no">Already retired</option>
          </select>
        </div>
        <div>
          <FieldHeader label="Years to fund" help="How many retirement years you'd like to cover." />
          <input className="input" type="number" min={1} max={60} step={1} value={years} onChange={(e) => onYears(Number(e.target.value))} />
        </div>
      </div>

      <div className="row">
        <div>
          <FieldHeader label="Years until retirement" help="Zero means you're retired now." />
          <input className="input" type="number" min={0} max={40} step={1} value={startDelayYears} onChange={(e) => onStartDelay(Number(e.target.value))} />
        </div>
        <div>
          <FieldHeader label="Annual savings until retirement" />
          <CurrencyInput value={annualContrib} onChange={onAnnualContrib} currency={currencyCode} />
        </div>
        <div>
          <FieldHeader label="Expected real return while working" help="Real (after inflation) annual growth assumption before retirement." />
          <input className="input" type="number" min={0} max={15} step={0.1} value={expectedRealReturn} onChange={(e) => onExpectedRealReturn(Number(e.target.value))} />
        </div>
      </div>

      <div className="divider" />

      <SectionHeader title="Portfolio today" hint="What you've already saved and the inflation assumption for projections." />
      <div className="row">
        <div>
          <FieldHeader label="Current invested portfolio" help="Starting balance in today's currency." />
          <CurrencyInput value={initial} onChange={onInitial} currency={currencyCode} />
        </div>
        <div>
          <FieldHeader label="Inflation assumption" help="Used when toggling to nominal (actual) dollars." />
          <input className="input" type="number" min={0} max={15} step={0.1} value={inflationPct} onChange={(e) => onInflationPct?.(Number(e.target.value))} />
        </div>
      </div>

      <div className="divider" />

      <SectionHeader
        title="Core spending plan"
        hint="Break your lifestyle costs into categories. We keep everything in today’s dollars so you can compare apples to apples."
      />
      <FieldHeader label="Total annual living expenses" help="We'll scale the category amounts proportionally when you adjust this number." />
      <CurrencyInput value={spend} onChange={onSpend} currency={currencyCode} />
      <div className="help">Breakdown total: {currencyCode} {totalBreakdown.toLocaleString()}</div>

      <div className="vstack" style={{ gap: 12 }}>
        {spendingCategories.map((item, idx) => (
          <div className="row" key={item.id}>
            <div>
              <FieldHeader label="Category" />
              <select className="select" value={item.category} onChange={(e) => handleCategorySelect(idx, e.target.value as SpendingCategoryPlan["category"]) }>
                {SPENDING_CATEGORY_PRESETS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldHeader label="Label" />
              <input className="input" type="text" value={item.label} onChange={(e) => handleCategoryChange(idx, { label: e.target.value })} />
            </div>
            <div>
              <FieldHeader label="Amount" />
              <CurrencyInput value={item.amount} onChange={(value) => handleCategoryChange(idx, { amount: value })} currency={currencyCode} />
            </div>
            <div>
              <FieldHeader label="Inflation %" help="We suggest a starting point based on the category." />
              <input className="input" type="number" min={0} max={10} step={0.1} value={item.inflation} onChange={(e) => handleCategoryChange(idx, { inflation: Number(e.target.value) })} />
            </div>
            <div className="vstack" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleRemoveCategory(idx)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <div className="hstack" style={{ justifyContent: "space-between", marginTop: 4 }}>
          <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddCategory}>
            Add category
          </button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSpendingCategoriesChange(defaultSpendingCategories(spend))}>
            Reset to suggested mix
          </button>
        </div>
      </div>

      <div className="divider" />

      <SectionHeader
        title="Future spending events"
        hint="Model one-time goals (home purchase) or recurring costs (college, healthcare). Amounts are in today's dollars; we grow them by the category inflation."
      />
      <div className="vstack" style={{ gap: 12 }}>
        {futureExpenses.map((item, idx) => (
          <div className="row" key={item.id}>
            <div>
              <FieldHeader label="Type" />
              <select className="select" value={item.category} onChange={(e) => handleExpenseCategory(idx, e.target.value as FutureExpensePlan["category"]) }>
                {FUTURE_EXPENSE_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <FieldHeader label="Label" />
              <input className="input" type="text" value={item.label} onChange={(e) => handleExpenseChange(idx, { label: e.target.value })} />
            </div>
            <div>
              <FieldHeader label="Amount" />
              <CurrencyInput value={item.amount} onChange={(value) => handleExpenseChange(idx, { amount: value })} currency={currencyCode} />
            </div>
            <div>
              <FieldHeader label="Starts in year" help="0 = this year, 1 = next year." />
              <input className="input" type="number" min={0} max={60} step={1} value={item.startYear} onChange={(e) => handleExpenseChange(idx, { startYear: Number(e.target.value) })} />
            </div>
            <div>
              <FieldHeader label="Frequency" />
              <select
                className="select"
                value={item.frequency}
                onChange={(e) => handleExpenseChange(idx, { frequency: e.target.value as FutureExpensePlan["frequency"], years: e.target.value === "recurring" ? item.years || 5 : 1 })}
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {item.frequency === "recurring" && (
              <div>
                <FieldHeader label="Years" />
                <input className="input" type="number" min={1} max={40} step={1} value={item.years} onChange={(e) => handleExpenseChange(idx, { years: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <FieldHeader label="Inflation %" />
              <input className="input" type="number" min={0} max={10} step={0.1} value={item.inflation} onChange={(e) => handleExpenseChange(idx, { inflation: Number(e.target.value) })} />
            </div>
            <div className="vstack" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleRemoveExpense(idx)}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddExpense}>
          Add goal or milestone
        </button>
      </div>

      <div className="divider" />

      <SectionHeader
        title="Income streams"
        hint="Document guaranteed income so the simulator knows when to offset withdrawals."
      />
      <div className="row">
        <div>
          <FieldHeader label="Recurring income" help="Pension or Social Security that repeats indefinitely." />
          <CurrencyInput value={incomeAmount} onChange={onIncomeAmount} currency={currencyCode} />
        </div>
        <div>
          <FieldHeader label="Starts in retirement year" help="Year offset from today (0 = immediately)." />
          <input className="input" type="number" min={0} max={60} step={1} value={incomeStartYear} onChange={(e) => onIncomeStartYear(Number(e.target.value))} />
        </div>
      </div>

      <Accordion title="Additional income sources">
        <div className="vstack" style={{ gap: 12 }}>
          {futureIncomes.map((item, idx) => (
            <div className="row" key={item.id}>
              <div>
                <FieldHeader label="Type" />
                <select className="select" value={item.category} onChange={(e) => handleIncomeCategory(idx, e.target.value as FutureIncomePlan["category"]) }>
                  {FUTURE_INCOME_OPTIONS.map((option) => (
                    <option key={option.key} value={option.key}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldHeader label="Label" />
                <input className="input" type="text" value={item.label} onChange={(e) => handleIncomeChange(idx, { label: e.target.value })} />
              </div>
              <div>
                <FieldHeader label="Amount" />
                <CurrencyInput value={item.amount} onChange={(value) => handleIncomeChange(idx, { amount: value })} currency={currencyCode} />
              </div>
              <div>
                <FieldHeader label="Starts in year" />
                <input className="input" type="number" min={0} max={60} step={1} value={item.startYear} onChange={(e) => handleIncomeChange(idx, { startYear: Number(e.target.value) })} />
              </div>
              <div>
                <FieldHeader label="Frequency" />
                <select
                  className="select"
                  value={item.frequency}
                  onChange={(e) => handleIncomeChange(idx, { frequency: e.target.value as FutureIncomePlan["frequency"], years: e.target.value === "recurring" ? item.years || 30 : 1 })}
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {item.frequency === "recurring" && (
                <div>
                  <FieldHeader label="Years" />
                  <input className="input" type="number" min={1} max={60} step={1} value={item.years} onChange={(e) => handleIncomeChange(idx, { years: Number(e.target.value) })} />
                </div>
              )}
              <div>
                <FieldHeader label="Inflation %" />
                <input className="input" type="number" min={0} max={10} step={0.1} value={item.inflation} onChange={(e) => handleIncomeChange(idx, { inflation: Number(e.target.value) })} />
              </div>
              <div className="vstack" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-secondary btn-sm" type="button" onClick={() => handleRemoveIncome(idx)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddIncome}>
            Add income stream
          </button>
        </div>
      </Accordion>

      <div className="divider" />

      <SectionHeader title="Withdrawal model" hint="Choose how withdrawals adjust over time." />
      <div>
        <span className="label">Strategy</span>
        <div className="segmented">
          <button type="button" className={strategy === "fixed" ? "active" : ""} onClick={() => onStrategy("fixed")}>
            Fixed
          </button>
          <button type="button" className={strategy === "variable_percentage" ? "active" : ""} onClick={() => onStrategy("variable_percentage")}>
            Variable %
          </button>
          <button type="button" className={strategy === "guardrails" ? "active" : ""} onClick={() => onStrategy("guardrails")}>
            Guardrails
          </button>
        </div>
      </div>

      {strategy === "variable_percentage" && (
        <div>
          <FieldHeader label="Variable percentage" help="Annual percentage of the portfolio withdrawn." />
          <input className="input" type="number" min={1} max={10} step={0.1} value={vpwPct} onChange={(e) => onVpwPct(Number(e.target.value))} />
        </div>
      )}

      {strategy === "guardrails" && (
        <div className="row">
          <div>
            <FieldHeader label="Guard band %" help="Width of the acceptable withdrawal range based on the initial withdrawal rate." />
            <input className="input" type="number" min={5} max={50} step={1} value={guardBand} onChange={(e) => onGuardBand(Number(e.target.value))} />
          </div>
          <div>
            <FieldHeader label="Adjust step %" help="Percentage change applied when hitting a guardrail." />
            <input className="input" type="number" min={5} max={30} step={1} value={guardStep} onChange={(e) => onGuardStep(Number(e.target.value))} />
          </div>
        </div>
      )}

      <div className="divider" />

      <button className="btn btn-primary btn-lg" onClick={onRun} disabled={running}>
        {running ? "Running..." : "Run simulation"}
      </button>
      <div className="help">We'll test your plan against every historical sequence and a block-bootstrap Monte Carlo simulation.</div>
    </div>
  )
}

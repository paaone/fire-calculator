import { useMemo, useState, useEffect, useId, useRef } from "react"
import clsx from "clsx"
import Accordion from "./Accordion"
import CurrencyInput from "./CurrencyInput"
import NumberInput from "./NumberInput"
import { FaCircleInfo, FaCircleMinus, FaXmark } from "react-icons/fa6"

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

const SPENDING_CATEGORY_DATALIST_ID = "spending-category-options"
const FUTURE_EXPENSE_DATALIST_ID = "future-expense-options"
const FUTURE_INCOME_DATALIST_ID = "future-income-options"
const healthKeywords = /health|medical/i
const educationKeywords = /educ/i

function inferCategoryFromLabel(label: string, fallback: SpendingCategoryPlan["category"]): SpendingCategoryPlan["category"] {
  const trimmed = label.trim().toLowerCase()
  const preset = SPENDING_CATEGORY_PRESETS.find((option) => option.label.toLowerCase() === trimmed)
  if (preset) return preset.key
  if (healthKeywords.test(trimmed)) return "healthcare"
  if (educationKeywords.test(trimmed)) return "education"
  return fallback
}

function inferExpenseCategoryFromLabel(label: string, fallback: FutureExpensePlan["category"]): FutureExpensePlan["category"] {
  const normalized = label.trim().toLowerCase()
  const option = FUTURE_EXPENSE_OPTIONS.find((item) => item.label.toLowerCase() === normalized)
  if (option) return option.key
  if (normalized.includes('travel')) return 'travel'
  if (normalized.includes('health')) return 'healthcare'
  if (normalized.includes('educ')) return 'education'
  if (normalized.includes('home') || normalized.includes('house')) return 'home_project'
  if (normalized.includes('vehicle') || normalized.includes('car')) return 'vehicle'
  return fallback
}

function inferIncomeCategoryFromLabel(label: string, fallback: FutureIncomePlan["category"]): FutureIncomePlan["category"] {
  const normalized = label.trim().toLowerCase()
  const option = FUTURE_INCOME_OPTIONS.find((item) => item.label.toLowerCase() === normalized)
  if (option) return option.key
  if (normalized.includes('pension')) return 'pension'
  if (normalized.includes('rental')) return 'rental'
  if (normalized.includes('social')) return 'social_security'
  if (normalized.includes('inherit')) return 'inheritance'
  if (normalized.includes('business')) return 'business'
  return fallback
}

export type StrategyName = "fixed" | "variable_percentage" | "guardrails"
export type SpendingFrequency = "annual" | "monthly"
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
  spendingFrequency: SpendingFrequency
  onSpendingFrequencyChange: (v: SpendingFrequency) => void
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
  incomeDurationYears: number
  onIncomeDurationYears: (v: number) => void
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
  variant?: "landing" | "results"
  onShare?: () => void
  selectedPreset?: "lean" | "baseline" | "fat" | null
}

function FieldHeader({ label, help }: { label: string; help?: string }) {
  const [open, setOpen] = useState(false)
  const infoId = useId()
  const infoRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handlePointer = (event: MouseEvent) => {
      if (!infoRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("mousedown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  return (
    <div className="field-header">
      <div className="field-header__row">
        <span className="label">{label}</span>
        {help && (
          <div className="field-header__info" ref={infoRef}>
            <button
              type="button"
              className="field-header__info-btn"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={`Learn more about ${label}`}
              aria-expanded={open}
              aria-controls={infoId}
            >
              <FaCircleInfo aria-hidden="true" />
            </button>
            {open && (
              <div className="field-header__popover" role="dialog" id={infoId} aria-label={label}>
                <div className="field-header__popover-body">{help}</div>
                <button
                  type="button"
                  className="field-header__info-close"
                  onClick={() => setOpen(false)}
                  aria-label="Close help"
                >
                  <FaXmark aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
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
  variant = "landing",
  market,
  markets,
  onMarketChange,
  currencyCode,
  initial,
  onInitial,
  spend,
  onSpend,
  spendingFrequency,
  onSpendingFrequencyChange,
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
  incomeDurationYears = 0,
  onIncomeDurationYears,
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
  onShare,
  selectedPreset = null,
}: Props) {
  const categoryLabelOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...SPENDING_CATEGORY_PRESETS.map((option) => option.label),
            ...spendingCategories.map((item) => item.label),
          ].filter((label) => label && label.trim().length),
        ),
      ),
    [spendingCategories],
  )
  const expenseLabelOptions = useMemo(() => FUTURE_EXPENSE_OPTIONS.map((option) => option.label), [])
  const incomeLabelOptions = useMemo(() => FUTURE_INCOME_OPTIONS.map((option) => option.label), [])
  const totalBreakdown = totalSpendingFromCategories(spendingCategories)
  const breakdownMatchesSpend = Math.abs(totalBreakdown - spend) < 0.5
  const spendDisplayValue = spendingFrequency === "monthly" ? spend / 12 : spend
  const displayBreakdownTotal = spendingFrequency === "monthly" ? totalBreakdown / 12 : totalBreakdown
  const breakdownUnitLabel = spendingFrequency === "monthly" ? "per month" : "per year"
  const isResultsView = variant === "results"
  const runButtonLabel = running ? "Running..." : "Run simulation"

  const renderRunActions = (position: "top" | "bottom") => {
    const isTop = position == "top"
    if (isTop && !isResultsView) return null

    return (
      <div className={clsx("run-actions", `run-actions--${position}`, { 'run-actions--results': isResultsView })}>
        <button
          type="button"
          className={clsx("btn", isTop ? "btn-primary" : "btn-primary btn-lg")}
          onClick={onRun}
          disabled={running}
        >
          {runButtonLabel}
        </button>
        {onShare && (
          <button
            type="button"
            className={clsx("btn", isTop ? "btn-secondary" : "btn-secondary btn-lg")}
            onClick={onShare}
            disabled={running}
          >
            Save & share
          </button>
        )}
      </div>
    )
  }

  const showStrategyInline = !isResultsView
  const [showStrategyInfo, setShowStrategyInfo] = useState(false)

  useEffect(() => {
    if (!isResultsView || !showStrategyInfo) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowStrategyInfo(false)
      }
    }
    window.addEventListener("keydown", handleKey)
    return () => window.removeEventListener("keydown", handleKey)
  }, [showStrategyInfo, isResultsView])

  useEffect(() => {
    if (!isResultsView && showStrategyInfo) {
      setShowStrategyInfo(false)
    }
  }, [isResultsView, showStrategyInfo])

  const handleCategoryChange = (index: number, update: Partial<SpendingCategoryPlan>) => {
    const current = spendingCategories[index]
    if (!current) return
    const nextRow = { ...current, ...update }

    if (Object.prototype.hasOwnProperty.call(update, "label")) {
      const inferred = inferCategoryFromLabel(String(update.label ?? ""), nextRow.category)
      nextRow.category = inferred
      if (!Object.prototype.hasOwnProperty.call(update, "inflation")) {
        nextRow.inflation = suggestedInflationForSpending(inferred)
      }
    }

    if (Object.prototype.hasOwnProperty.call(update, "category") && !Object.prototype.hasOwnProperty.call(update, "inflation")) {
      nextRow.inflation = suggestedInflationForSpending(nextRow.category)
    }

    const next = spendingCategories.map((item, idx) => (idx === index ? nextRow : item))
    onSpendingCategoriesChange(next)
  }

  const handleAddCategory = () => {
    const fallback = SPENDING_CATEGORY_PRESETS.find((option) => option.key === "other") ?? SPENDING_CATEGORY_PRESETS[0]
    onSpendingCategoriesChange([
      ...spendingCategories,
      {
        id: createId(),
        label: fallback?.label ?? "Custom need",
        amount: 0,
        inflation: suggestedInflationForSpending((fallback?.key ?? "other") as SpendingCategoryPlan["category"]),
        category: (fallback?.key ?? "other") as SpendingCategoryPlan["category"],
      },
    ])
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

  const matchExpenseOption = (label: string) => {
    const normalized = label.trim().toLowerCase()
    return FUTURE_EXPENSE_OPTIONS.find((option) => option.label.toLowerCase() === normalized)
  }

  const handleExpenseLabelChange = (index: number, nextLabel: string) => {
    const option = matchExpenseOption(nextLabel)
    const current = futureExpenses[index]
    const inferredCategory = inferExpenseCategoryFromLabel(nextLabel, current?.category ?? "other")
    const update: Partial<FutureExpensePlan> = { label: nextLabel, category: inferredCategory }
    if (option) {
      update.category = option.key
      update.inflation = option.defaultInflation
    } else if (!nextLabel.trim()) {
      update.category = current?.category ?? "other"
    }
    handleExpenseChange(index, update)
  }

  const handleAddExpense = () => {
    onFutureExpensesChange([
      ...futureExpenses,
      {
        id: createId(),
        label: "",
        amount: 0,
        startYear: 1,
        years: 1,
        inflation: 2.5,
        category: "other",
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

  const matchIncomeOption = (label: string) => {
    const normalized = label.trim().toLowerCase()
    return FUTURE_INCOME_OPTIONS.find((option) => option.label.toLowerCase() === normalized)
  }

  const handleIncomeLabelChange = (index: number, nextLabel: string) => {
    const option = matchIncomeOption(nextLabel)
    const current = futureIncomes[index]
    const inferredCategory = inferIncomeCategoryFromLabel(nextLabel, current?.category ?? "other")
    const update: Partial<FutureIncomePlan> = { label: nextLabel, category: inferredCategory }
    if (option) {
      update.category = option.key
      update.inflation = option.defaultInflation
    } else if (!nextLabel.trim()) {
      update.category = current?.category ?? "other"
    }
    handleIncomeChange(index, update)
  }

  const handleAddIncome = () => {
    onFutureIncomesChange([
      ...futureIncomes,
      {
        id: createId(),
        label: "",
        amount: 0,
        startYear: 1,
        years: 30,
        inflation: 3,
        category: "other",
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
      </div>

      <div className="plan-card__toolbar">
        {onApplyPreset && (
          <div className="preset-row">
            <span className="label">Quick presets</span>
            <div className="segmented segmented-lg">
              <button
                type="button"
                className={clsx({ active: selectedPreset === "lean" })}
                onClick={() => onApplyPreset("lean")}
                aria-pressed={selectedPreset === "lean"}
              >
                Lean
              </button>
              <button
                type="button"
                className={clsx({ active: selectedPreset === "baseline" })}
                onClick={() => onApplyPreset("baseline")}
                aria-pressed={selectedPreset === "baseline"}
              >
                Baseline
              </button>
              <button
                type="button"
                className={clsx({ active: selectedPreset === "fat" })}
                onClick={() => onApplyPreset("fat")}
                aria-pressed={selectedPreset === "fat"}
              >
                Fat FIRE
              </button>
            </div>
          </div>
        )}
        <div className="plan-card__market">
          <span className="label">Market data set</span>
          <div className="segmented segmented-lg">
            {markets.map((option) => (
              <button
                key={option.key}
                type="button"
                className={clsx({ active: market === option.key })}
                onClick={() => onMarketChange(option.key)}
                aria-pressed={market === option.key}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>


      <div className="divider" />

      {renderRunActions('top')}
      <SectionHeader title="Retirement Overview" hint="Set your current age and how long you want this plan to last." />
      <div className="row">
        <div>
          <FieldHeader label="Current age" />
          <NumberInput
            className="input"
            min={0}
            max={120}
            step={1}
            decimal={false}
            value={currentAge}
            onChange={(value) => onCurrentAge?.(value)}
          />
        </div>
        <div>
          <FieldHeader label="Years to fund" help="How many retirement years you'd like to cover." />
          <NumberInput
            className="input"
            min={1}
            max={60}
            step={1}
            decimal={false}
            value={years}
            onChange={(value) => onYears(value)}
          />
        </div>
      </div>

      <div className="divider" />



      <SectionHeader title="Income Streams" hint="Document guaranteed income so the simulator knows when to offset withdrawals." />
      <div className="income-section">
        <div className="income-working__grid">
          <div className="income-working__toggle">
            <FieldHeader label="Working status" />
            <div className="segmented segmented-sm">
              <button
                type="button"
                className={clsx({ active: stillWorking })}
                onClick={() => onStillWorking(true)}
                aria-pressed={stillWorking}
              >
                Still working
              </button>
              <button
                type="button"
                className={clsx({ active: !stillWorking })}
                onClick={() => onStillWorking(false)}
                aria-pressed={!stillWorking}
              >
                Retired
              </button>
            </div>
          </div>
          <div>
            <FieldHeader label="Years until retirement" help="Zero means you're retired now." />
            <NumberInput
              className="input"
              min={0}
              max={40}
              step={1}
              decimal={false}
              value={startDelayYears}
              onChange={(value) => onStartDelay(value)}
              disabled={!stillWorking}
            />
          </div>
          <div>
            <FieldHeader label="Annual savings until retirement" help="How much you plan to tuck away before leaving work." />
            <CurrencyInput
              value={annualContrib}
              onChange={onAnnualContrib}
              currency={currencyCode}
              disabled={!stillWorking}
            />
          </div>
          <div>
            <FieldHeader label="Expected real return while working" help="Real (after inflation) annual growth assumption before retirement." />
            <NumberInput
              className="input"
              min={0}
              max={15}
              step={0.1}
              value={expectedRealReturn}
              onChange={(value) => onExpectedRealReturn(value)}
              disabled={!stillWorking}
            />
          </div>
        </div>

        <div className="income-subsection">
          <div className="income-subsection__header">
            <span className="label">Part-time / Barista FIRE</span>
            <p className="help help-inline">Use part-time income to soften withdrawals in the early years of retirement.</p>
          </div>
          <div className="income-subsection__grid">
            <div>
              <FieldHeader label="Recurring yearly income" help="Guaranteed pension, Social Security, or part-time Barista FIRE income that offsets withdrawals." />
              <CurrencyInput value={incomeAmount} onChange={onIncomeAmount} currency={currencyCode} />
            </div>
            <div>
              <FieldHeader label="Starts in retirement year" help="Year offset from today (0 = immediately)." />
              <NumberInput
                className="input"
                min={0}
                max={60}
                step={1}
                decimal={false}
                value={incomeStartYear}
                onChange={(value) => onIncomeStartYear(value)}
              />
            </div>
            <div>
              <FieldHeader label="Years it lasts" help="Set to 0 to keep this income for your full retirement." />
              <NumberInput
                className="input"
                min={0}
                max={60}
                step={1}
                decimal={false}
                value={incomeDurationYears}
                onChange={(value) => onIncomeDurationYears(value)}
              />
            </div>
          </div>
        </div>

        <Accordion title="Additional Income Sources">
          <div className="income-grid">
            <div className="income-grid__row income-grid__row--header">
              <span>Category</span>
              <span>Amount</span>
              <span>Starts (yrs)</span>
              <span>Frequency</span>
              <span>Years</span>
              <span>Inflation %</span>
              <span />
            </div>
            {futureIncomes.map((item, idx) => {
              const isRecurring = item.frequency === "recurring"
              return (
                <div className="income-grid__row" key={item.id}>
                  <input
                    className="input"
                    type="text"
                    list={FUTURE_INCOME_DATALIST_ID}
                    aria-label="Income label"
                    value={item.label}
                    onChange={(e) => handleIncomeLabelChange(idx, e.target.value)}
                  />
                  <CurrencyInput value={item.amount} onChange={(value) => handleIncomeChange(idx, { amount: value })} currency={currencyCode} />
                  <NumberInput
                    className="input"
                    min={0}
                    max={60}
                    step={1}
                    decimal={false}
                    aria-label="Start year"
                    value={item.startYear}
                    onChange={(value) => handleIncomeChange(idx, { startYear: value })}
                  />
                  <select
                    className="select"
                    aria-label="Income frequency"
                    value={item.frequency}
                    onChange={(e) => handleIncomeChange(idx, { frequency: e.target.value as FutureIncomePlan['frequency'], years: e.target.value === 'recurring' ? item.years || 30 : 1 })}
                  >
                    {frequencyOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {isRecurring ? (
                    <NumberInput
                      className="input"
                      min={1}
                      max={40}
                      step={1}
                      decimal={false}
                      aria-label="Number of years"
                      value={item.years}
                      onChange={(value) => handleIncomeChange(idx, { years: value })}
                    />
                  ) : (
                    <span className="income-grid__muted">-</span>
                  )}
                  <NumberInput
                    className="input"
                    min={0}
                    max={10}
                    step={0.1}
                    aria-label="Income inflation percent"
                    value={item.inflation}
                    onChange={(value) => handleIncomeChange(idx, { inflation: value })}
                  />
                  <button
                    className="btn-icon btn-icon-danger"
                    type="button"
                    aria-label="Remove income"
                    onClick={() => handleRemoveIncome(idx)}
                  >
                    <FaCircleMinus aria-hidden="true" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="income-actions">
            <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddIncome}>
              Add income stream
            </button>
          </div>
          <datalist id={FUTURE_INCOME_DATALIST_ID}>
            {incomeLabelOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </Accordion>
      </div>

      <div className="divider" />

      <SectionHeader title="Portfolio Today" hint="What you've already saved. Adjust inflation if you need a custom nominal projection." />
      <div className="row portfolio-row">
        <div>
          <FieldHeader label="Current invested portfolio" help="Starting balance in today's currency." />
          <CurrencyInput value={initial} onChange={onInitial} currency={currencyCode} />
        </div>
        <div>
          <FieldHeader label="Inflation assumption" help="Used when toggling to nominal (actual) dollars." />
          <NumberInput
            className="input"
            min={0}
            max={15}
            step={0.1}
            value={inflationPct}
            onChange={(value) => onInflationPct?.(value)}
          />
        </div>
      </div>

      <div className="divider" />

      <SectionHeader
        title="Core Spending Plan"
        hint="Break your lifestyle costs into categories. We keep everything in today's dollars so you can compare apples to apples."
      />
      <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 240px" }}>
          <FieldHeader
            label={spendingFrequency === "monthly" ? "Total monthly living expenses" : "Total annual living expenses"}
            help="We'll scale the category amounts proportionally when you adjust this number."
          />
        </div>
        <div className="segmented segmented-sm" role="group" aria-label="Expense breakdown cadence">
          <button
            type="button"
            className={clsx({ active: spendingFrequency === "annual" })}
            onClick={() => onSpendingFrequencyChange("annual")}
            aria-pressed={spendingFrequency === "annual"}
          >
            Annual
          </button>
          <button
            type="button"
            className={clsx({ active: spendingFrequency === "monthly" })}
            onClick={() => onSpendingFrequencyChange("monthly")}
            aria-pressed={spendingFrequency === "monthly"}
          >
            Monthly
          </button>
        </div>
      </div>
      <CurrencyInput
        value={spendDisplayValue}
        onChange={(value) => {
          const normalized = spendingFrequency === "monthly" ? value * 12 : value
          onSpend(normalized)
        }}
        currency={currencyCode}
      />
      {!breakdownMatchesSpend && (
        <div className="help" style={{ color: "var(--accent)" }}>
          Breakdown total is {currencyCode} {displayBreakdownTotal.toLocaleString()} {breakdownUnitLabel}. Adjust categories to match the total above.
        </div>
      )}
      <Accordion title="Breakdown By Category (optional)" defaultOpen={false}>
        <div className="category-breakdown">
          <div className="category-breakdown__totals" style={{ color: breakdownMatchesSpend ? "var(--muted)" : "var(--accent)" }}>
            Breakdown total: {currencyCode} {displayBreakdownTotal.toLocaleString()} {breakdownUnitLabel}
            {!breakdownMatchesSpend && " (doesn't match total above yet)"}
          </div>
          <div className="category-grid">
            <div className="category-grid__row category-grid__row--header">
              <span>Category</span>
              <span>Amount</span>
              <span>Inflation %</span>
              <span />
            </div>
            {spendingCategories.map((item, idx) => (
              <div className="category-grid__row" key={item.id}>
                <input
                  className="input"
                  type="text"
                  list={SPENDING_CATEGORY_DATALIST_ID}
                  value={item.label}
                  onChange={(e) => handleCategoryChange(idx, { label: e.target.value })}
                />
                <CurrencyInput
                  value={spendingFrequency === "monthly" ? item.amount / 12 : item.amount}
                  onChange={(value) => {
                    const normalized = spendingFrequency === "monthly" ? value * 12 : value
                    handleCategoryChange(idx, { amount: normalized })
                  }}
                  currency={currencyCode}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={item.inflation}
                  onChange={(e) => handleCategoryChange(idx, { inflation: Number(e.target.value) })}
                />
                <button
                  className="btn-icon btn-icon-danger"
                  type="button"
                  aria-label="Remove category"
                  onClick={() => handleRemoveCategory(idx)}
                >
                  <FaCircleMinus aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
          <div className="category-actions">
            <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddCategory}>
              Add category
            </button>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => onSpendingCategoriesChange(defaultSpendingCategories(spend))}>
              Reset to suggested mix
            </button>
          </div>
          <datalist id={SPENDING_CATEGORY_DATALIST_ID}>
            {categoryLabelOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>
      </Accordion>

      <div className="divider" />

      <SectionHeader
        title="Future Spending Events"
        hint="Model one-time goals (home purchase) or recurring costs (college, healthcare). Amounts are in today's dollars; we grow them by the category inflation."
      />
      <div className="future-events">
        <div className="future-grid">
          <div className="future-grid__row future-grid__row--header">
            <span>Category</span>
            <span>Amount</span>
            <span>Starts (yrs)</span>
            <span>Frequency</span>
            <span>Years</span>
            <span>Inflation %</span>
            <span />
          </div>
          {futureExpenses.map((item, idx) => {
            const isRecurring = item.frequency === "recurring"
            return (
              <div className="future-grid__row" key={item.id}>
                <input
                  className="input"
                  type="text"
                  list={FUTURE_EXPENSE_DATALIST_ID}
                  aria-label="Expense label"
                  value={item.label}
                  onChange={(e) => handleExpenseLabelChange(idx, e.target.value)}
                />
                <CurrencyInput value={item.amount} onChange={(value) => handleExpenseChange(idx, { amount: value })} currency={currencyCode} />
                <NumberInput
                  className="input"
                  min={0}
                  max={60}
                  step={1}
                  decimal={false}
                  aria-label="Start year"
                  value={item.startYear}
                  onChange={(value) => handleExpenseChange(idx, { startYear: value })}
                />
                <select
                  className="select"
                  aria-label="Expense frequency"
                  value={item.frequency}
                  onChange={(e) => handleExpenseChange(idx, { frequency: e.target.value as FutureExpensePlan["frequency"], years: e.target.value === "recurring" ? item.years || 5 : 1 })}
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {isRecurring ? (
                  <NumberInput
                    className="input"
                    min={1}
                    max={40}
                    step={1}
                    decimal={false}
                    aria-label="Number of years"
                    value={item.years}
                    onChange={(value) => handleExpenseChange(idx, { years: value })}
                  />
                ) : (
                  <span className="future-grid__muted">-</span>
                )}
                <NumberInput
                  className="input"
                  min={0}
                  max={10}
                  step={0.1}
                  aria-label="Expense inflation percent"
                  value={item.inflation}
                  onChange={(value) => handleExpenseChange(idx, { inflation: value })}
                />
                <button
                  className="btn-icon btn-icon-danger"
                  type="button"
                  aria-label="Remove expense"
                  onClick={() => handleRemoveExpense(idx)}
                >
                  <FaCircleMinus aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
        <div className="future-actions">
          <button className="btn btn-secondary btn-sm" type="button" onClick={handleAddExpense}>
            Add goal or milestone
          </button>
        </div>
        <datalist id={FUTURE_EXPENSE_DATALIST_ID}>
          {expenseLabelOptions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </div>
      <div className="divider" />

      <div className="divider" />

      <SectionHeader title="Withdrawal Model" hint="Choose how withdrawals adjust over time." />
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

        {showStrategyInline ? (
          <div className="withdrawal-explainer">
            <p><strong>Fixed:</strong> Keeps withdrawals level in today's dollars. Example: on a $1,000,000 nest egg with a 4% target you withdraw $40,000 this year and adjust that amount only for inflation.</p>
            <p><strong>Variable %:</strong> Draws a set percentage of whatever the portfolio is worth each year. If you withdraw 4% from $1,000,000 ($40,000) and markets drop to $800,000, next year's withdrawal becomes $32,000.</p>
            <p><strong>Guardrails:</strong> Starts at your target withdrawal but increases or decreases it when the withdrawal rate drifts outside your guard band. For example, with a 4% goal and a +/-20% band you would raise spending if markets surge and trim it if the portfolio shrinks too far.</p>
          </div>
        ) : (
          <div className="withdrawal-info">
            <button
              type="button"
              className="info-trigger"
              onClick={() => setShowStrategyInfo((prev) => !prev)}
              aria-expanded={showStrategyInfo}
              aria-controls="withdrawal-info-dialog"
            >
              <FaCircleInfo aria-hidden="true" />
              <span>Explain the strategies</span>
            </button>
            {showStrategyInfo && (
              <div className="info-popover" role="dialog" id="withdrawal-info-dialog" aria-label="Withdrawal strategies">
                <div className="info-popover__header">
                  <h4>Withdrawal strategies</h4>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setShowStrategyInfo(false)}
                    aria-label="Close strategy explanations"
                  >
                    <FaXmark aria-hidden="true" />
                  </button>
                </div>
                <div className="info-popover__body">
                  <p><strong>Fixed:</strong> Keeps withdrawals level in today's dollars. Example: on a $1,000,000 nest egg with a 4% target you withdraw $40,000 this year and adjust that amount only for inflation.</p>
                  <p><strong>Variable %:</strong> Draws a set percentage of whatever the portfolio is worth each year. If you withdraw 4% from $1,000,000 ($40,000) and markets drop to $800,000, next year's withdrawal becomes $32,000.</p>
                  <p><strong>Guardrails:</strong> Starts at your target withdrawal but increases or decreases it when the withdrawal rate drifts outside your guard band. For example, with a 4% goal and a +/-20% band you would raise spending if markets surge and trim it if the portfolio shrinks too far.</p>
                </div>
              </div>
            )}
          </div>
        )}
      {strategy === "variable_percentage" && (
        <div>
          <FieldHeader label="Variable percentage" help="Annual percentage of the portfolio withdrawn." />
          <NumberInput className="input" min={1} max={10} step={0.1} value={vpwPct} onChange={(value) => onVpwPct(value)} />
        </div>
      )}

      {strategy === "guardrails" && (
        <div className="row">
          <div>
            <FieldHeader label="Guard band %" help="Width of the acceptable withdrawal range based on the initial withdrawal rate." />
            <NumberInput className="input" min={5} max={50} step={1} decimal={false} value={guardBand} onChange={(value) => onGuardBand(value)} />
          </div>
          <div>
            <FieldHeader label="Adjust step %" help="Percentage change applied when hitting a guardrail." />
            <NumberInput className="input" min={5} max={30} step={1} decimal={false} value={guardStep} onChange={(value) => onGuardStep(value)} />
          </div>
        </div>
      )}
      </div>

      <div className="divider" />

      {renderRunActions('bottom')}
      <div className="help">We'll test your plan against every historical sequence and a block-bootstrap Monte Carlo simulation.</div>
    </div>
  )
}

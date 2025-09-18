import Accordion from "./Accordion"
import CurrencyInput from "./CurrencyInput"

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
  otherIncomes?: { amount: number; start_year: number }[]
  onOtherIncomesChange?: (rows: { amount: number; start_year: number }[]) => void
  expenses?: { amount: number; at_year_from_now: number }[]
  onExpensesChange?: (rows: { amount: number; at_year_from_now: number }[]) => void
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
  otherIncomes = [],
  onOtherIncomesChange,
  expenses = [],
  onExpensesChange,
  onRun,
  running,
}: Props) {
  return (
    <div className="panel vstack plan-card">
      <div className="plan-card__heading">
        <div>
          <h3 className="title">Your Plan</h3>
          <p className="subtitle">Tune assumptions, then stress-test against historical and Monte Carlo scenarios.</p>
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
        <span className="label">Market focus</span>
        <div className="segmented segmented-lg">
          {markets.map((option) => (
            <button
              key={option.key}
              type="button"
              className={market === option.key ? "active" : ""}
              onClick={() => onMarketChange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <FieldHeader label="Initial portfolio" help="Starting portfolio in today's currency." />
      <CurrencyInput value={initial} onChange={onInitial} currency={currencyCode} />

      <FieldHeader label="Annual spending" help="Amount you plan to spend per year in today's currency." />
      <CurrencyInput value={spend} onChange={onSpend} currency={currencyCode} />

      <div>
        <FieldHeader label="Inflation" help="Expected annual inflation used for nominal projections." />
        <input className="input" type="number" min={0} max={15} step={0.1} value={inflationPct} onChange={(e) => onInflationPct?.(Number(e.target.value))} />
      </div>

      <div className="row">
        <div>
          <FieldHeader label="Working status" help="If you are still contributing, we'll project when you reach FI with the expected real return." />
          <select className="select" value={stillWorking ? "yes" : "no"} onChange={(e) => onStillWorking(e.target.value === "yes")}>
            <option value="yes">Still working</option>
            <option value="no">Already retired</option>
          </select>
        </div>
        <div>
          <FieldHeader label="Years to fund" help="How long the plan needs to last." />
          <input className="input" type="number" value={years} onChange={(e) => onYears(Number(e.target.value))} min={1} max={60} step={1} />
        </div>
        <div>
          <FieldHeader label="Current age" />
          <input className="input" type="number" min={0} max={120} step={1} value={currentAge} onChange={(e) => onCurrentAge?.(Number(e.target.value))} />
        </div>
      </div>

      {stillWorking && (
        <div className="row">
          <div>
            <FieldHeader label="Annual savings" help="Amount added to the portfolio each year until retirement." />
            <CurrencyInput value={annualContrib} onChange={onAnnualContrib} currency={currencyCode} />
          </div>
          <div>
            <FieldHeader label="Expected real return (pre-retirement)" />
            <input className="input" type="number" value={expectedRealReturn} onChange={(e) => onExpectedRealReturn(Number(e.target.value))} min={0} max={15} step={0.1} />
          </div>
          <div>
            <FieldHeader label="Years until retirement" />
            <input className="input" type="number" min={0} max={40} step={1} value={startDelayYears} onChange={(e) => onStartDelay(Number(e.target.value))} />
          </div>
        </div>
      )}

      <div>
        <span className="label">Withdrawal style</span>
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
          <FieldHeader label="Variable percentage" help="Annual percentage of portfolio withdrawn." />
          <input className="input" type="number" min={1} max={10} step={0.1} value={vpwPct} onChange={(e) => onVpwPct(Number(e.target.value))} />
        </div>
      )}

      {strategy === "guardrails" && (
        <div className="row">
          <div>
            <FieldHeader label="Guard band" help="Width of the acceptable withdrawal range based on the initial withdrawal rate." />
            <input className="input" type="number" min={5} max={50} step={1} value={guardBand} onChange={(e) => onGuardBand(Number(e.target.value))} />
          </div>
          <div>
            <FieldHeader label="Adjust step" help="Percentage adjustment applied when breaching the guard band." />
            <input className="input" type="number" min={5} max={30} step={1} value={guardStep} onChange={(e) => onGuardStep(Number(e.target.value))} />
          </div>
        </div>
      )}

      <div className="divider" />

      <Accordion title="Income in retirement">
        <div className="row">
          <div>
            <FieldHeader label="Annual income" help="Recurring income that offsets withdrawals once retirement begins." />
            <CurrencyInput value={incomeAmount} onChange={onIncomeAmount} currency={currencyCode} />
          </div>
          <div>
            <FieldHeader label="Starts in retirement year" />
            <input className="input" type="number" value={incomeStartYear} onChange={(e) => onIncomeStartYear(Number(e.target.value))} min={0} max={60} step={1} />
          </div>
        </div>
        {onOtherIncomesChange && (
          <div className="vstack">
            <span className="label">Additional income streams</span>
            {otherIncomes.map((row, idx) => (
              <div className="row" key={`income-${idx}`}>
                <CurrencyInput
                  value={row.amount}
                  onChange={(value) => {
                    const next = otherIncomes.slice()
                    next[idx] = { ...row, amount: value }
                    onOtherIncomesChange(next)
                  }}
                  currency={currencyCode}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  value={row.start_year}
                  onChange={(e) => {
                    const next = otherIncomes.slice()
                    next[idx] = { ...row, start_year: Number(e.target.value) }
                    onOtherIncomesChange(next)
                  }}
                />
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    const next = otherIncomes.filter((_, i) => i !== idx)
                    onOtherIncomesChange(next)
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => onOtherIncomesChange([...(otherIncomes || []), { amount: 0, start_year: 0 }])}
            >
              Add income line
            </button>
          </div>
        )}
      </Accordion>

      {onExpensesChange && (
        <Accordion title="One-time expenses (years from now)">
          <div className="vstack">
            <div className="help">Model large purchases such as a home down payment. Amounts are expressed in today's currency.</div>
            {expenses.map((row, idx) => (
              <div className="row" key={`expense-${idx}`}>
                <CurrencyInput
                  value={row.amount}
                  onChange={(value) => {
                    const next = expenses.slice()
                    next[idx] = { ...row, amount: value }
                    onExpensesChange(next)
                  }}
                  currency={currencyCode}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  value={row.at_year_from_now}
                  onChange={(e) => {
                    const next = expenses.slice()
                    next[idx] = { ...row, at_year_from_now: Number(e.target.value) }
                    onExpensesChange(next)
                  }}
                />
                <button
                  className="btn"
                  type="button"
                  onClick={() => {
                    const next = expenses.filter((_, i) => i !== idx)
                    onExpensesChange(next)
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="btn btn-secondary btn-sm"
              type="button"
              onClick={() => onExpensesChange([...(expenses || []), { amount: 0, at_year_from_now: 1 }])}
            >
              Add one-time expense
            </button>
          </div>
        </Accordion>
      )}

      <div className="divider" />

      <button className="btn btn-primary btn-lg" onClick={onRun} disabled={running}>
        {running ? "Running..." : "Run simulation"}
      </button>

      <div className="help">Runs every historical sequence and a Monte Carlo view for the selected market.</div>
    </div>
  )
}


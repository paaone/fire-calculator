import Inputs, { StrategyName, MarketSelection } from "./Inputs"

export default function Landing(props: {
  market: MarketSelection
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
  onSimulate: () => void
  running: boolean
  onApplyPreset?: (name: "lean" | "baseline" | "fat") => void
  assets?: { name?: string; amount: number }[]
  onAssetsChange?: (rows: { name?: string; amount: number }[]) => void
  otherIncomes?: { amount: number; start_year: number }[]
  onOtherIncomesChange?: (rows: { amount: number; start_year: number }[]) => void
  expenses?: { amount: number; at_year_from_now: number }[]
  onExpensesChange?: (rows: { amount: number; at_year_from_now: number }[]) => void
}) {
  const p = props
  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="landing-hero__copy">
          <h1>Modern FIRE planning for the US and India</h1>
          <p>
            Model your journey to financial independence with fresh historical data sources. Stress-test against every month of market history and Monte Carlo paths tailored to your region.
          </p>
          <div className="landing-hero__actions">
            <button className="btn btn-primary btn-lg" type="button" onClick={p.onSimulate} disabled={p.running}>
              {p.running ? "Preparing…" : "Jump to results"}
            </button>
            <span className="help">or tweak assumptions below before running the full simulation.</span>
          </div>
        </div>
      </section>

      <section className="landing-plan">
        <Inputs
          market={p.market}
          onMarketChange={p.onMarketChange}
          currencyCode={p.currencyCode}
          initial={p.initial}
          onInitial={p.onInitial}
          spend={p.spend}
          onSpend={p.onSpend}
          years={p.years}
          onYears={p.onYears}
          strategy={p.strategy}
          onStrategy={p.onStrategy}
          vpwPct={p.vpwPct}
          onVpwPct={p.onVpwPct}
          guardBand={p.guardBand}
          onGuardBand={p.onGuardBand}
          guardStep={p.guardStep}
          onGuardStep={p.onGuardStep}
          startDelayYears={p.startDelayYears}
          onStartDelay={p.onStartDelay}
          annualContrib={p.annualContrib}
          onAnnualContrib={p.onAnnualContrib}
          incomeAmount={p.incomeAmount}
          onIncomeAmount={p.onIncomeAmount}
          incomeStartYear={p.incomeStartYear}
          onIncomeStartYear={p.onIncomeStartYear}
          stillWorking={p.stillWorking}
          onStillWorking={p.onStillWorking}
          expectedRealReturn={p.expectedRealReturn}
          onExpectedRealReturn={p.onExpectedRealReturn}
          currentAge={p.currentAge}
          onCurrentAge={p.onCurrentAge}
          inflationPct={p.inflationPct}
          onInflationPct={p.onInflationPct}
          otherIncomes={p.otherIncomes}
          onOtherIncomesChange={p.onOtherIncomesChange}
          expenses={p.expenses}
          onExpensesChange={p.onExpensesChange}
          onRun={p.onSimulate}
          running={p.running}
          onApplyPreset={p.onApplyPreset}
        />
      </section>
    </div>
  )
}

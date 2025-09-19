import Inputs, { StrategyName, MarketSelection } from "./Inputs"
import { SpendingCategoryPlan, FutureExpensePlan, FutureIncomePlan } from "../lib/planning"

interface MarketOption {
  key: MarketSelection
  label: string
}

type LandingProps = {
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
  onSimulate: () => void
  running: boolean
  onApplyPreset?: (name: "lean" | "baseline" | "fat") => void
  spendingCategories: SpendingCategoryPlan[]
  onSpendingCategoriesChange: (rows: SpendingCategoryPlan[]) => void
  futureExpenses: FutureExpensePlan[]
  onFutureExpensesChange: (rows: FutureExpensePlan[]) => void
  futureIncomes: FutureIncomePlan[]
  onFutureIncomesChange: (rows: FutureIncomePlan[]) => void
}

export default function Landing(p: LandingProps) {
  return (
    <div className="landing">
      <section className="landing__hero">
        <span className="landing__tag">Now covering US and India markets</span>
        <h1>Plan your FIRE journey with realistic market data</h1>
        <p>
          Stress-test your spending plan against every historical market path and a modern Monte Carlo simulation. Toggle markets,
          adjust assumptions, and get a feel for your odds before you pull the trigger.
        </p>
      </section>

      <section className="landing__panel">
        <Inputs
          variant="landing"
          market={p.market}
          markets={p.markets}
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
          spendingCategories={p.spendingCategories}
          onSpendingCategoriesChange={p.onSpendingCategoriesChange}
          futureExpenses={p.futureExpenses}
          onFutureExpensesChange={p.onFutureExpensesChange}
          futureIncomes={p.futureIncomes}
          onFutureIncomesChange={p.onFutureIncomesChange}
          onRun={p.onSimulate}
          running={p.running}
          onApplyPreset={p.onApplyPreset}
        />
      </section>
    </div>
  )
}

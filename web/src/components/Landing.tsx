import Inputs, { StrategyName } from './Inputs'

export default function Landing(props: {
  // Pass-through props to Inputs
  initial: number; onInitial: (v: number) => void
  spend: number; onSpend: (v: number) => void
  years: number; onYears: (v: number) => void
  strategy: StrategyName; onStrategy: (v: StrategyName) => void
  vpwPct: number; onVpwPct: (v: number) => void
  guardBand: number; onGuardBand: (v: number) => void
  guardStep: number; onGuardStep: (v: number) => void
  startDelayYears: number; onStartDelay: (v: number) => void
  annualContrib: number; onAnnualContrib: (v: number) => void
  incomeAmount: number; onIncomeAmount: (v: number) => void
  incomeStartYear: number; onIncomeStartYear: (v: number) => void
  stillWorking: boolean; onStillWorking: (v: boolean) => void
  expectedRealReturn: number; onExpectedRealReturn: (v: number) => void
  onSimulate: () => void; running: boolean
  assets?: { name?: string; amount: number }[]; onAssetsChange?: (rows: { name?: string; amount: number }[]) => void
  otherIncomes?: { amount: number; start_year: number }[]; onOtherIncomesChange?: (rows: { amount: number; start_year: number }[]) => void
  expenses?: { amount: number; at_year_from_now: number }[]; onExpensesChange?: (rows: { amount: number; at_year_from_now: number }[]) => void
}) {
  const p = props
  return (
    <div className="container">
      <div className="vstack" style={{ gap: 16 }}>
        <header className="panel">
          <h1 className="title" style={{ fontSize: 28, marginBottom: 6 }}>FIRE Calculator</h1>
          <p className="subtitle" style={{ marginBottom: 12 }}>
            Thinking about retiring early? The big question is simple: with what you have today, and what it costs to live, can you retire and keep your lifestyle?
          </p>
          <div>
            Averages don’t tell the story. Two people who retire a year apart can have very different outcomes. This calculator tests your plan against every historical start year and shows how often it worked, plus a Monte Carlo view to explore variability.
          </div>
        </header>

        <section className="panel">
          <h3 className="title" style={{ marginBottom: 8 }}>How it works</h3>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li>Enter your portfolio and spending. If you’re still working, add savings and expected real growth. We’ll estimate your FIRE date using the 4% rule (≈25× spending).</li>
            <li>We stress‑test your plan across every historical sequence of returns and report a success rate. You’ll also see ranges of outcomes year by year.</li>
            <li>All figures are in today’s dollars (inflation‑adjusted) to keep purchasing power comparable.</li>
          </ul>
        </section>

        <section className="panel">
          <h3 className="title" style={{ marginBottom: 8 }}>What to enter</h3>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
            <li><strong>Initial portfolio:</strong> Your investable assets in today’s dollars.</li>
            <li><strong>Annual spending:</strong> What you plan to spend each year (real). Start with current spend.</li>
            <li><strong>Still working:</strong> If yes, add annual savings and an expected real return to estimate your FIRE date.</li>
            <li><strong>Retirement years:</strong> How long the plan needs to last after retirement.</li>
            <li><strong>Other income:</strong> Social Security or pensions that start at a given retirement year offset portfolio withdrawals.</li>
            <li><strong>Withdrawal strategy:</strong> Fixed real dollars, VPW (percent of balance), or Guardrails (adjusts spending if the withdrawal rate drifts).</li>
          </ul>
        </section>

        <section className="panel vstack">
          <h3 className="title">Your details</h3>
          <Inputs
            initial={p.initial} onInitial={p.onInitial}
            spend={p.spend} onSpend={p.onSpend}
            years={p.years} onYears={p.onYears}
            strategy={p.strategy} onStrategy={p.onStrategy}
            vpwPct={p.vpwPct} onVpwPct={p.onVpwPct}
            guardBand={p.guardBand} onGuardBand={p.onGuardBand}
            guardStep={p.guardStep} onGuardStep={p.onGuardStep}
            startDelayYears={p.startDelayYears} onStartDelay={p.onStartDelay}
            annualContrib={p.annualContrib} onAnnualContrib={p.onAnnualContrib}
            incomeAmount={p.incomeAmount} onIncomeAmount={p.onIncomeAmount}
            incomeStartYear={p.incomeStartYear} onIncomeStartYear={p.onIncomeStartYear}
            stillWorking={p.stillWorking} onStillWorking={p.onStillWorking}
            expectedRealReturn={p.expectedRealReturn} onExpectedRealReturn={p.onExpectedRealReturn}
            assets={p.assets} onAssetsChange={p.onAssetsChange}
            otherIncomes={p.otherIncomes} onOtherIncomesChange={p.onOtherIncomesChange}
            expenses={p.expenses} onExpensesChange={p.onExpensesChange}
            onRun={p.onSimulate}
            running={p.running}
          />
          <div>
            <button className="btn" onClick={p.onSimulate} disabled={p.running}>Simulate</button>
          </div>
        </section>
      </div>
    </div>
  )
}

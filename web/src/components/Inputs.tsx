import InfoTip from './InfoTip'

export type StrategyName = 'fixed' | 'variable_percentage' | 'guardrails'

export default function Inputs(props: {
  initial: number; onInitial: (v: number) => void
  spend: number; onSpend: (v: number) => void
  years: number; onYears: (v: number) => void
  strategy: StrategyName; onStrategy: (v: StrategyName) => void
  vpwPct: number; onVpwPct: (v: number) => void
  guardBand: number; onGuardBand: (v: number) => void
  guardStep: number; onGuardStep: (v: number) => void
  onRun: () => void; running: boolean
}) {
  const { initial, onInitial, spend, onSpend, years, onYears, strategy, onStrategy, vpwPct, onVpwPct, guardBand, onGuardBand, guardStep, onGuardStep, onRun, running } = props
  return (
    <div className="panel vstack">
      <div>
        <h3 className="title">Scenario</h3>
        <div className="subtitle">Historical backtest across rolling periods plus Monte Carlo bootstrap.</div>
      </div>
      <label className="label">Initial Portfolio <InfoTip title="Initial portfolio">Starting portfolio in today's dollars. FireCalc and this tool use historical real (inflation-adjusted) returns, so inputs are in today's purchasing power.</InfoTip></label>
      <input className="input" type="number" value={initial} onChange={(e) => onInitial(Number(e.target.value))} min={0} step={1000} />

      <label className="label">Annual Spending <InfoTip title="Annual spending (real)">Amount you plan to spend per year, in today's dollars. With real returns, a fixed withdrawal means purchasing power stays constant.</InfoTip></label>
      <input className="input" type="number" value={spend} onChange={(e) => onSpend(Number(e.target.value))} min={0} step={500} />

      <div className="row">
        <div>
          <label className="label">Years <InfoTip title="Retirement length">How long the plan needs to last. FireCalc tests each historical window with this length to compute success rates.</InfoTip></label>
          <input className="input" type="number" value={years} onChange={(e) => onYears(Number(e.target.value))} min={1} max={60} step={1} />
        </div>
        <div>
          <label className="label">Strategy <InfoTip title="Withdrawal strategy">Choose a rule for withdrawals: Fixed real dollars, Variable % of portfolio (VPW), or Guardrails which adjust spending if withdrawal rate drifts too high/low.</InfoTip></label>
          <select className="select" value={strategy} onChange={(e) => onStrategy(e.target.value as StrategyName)}>
            <option value="fixed">Fixed (real dollars)</option>
            <option value="variable_percentage">Variable percentage (VPW)</option>
            <option value="guardrails">Guardrails (Guyton–Klinger-style)</option>
          </select>
        </div>
      </div>

      {strategy === 'variable_percentage' && (
        <div>
          <label className="label">Variable % of balance <InfoTip title="VPW">Withdraw a percentage of the current balance each year. 4%–5% is common; income varies with markets.</InfoTip></label>
          <input className="input" type="number" value={vpwPct} onChange={(e) => onVpwPct(Number(e.target.value))} min={1} max={10} step={0.25} />
        </div>
      )}

      {strategy === 'guardrails' && (
        <div className="row">
          <div>
            <label className="label">Guard band (±%) <InfoTip title="Guard band">How far the withdrawal rate can drift from the initial withdrawal rate before adjusting spending.</InfoTip></label>
            <input className="input" type="number" value={guardBand} onChange={(e) => onGuardBand(Number(e.target.value))} min={5} max={50} step={1} />
          </div>
          <div>
            <label className="label">Adjust step (±%) <InfoTip title="Adjust step">How much to raise or lower the annual spending when outside the guard band.</InfoTip></label>
            <input className="input" type="number" value={guardStep} onChange={(e) => onGuardStep(Number(e.target.value))} min={2} max={25} step={1} />
          </div>
        </div>
      )}

      <button className="btn" onClick={onRun} disabled={running}>{running ? 'Running…' : 'Run simulation'}</button>

      <div className="divider" />
      <div className="help">About FireCalc-style analysis: FireCalc popularized historical backtesting for retirement planning: it runs your plan through each real historical sequence of returns to show how often the portfolio succeeded for your chosen length. That success rate, plus distributions of outcomes, helps gauge sequence-of-returns risk beyond a single average return.</div>
    </div>
  )
}


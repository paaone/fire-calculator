import InfoTip from './InfoTip'
import Accordion from './Accordion'
import CurrencyInput from './CurrencyInput'

export type StrategyName = 'fixed' | 'variable_percentage' | 'guardrails'

export default function Inputs(props: {
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
  currentAge?: number; onCurrentAge?: (v: number) => void
  inflationPct?: number; onInflationPct?: (v: number) => void
  onApplyPreset?: (name: 'lean' | 'baseline' | 'fat') => void
  // Lists
  assets?: { name?: string; amount: number }[]; onAssetsChange?: (rows: { name?: string; amount: number }[]) => void
  otherIncomes?: { amount: number; start_year: number }[]; onOtherIncomesChange?: (rows: { amount: number; start_year: number }[]) => void
  expenses?: { amount: number; at_year_from_now: number }[]; onExpensesChange?: (rows: { amount: number; at_year_from_now: number }[]) => void
  onRun: () => void; running: boolean
}) {
  const { initial, onInitial, spend, onSpend, years, onYears, strategy, onStrategy, vpwPct, onVpwPct, guardBand, onGuardBand, guardStep, onGuardStep, startDelayYears, onStartDelay, annualContrib, onAnnualContrib, incomeAmount, onIncomeAmount, incomeStartYear, onIncomeStartYear, stillWorking, onStillWorking, expectedRealReturn, onExpectedRealReturn, currentAge = 0, onCurrentAge, inflationPct = 3, onInflationPct, onApplyPreset, assets = [], onAssetsChange, otherIncomes = [], onOtherIncomesChange, expenses = [], onExpensesChange, onRun, running } = props
  return (
    <div className="panel vstack">
      <div>
        <h3 className="title">Your Plan</h3>
      </div>

      {/* Presets removed for a cleaner, minimal UI */}
      <label className="label">Initial Portfolio <InfoTip title="Initial portfolio">Starting portfolio in today's dollars. FireCalc and this tool use historical real (inflation-adjusted) returns, so inputs are in today's purchasing power.</InfoTip></label>
      <CurrencyInput value={initial} onChange={onInitial} />

      <label className="label">Annual Spending <InfoTip title="Annual spending (real)">Amount you plan to spend per year, in today's dollars. With real returns, a fixed withdrawal means purchasing power stays constant.</InfoTip></label>
      <CurrencyInput value={spend} onChange={onSpend} />

      <div>
        <label className="label">Inflation (expected %)</label>
        <input className="input" type="number" min={0} max={15} step={0.1} value={inflationPct} onChange={(e) => onInflationPct?.(Number(e.target.value))} />
      </div>

      <div className="row">
        <div>
          <label className="label">Still working? <InfoTip title="Working status">If yes, we’ll estimate when you hit your FIRE number given savings and expected returns.</InfoTip></label>
          <select className="select" value={stillWorking ? 'yes' : 'no'} onChange={(e) => onStillWorking(e.target.value === 'yes')}>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div>
          <label className="label">Years (retirement horizon) <InfoTip title="Retirement length">How long the plan needs to last after retirement.</InfoTip></label>
          <input className="input" type="number" value={years} onChange={(e) => onYears(Number(e.target.value))} min={1} max={60} step={1} />
        </div>
        <div>
          <label className="label">Current age <InfoTip title="Optional">Used to show your age in the detailed cashflow table.</InfoTip></label>
          <input className="input" type="number" min={0} max={120} step={1} value={currentAge} onChange={(e) => onCurrentAge?.(Number(e.target.value))} />
        </div>
      </div>

      {stillWorking && (
        <>
          <div className="row">
            <div>
              <label className="label">Annual savings (real) <InfoTip title="Annual contributions">Amount added to the portfolio each year until retirement.</InfoTip></label>
              <CurrencyInput value={annualContrib} onChange={onAnnualContrib} />
            </div>
            <div>
              <label className="label">Expected real return (pre‑retirement) <InfoTip title="Real growth">Average annual real growth while working (for the FI estimate). A typical range is 3%–6%.</InfoTip></label>
              <input className="input" type="number" value={expectedRealReturn} onChange={(e) => onExpectedRealReturn(Number(e.target.value))} min={0} max={15} step={0.25} />
            </div>
          </div>
          <div>
            <label className="label">Estimated years to FIRE <InfoTip title="FIRE date">We use the 4% rule (25× spending) to compute a target. Then we estimate when you’ll reach it given your savings and expected growth.</InfoTip></label>
            <input className="input" type="number" value={startDelayYears} onChange={(e) => onStartDelay(Number(e.target.value))} min={0} max={40} step={1} />
          </div>
        </>
      )}

      <Accordion title="Withdrawal strategy">
        <div className="vstack">
          <div>
            <label className="label">Strategy <InfoTip title="Withdrawal strategy">Choose a rule for withdrawals: Fixed real dollars, Variable % (VPW), or Guardrails which adjust spending if your withdrawal rate drifts too high/low.</InfoTip></label>
            <select className="select" value={strategy} onChange={(e) => onStrategy(e.target.value as StrategyName)}>
              <option value="fixed">Fixed (real dollars)</option>
              <option value="variable_percentage">Variable percentage (VPW)</option>
              <option value="guardrails">Guardrails (Guyton–Klinger‑style)</option>
            </select>
          </div>

          <div className="help">
            Example: If you have $1,000,000 and plan to spend $40,000, the initial withdrawal rate is 4%.
            - Fixed keeps $40,000 per year in today’s dollars (real) regardless of market swings.
            - VPW withdraws a percentage of the current balance each year (e.g., 4%), so income rises or falls with markets.
            - Guardrails adjusts spending up or down if your withdrawal rate drifts outside ±band around the initial 4%.
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
        </div>
      </Accordion>

      <Accordion title="Other income (Social Security, pensions)">
        <div className="vstack">
          <div className="row">
            <div>
              <label className="label">Annual income (real) <InfoTip title="Recurring income">Amount received each year in retirement. The portfolio withdraws only what income does not cover.</InfoTip></label>
              <CurrencyInput value={incomeAmount} onChange={onIncomeAmount} />
            </div>
            <div>
              <label className="label">Starts in retirement year</label>
              <input className="input" type="number" value={incomeStartYear} onChange={(e) => onIncomeStartYear(Number(e.target.value))} min={0} max={60} step={1} />
            </div>
          </div>
          {onOtherIncomesChange && (
            <div className="vstack">
              <div className="label">Add other income lines</div>
              {otherIncomes.map((row, idx) => (
                <div className="row" key={idx}>
                  <CurrencyInput value={row.amount} onChange={(v) => {
                    const next = otherIncomes.slice(); next[idx] = { ...row, amount: v }; onOtherIncomesChange(next)
                  }} />
                  <input className="input" type="number" min={0} max={60} step={1} value={row.start_year} onChange={(e) => {
                    const next = otherIncomes.slice(); next[idx] = { ...row, start_year: Number(e.target.value) }; onOtherIncomesChange(next)
                  }} />
                  <button className="btn" type="button" onClick={() => {
                    const next = otherIncomes.filter((_, i) => i !== idx); onOtherIncomesChange(next)
                  }}>Remove</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => onOtherIncomesChange([...(otherIncomes||[]), { amount: 0, start_year: 0 }])}>Add another income</button>
            </div>
          )}
        </div>
      </Accordion>

      {onExpensesChange && (
        <Accordion title="One‑time expenses (years from now)">
          <div className="vstack">
            <div className="help">Model big purchases like a house or education. These apply in the end of the specified year from now.</div>
            {expenses.map((row, idx) => (
              <div className="row" key={idx}>
                <CurrencyInput value={row.amount} onChange={(v) => {
                  const next = expenses.slice(); next[idx] = { ...row, amount: v }; onExpensesChange(next)
                }} />
                <input className="input" type="number" min={0} max={60} step={1} value={row.at_year_from_now} onChange={(e) => {
                  const next = expenses.slice(); next[idx] = { ...row, at_year_from_now: Number(e.target.value) }; onExpensesChange(next)
                }} />
                <button className="btn" type="button" onClick={() => {
                  const next = expenses.filter((_, i) => i !== idx); onExpensesChange(next)
                }}>Remove</button>
              </div>
            ))}
            <button className="btn" type="button" onClick={() => onExpensesChange([...(expenses||[]), { amount: 0, at_year_from_now: 1 }])}>Add one‑time expense</button>
          </div>
        </Accordion>
      )}

      {false && onAssetsChange && (
        <Accordion title="Assets (sum to initial portfolio)">
          <div className="vstack">
            {assets.map((row, idx) => (
              <div className="row" key={idx}>
                <input className="input" type="text" placeholder="Name (optional)" value={row.name || ''} onChange={(e) => {
                  const next = assets.slice(); next[idx] = { ...row, name: e.target.value }; onAssetsChange(next)
                }} />
                <CurrencyInput value={row.amount} onChange={(v) => {
                  const next = assets.slice(); next[idx] = { ...row, amount: v }; onAssetsChange(next)
                }} />
                <button className="btn" type="button" onClick={() => {
                  const next = assets.filter((_, i) => i !== idx); onAssetsChange(next)
                }}>Remove</button>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => onAssetsChange([...(assets||[]), { name: '', amount: 0 }])}>Add asset</button>
          </div>
        </Accordion>
      )}

      <div className="divider" />

      <button className="btn" onClick={onRun} disabled={running}>{running ? 'Running…' : 'Run simulation'}</button>

      <div className="divider" />
      <div className="help">One‑stop FIRE: Estimate your retirement date (4% rule), incorporate other income, then stress‑test against every historical sequence and a Monte Carlo view.</div>
    </div>
  )
}



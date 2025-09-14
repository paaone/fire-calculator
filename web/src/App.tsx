import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ProjectionChart, { SeriesPoint } from './components/ProjectionChart'
import Histogram from './components/Histogram'
import Inputs, { StrategyName } from './components/Inputs'
import { fetchHistorical, fetchMonteCarlo, SimRequest, Strategy } from './lib/api'
import { computeYearsToFI, fireTargetFromSpend } from './lib/journey'
import Accordion from './components/Accordion'
import { FaCircleCheck, FaCircleExclamation } from 'react-icons/fa6'

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function App() {
  const [initial, setInitial] = useState(1_000_000)
  const [spend, setSpend] = useState(40_000)
  const [years, setYears] = useState(30)
  const [strategyName, setStrategyName] = useState<StrategyName>('fixed')
  const [vpwPct, setVpwPct] = useState(4)
  const [guardBand, setGuardBand] = useState(20)
  const [guardStep, setGuardStep] = useState(10)
  const [startDelayYears, setStartDelayYears] = useState(0)
  const [annualContrib, setAnnualContrib] = useState(0)
  const [incomeAmount, setIncomeAmount] = useState(0)
  const [incomeStartYear, setIncomeStartYear] = useState(0)
  const [stillWorking, setStillWorking] = useState(true)
  const [expectedRealReturn, setExpectedRealReturn] = useState(5)

  const strategy: Strategy = useMemo(() => {
    if (strategyName === 'variable_percentage') return { type: 'variable_percentage', percentage: vpwPct / 100 }
    if (strategyName === 'guardrails') return { type: 'guardrails', guard_band: guardBand / 100, adjust_step: guardStep / 100 }
    return { type: 'fixed' }
  }, [strategyName, vpwPct, guardBand, guardStep])

  const req: SimRequest = useMemo(() => ({
    initial, spend, years, strategy,
    start_delay_years: startDelayYears,
    annual_contrib: annualContrib,
    income_amount: incomeAmount,
    income_start_year: incomeStartYear,
  }), [initial, spend, years, strategy, startDelayYears, annualContrib, incomeAmount, incomeStartYear])

  const histQuery = useQuery({
    queryKey: ['historical', req],
    queryFn: () => fetchHistorical(req),
  })
  const mcQuery = useQuery({
    queryKey: ['montecarlo', req],
    queryFn: () => fetchMonteCarlo(req),
  })

  const loading = histQuery.isLoading || mcQuery.isLoading
  const error = histQuery.error || mcQuery.error
  const hist = histQuery.data
  const mc = mcQuery.data

  const baseYear = new Date().getFullYear()
  const toSeries = (res: any): SeriesPoint[] =>
    (res?.quantiles?.p90 || []).map((_: number, i: number) => ({
      month: i + 1,
      year: baseYear + Math.floor(i / 12),
      p10: res.quantiles.p10[i],
      p90: res.quantiles.p90[i],
      band: res.quantiles.p90[i] - res.quantiles.p10[i],
    }))

  // Auto-estimate years to FIRE when working
  const fireTarget = fireTargetFromSpend(spend, 0.04)
  const estimatedYearsToFI = computeYearsToFI({ balance: initial, target: fireTarget, annualContrib, realReturnPct: expectedRealReturn })
  useEffect(() => {
    if (stillWorking) setStartDelayYears(estimatedYearsToFI)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, spend, annualContrib, expectedRealReturn, stillWorking])

  return (
    <div className="container">
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="title" style={{ fontSize: 28 }}>FIRE Calculator</h1>
          <p className="subtitle">Skip averages. Test every start year and see how often your plan survives.</p>
        </div>
        <span className="badge">beta</span>
      </div>

      <Accordion title="New to FIRE? Start here (click to expand)" defaultOpen={false}>
        <div className="vstack">
          <div><strong>The big question:</strong> With what you have today and what it costs to live, can you retire and keep the same lifestyle?</div>
          <div>Average returns hide <em>sequence risk</em>. Two people who retire a year apart can have very different outcomes. So we test your plan against <strong>every historical start year (since 1947)</strong> and show how often it worked, plus a Monte Carlo view.</div>
          <div className="hstack" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div><strong>How to use:</strong> Enter portfolio and spending. If still working, add savings and expected real growth to estimate your FIRE year. Add other income (Social Security/pension) if relevant. Then review success rates and ranges.</div>
          </div>
          <div><strong>Rule of thumb (4%):</strong> A starting target is <strong>25× spending</strong>. This app estimates when you’ll reach that, then stress‑tests the plan against history.</div>
          <div className="help">All inputs and results are in today’s dollars (inflation‑adjusted).</div>
        </div>
      </Accordion>

      <div className="grid grid-2">
        <Inputs
          initial={initial} onInitial={setInitial}
          spend={spend} onSpend={setSpend}
          years={years} onYears={setYears}
          strategy={strategyName} onStrategy={setStrategyName}
          vpwPct={vpwPct} onVpwPct={setVpwPct}
          guardBand={guardBand} onGuardBand={setGuardBand}
          guardStep={guardStep} onGuardStep={setGuardStep}
          startDelayYears={startDelayYears} onStartDelay={setStartDelayYears}
          annualContrib={annualContrib} onAnnualContrib={setAnnualContrib}
          incomeAmount={incomeAmount} onIncomeAmount={setIncomeAmount}
          incomeStartYear={incomeStartYear} onIncomeStartYear={setIncomeStartYear}
          stillWorking={stillWorking} onStillWorking={setStillWorking}
          expectedRealReturn={expectedRealReturn} onExpectedRealReturn={setExpectedRealReturn}
          onRun={() => { histQuery.refetch(); mcQuery.refetch() }} running={loading}
        />

        <div className="grid" style={{ alignContent: 'start' }}>
          {error && <div className="panel" style={{ borderColor: '#7f1d1d', color: '#fecaca' }}>Error: {(error as any)?.message || String(error)}</div>}
          <div className="panel">
            <div className="hstack" style={{ gap: 16, flexWrap: 'wrap' }}>
              <div className="badge">FIRE target (25×): {currency(fireTarget)}</div>
              {stillWorking && <div className="badge" style={{ background: '#dbeafe', borderColor: '#bfdbfe', color: '#1e3a8a' }}>Estimated FI year: {baseYear + estimatedYearsToFI}</div>}
              {hist && <div className="badge" style={{ background: '#ecfdf5', borderColor: '#bbf7d0', color: '#065f46' }}>Historical success: {hist.success_rate.toFixed(1)}%</div>}
              {mc && <div className="badge" style={{ background: '#ecfdf5', borderColor: '#bbf7d0', color: '#065f46' }}>Monte Carlo success: {mc.success_rate.toFixed(1)}%</div>}
            </div>
          </div>

          {hist && hist.success_rate >= 80 && (
            <>
              <div className="callout"><div className="hstack" style={{ gap: 8 }}><FaCircleCheck color="#16a34a" /><strong>You’re FI‑ready based on history.</strong> Success rate is at least 80%. Explore the range below.</div></div>
              <ProjectionChart data={toSeries(hist)} title="Historical projection (real $)" retireAtMonths={startDelayYears * 12} />
              <ProjectionChart data={toSeries(mc)} title="Monte Carlo projection (real $)" retireAtMonths={startDelayYears * 12} />
              <Histogram values={hist.ending_balances} title="Historical ending balances" />
            </>
          )}
          {hist && hist.success_rate < 80 && (
            <div className="callout-warn"><div className="hstack" style={{ gap: 8 }}><FaCircleExclamation color="#b45309" /><strong>Not quite there yet.</strong> Success is below 80%. Try lowering spending, saving more, or delaying retirement and rerun.</div></div>
          )}
        </div>
      </div>
    </div>
  )
}

function median(arr: number[]): number {
  const a = [...arr].sort((x, y) => x - y)
  const mid = Math.floor(a.length / 2)
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ProjectionChart, { SeriesPoint } from './components/ProjectionChart'
import Histogram from './components/Histogram'
import Inputs, { StrategyName } from './components/Inputs'
import { fetchHistorical, fetchMonteCarlo, SimRequest, Strategy } from './lib/api'
import { computeYearsToFI, fireTargetFromSpend } from './lib/journey'
import Accordion from './components/Accordion'
import { FaCircleCheck, FaCircleExclamation } from 'react-icons/fa6'
import Landing from './components/Landing'

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function App() {
  const [view, setView] = useState<'landing' | 'results'>('landing')
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
  const [assets, setAssets] = useState<{ name?: string; amount: number }[]>([])
  const [otherIncomes, setOtherIncomes] = useState<{ amount: number; start_year: number }[]>([])
  const [expenses, setExpenses] = useState<{ amount: number; at_year_from_now: number }[]>([])
  const [nPaths, setNPaths] = useState(1000)
  const [blockSize, setBlockSize] = useState(12)

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
    other_incomes: otherIncomes,
    one_time_expenses: expenses,
    assets,
  }), [initial, spend, years, strategy, startDelayYears, annualContrib, incomeAmount, incomeStartYear, otherIncomes, expenses, assets])

  const histQuery = useQuery({
    queryKey: ['historical', req],
    queryFn: () => fetchHistorical(req),
    enabled: view === 'results',
  })
  const mcQuery = useQuery({
    queryKey: ['montecarlo', req, nPaths, blockSize],
    queryFn: () => fetchMonteCarlo({ ...req, n_paths: nPaths, block_size: blockSize }),
    enabled: view === 'results',
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

  // Presets
  function applyPreset(name: 'lean' | 'baseline' | 'fat') {
    if (name === 'lean') {
      setInitial(500_000); setSpend(25_000); setYears(30); setStillWorking(true); setAnnualContrib(15_000); setExpectedRealReturn(5); setStrategyName('fixed'); setIncomeAmount(0); setIncomeStartYear(0)
    } else if (name === 'baseline') {
      setInitial(1_000_000); setSpend(40_000); setYears(30); setStillWorking(true); setAnnualContrib(20_000); setExpectedRealReturn(5); setStrategyName('fixed'); setIncomeAmount(0); setIncomeStartYear(0)
    } else {
      setInitial(2_000_000); setSpend(100_000); setYears(35); setStillWorking(false); setAnnualContrib(0); setExpectedRealReturn(4); setStrategyName('fixed'); setIncomeAmount(0); setIncomeStartYear(0)
    }
  }

  // Save & share link
  function buildShareURL() {
    const url = new URL(window.location.href)
    const p = new URLSearchParams()
    p.set('i', String(initial))
    p.set('s', String(spend))
    p.set('y', String(years))
    p.set('sw', stillWorking ? '1' : '0')
    p.set('ac', String(annualContrib))
    p.set('er', String(expectedRealReturn))
    p.set('sd', String(startDelayYears))
    p.set('ia', String(incomeAmount))
    p.set('isy', String(incomeStartYear))
    p.set('st', strategyName)
    if (strategyName === 'variable_percentage') p.set('vp', String(vpwPct))
    if (strategyName === 'guardrails') { p.set('gb', String(guardBand)); p.set('gs', String(guardStep)) }
    p.set('np', String(nPaths))
    p.set('bs', String(blockSize))
    const extras = { assets, otherIncomes, expenses }
    try { p.set('x', encodeURIComponent(JSON.stringify(extras))) } catch {}
    url.search = p.toString()
    return url.toString()
  }

  async function copyShareLink() {
    const link = buildShareURL()
    try { await navigator.clipboard.writeText(link) } catch {}
    window.history.replaceState(null, '', link)
    alert('Shareable link copied to clipboard')
  }

  // Hydrate from URL
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (!sp.size) return
    const num = (k: string, d: number) => { const v = Number(sp.get(k)); return isNaN(v) ? d : v }
    const str = (k: string, d: string) => sp.get(k) ?? d
    const has = (k: string) => sp.has(k)
    setInitial(num('i', 1_000_000))
    setSpend(num('s', 40_000))
    setYears(num('y', 30))
    setStillWorking(str('sw', '1') === '1')
    setAnnualContrib(num('ac', 0))
    setExpectedRealReturn(num('er', 5))
    setStartDelayYears(num('sd', 0))
    setIncomeAmount(num('ia', 0))
    setIncomeStartYear(num('isy', 0))
    const st = str('st', 'fixed') as StrategyName
    setStrategyName(st)
    if (st === 'variable_percentage' && has('vp')) setVpwPct(num('vp', 4))
    if (st === 'guardrails') { setGuardBand(num('gb', 20)); setGuardStep(num('gs', 10)) }
    setNPaths(num('np', 1000))
    setBlockSize(num('bs', 12))
    // Extras (assets/incomes/expenses)
    const x = sp.get('x')
    if (x) {
      try {
        const obj = JSON.parse(decodeURIComponent(x))
        if (obj.assets) setAssets(obj.assets)
        if (obj.otherIncomes) setOtherIncomes(obj.otherIncomes)
        if (obj.expenses) setExpenses(obj.expenses)
      } catch {}
    }
    setView('results')
  }, [])

  if (view === 'landing') {
    return (
      <Landing
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
        assets={assets} onAssetsChange={setAssets}
        otherIncomes={otherIncomes} onOtherIncomesChange={setOtherIncomes}
        expenses={expenses} onExpensesChange={setExpenses}
        onSimulate={() => setView('results')}
        running={loading}
      />
    )
  }

  return (
    <div className="container">
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
          assets={assets} onAssetsChange={setAssets}
          otherIncomes={otherIncomes} onOtherIncomesChange={setOtherIncomes}
          expenses={expenses} onExpensesChange={setExpenses}
          onApplyPreset={applyPreset}
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
              <button className="btn" style={{ padding: '6px 10px', marginLeft: 'auto' }} onClick={copyShareLink}>Save & share</button>
            </div>
          </div>

          <Accordion title="Advanced (Monte Carlo)" defaultOpen={false}>
            <div className="row">
              <div>
                <label className="label">Simulated paths</label>
                <input className="input" type="number" min={100} max={10000} step={100} value={nPaths} onChange={(e) => setNPaths(Number(e.target.value))} />
              </div>
              <div>
                <label className="label">Block size (months)</label>
                <input className="input" type="number" min={1} max={60} step={1} value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} />
              </div>
            </div>
          </Accordion>

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

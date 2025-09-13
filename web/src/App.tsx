import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ProjectionChart, { SeriesPoint } from './components/ProjectionChart'
import Histogram from './components/Histogram'
import Inputs, { StrategyName } from './components/Inputs'
import { fetchHistorical, fetchMonteCarlo, SimRequest, Strategy } from './lib/api'

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

  const strategy: Strategy = useMemo(() => {
    if (strategyName === 'variable_percentage') return { type: 'variable_percentage', percentage: vpwPct / 100 }
    if (strategyName === 'guardrails') return { type: 'guardrails', guard_band: guardBand / 100, adjust_step: guardStep / 100 }
    return { type: 'fixed' }
  }, [strategyName, vpwPct, guardBand, guardStep])

  const req: SimRequest = useMemo(() => ({ initial, spend, years, strategy }), [initial, spend, years, strategy])

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

  const toSeries = (res: any): SeriesPoint[] =>
    (res?.quantiles?.p50 || []).map((_: number, i: number) => ({
      month: i + 1,
      p10: res.quantiles.p10[i],
      p50: res.quantiles.p50[i],
      p90: res.quantiles.p90[i],
      band: res.quantiles.p90[i] - res.quantiles.p10[i],
    }))

  return (
    <div className="container">
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 className="title" style={{ fontSize: 28 }}>FIRE Calculator</h1>
          <p className="subtitle">Historical backtesting with real US market returns + Monte Carlo.</p>
        </div>
        <span className="badge">beta</span>
      </div>

      <div className="grid grid-2">
        <Inputs
          initial={initial} onInitial={setInitial}
          spend={spend} onSpend={setSpend}
          years={years} onYears={setYears}
          strategy={strategyName} onStrategy={setStrategyName}
          vpwPct={vpwPct} onVpwPct={setVpwPct}
          guardBand={guardBand} onGuardBand={setGuardBand}
          guardStep={guardStep} onGuardStep={setGuardStep}
          onRun={() => { histQuery.refetch(); mcQuery.refetch() }} running={loading}
        />

        <div className="grid" style={{ alignContent: 'start' }}>
          {error && <div className="panel" style={{ borderColor: '#7f1d1d', color: '#fecaca' }}>Error: {(error as any)?.message || String(error)}</div>}
          {hist && (
            <div className="panel">
              <div className="hstack" style={{ gap: 16 }}>
                <div>Historical success: <strong className="success">{hist.success_rate.toFixed(1)}%</strong></div>
                {mc && <div>Monte Carlo success: <strong className="success">{mc.success_rate.toFixed(1)}%</strong></div>}
                <div className="help">Median ending (hist): {currency(median(hist.ending_balances))}</div>
              </div>
            </div>
          )}

          {hist && <ProjectionChart data={toSeries(hist)} title="Historical projection (P10–P90 band, median line)" />}
          {mc && <ProjectionChart data={toSeries(mc)} title="Monte Carlo projection (P10–P90 band, median line)" />}
          {hist && <Histogram values={hist.ending_balances} title="Historical ending balances" />}
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

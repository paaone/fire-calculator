import { useEffect, useMemo, useState } from 'react'
import ProjectionChart, { SeriesPoint } from './components/ProjectionChart'
import Histogram from './components/Histogram'
import { fetchHistorical, fetchMonteCarlo, SimRequest, Strategy } from './lib/api'

type StrategyName = 'fixed' | 'variable_percentage' | 'guardrails'

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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hist, setHist] = useState<any | null>(null)
  const [mc, setMc] = useState<any | null>(null)

  const strategy: Strategy = useMemo(() => {
    if (strategyName === 'variable_percentage') return { type: 'variable_percentage', percentage: vpwPct / 100 }
    if (strategyName === 'guardrails') return { type: 'guardrails', guard_band: guardBand / 100, adjust_step: guardStep / 100 }
    return { type: 'fixed' }
  }, [strategyName, vpwPct, guardBand, guardStep])

  const req: SimRequest = useMemo(() => ({ initial, spend, years, strategy }), [initial, spend, years, strategy])

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const [h, m] = await Promise.all([fetchHistorical(req), fetchMonteCarlo(req)])
      setHist(h)
      setMc(m)
    } catch (e: any) {
      setError(e?.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toSeries = (res: any): SeriesPoint[] =>
    (res?.quantiles?.p50 || []).map((_: number, i: number) => ({
      month: i + 1,
      p10: res.quantiles.p10[i],
      p50: res.quantiles.p50[i],
      p90: res.quantiles.p90[i],
    }))

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 20, fontFamily: 'system-ui, Segoe UI, Arial, sans-serif' }}>
      <h1 style={{ marginTop: 0 }}>FIRE Calculator</h1>
      <p style={{ marginTop: -12, color: '#666' }}>Backtest with US total market real returns, Monte Carlo, and flexible withdrawals.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        <div>
          <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
            <h3>Inputs</h3>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Initial balance
              <input type="number" value={initial} onChange={(e) => setInitial(Number(e.target.value))} min={0} step={1000} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Annual spending
              <input type="number" value={spend} onChange={(e) => setSpend(Number(e.target.value))} min={0} step={100} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', marginBottom: 8 }}>
              Years
              <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} min={1} max={60} step={1} style={{ width: '100%', padding: 8, marginTop: 4 }} />
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              Strategy
              <select value={strategyName} onChange={(e) => setStrategyName(e.target.value as StrategyName)} style={{ width: '100%', padding: 8, marginTop: 4 }}>
                <option value="fixed">Fixed (real dollar)</option>
                <option value="variable_percentage">Variable percentage (VPW)</option>
                <option value="guardrails">Guardrails (Guyton–Klinger style)</option>
              </select>
            </label>

            {strategyName === 'variable_percentage' && (
              <label style={{ display: 'block', marginBottom: 8 }}>
                Withdrawal % of balance (annual)
                <input type="number" value={vpwPct} onChange={(e) => setVpwPct(Number(e.target.value))} min={1} max={10} step={0.25} style={{ width: '100%', padding: 8, marginTop: 4 }} />
              </label>
            )}

            {strategyName === 'guardrails' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Guard band (±%)
                  <input type="number" value={guardBand} onChange={(e) => setGuardBand(Number(e.target.value))} min={5} max={50} step={1} style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </label>
                <label style={{ display: 'block', marginBottom: 8 }}>
                  Adjust step (±%)
                  <input type="number" value={guardStep} onChange={(e) => setGuardStep(Number(e.target.value))} min={2} max={25} step={1} style={{ width: '100%', padding: 8, marginTop: 4 }} />
                </label>
              </div>
            )}

            <button onClick={run} disabled={loading} style={{ marginTop: 8, padding: '10px 14px' }}>
              {loading ? 'Running…' : 'Run simulation'}
            </button>

            {error && <div style={{ color: 'crimson', marginTop: 8 }}>{error}</div>}
          </div>

          {hist && (
            <div style={{ marginTop: 12, padding: 12, border: '1px solid #ddd', borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Summary</div>
              <div>Historical success rate: <strong>{hist.success_rate.toFixed(1)}%</strong></div>
              <div>Monte Carlo success rate: <strong>{mc?.success_rate?.toFixed(1)}%</strong></div>
              <div style={{ marginTop: 6, color: '#666' }}>Ending balance (median, historical): {currency(median(hist.ending_balances))}</div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {hist && <ProjectionChart data={toSeries(hist)} title="Historical (quantiles)" />}
          {mc && <ProjectionChart data={toSeries(mc)} title="Monte Carlo (quantiles)" />}
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


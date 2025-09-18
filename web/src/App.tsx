import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import ProjectionChart, { SeriesPoint } from "./components/ProjectionChart"
import CashFlowTable, { CashFlowRow } from "./components/CashFlowTable"
import Histogram from "./components/Histogram"
import Inputs, { StrategyName } from "./components/Inputs"
import Landing from "./components/Landing"
import Accordion from "./components/Accordion"
import { FaCircleCheck, FaCircleExclamation } from "react-icons/fa6"
import { fetchHistorical, fetchMonteCarlo, MarketCode, SimRequest, Strategy } from "./lib/api"
import { computeYearsToFI, fireTargetFromSpend } from "./lib/journey"

export default function App() {
  const [view, setView] = useState<"landing" | "results">("landing")
  const [market, setMarket] = useState<MarketCode>("us")
  const [initial, setInitial] = useState(1_000_000)
  const [spend, setSpend] = useState(40_000)
  const [years, setYears] = useState(30)
  const [strategyName, setStrategyName] = useState<StrategyName>("fixed")
  const [vpwPct, setVpwPct] = useState(4)
  const [guardBand, setGuardBand] = useState(20)
  const [guardStep, setGuardStep] = useState(10)
  const [startDelayYears, setStartDelayYears] = useState(0)
  const [annualContrib, setAnnualContrib] = useState(0)
  const [incomeAmount, setIncomeAmount] = useState(0)
  const [incomeStartYear, setIncomeStartYear] = useState(0)
  const [stillWorking, setStillWorking] = useState(true)
  const [expectedRealReturn, setExpectedRealReturn] = useState(5)
  const [otherIncomes, setOtherIncomes] = useState<{ amount: number; start_year: number }[]>([])
  const [expenses, setExpenses] = useState<{ amount: number; at_year_from_now: number }[]>([])
  const [nPaths, setNPaths] = useState(1000)
  const [blockSize, setBlockSize] = useState(12)
  const [inflationPct, setInflationPct] = useState(3)
  const [valueUnits, setValueUnits] = useState<"real" | "nominal">("real")
  const [currentAge, setCurrentAge] = useState<number>(0)

  const currencyCode = market === "india" ? "INR" : "USD"
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }),
    [currencyCode],
  )
  const formatCurrency = useCallback((n: number) => currencyFormatter.format(n), [currencyFormatter])
  const currencySymbol = currencyCode === "INR" ? "?" : "$"

  const strategy: Strategy = useMemo(() => {
    if (strategyName === "variable_percentage") return { type: "variable_percentage", percentage: vpwPct / 100 }
    if (strategyName === "guardrails") return { type: "guardrails", guard_band: guardBand / 100, adjust_step: guardStep / 100 }
    return { type: "fixed" }
  }, [strategyName, vpwPct, guardBand, guardStep])

  const req: SimRequest = useMemo(
    () => ({
      market,
      initial,
      spend,
      years,
      strategy,
      start_delay_years: startDelayYears,
      annual_contrib: annualContrib,
      income_amount: incomeAmount,
      income_start_year: incomeStartYear,
      other_incomes: otherIncomes,
      one_time_expenses: expenses,
    }),
    [market, initial, spend, years, strategy, startDelayYears, annualContrib, incomeAmount, incomeStartYear, otherIncomes, expenses],
  )

  const histQuery = useQuery({
    queryKey: ["historical", req],
    queryFn: () => fetchHistorical(req),
    enabled: view === "results",
  })
  const mcQuery = useQuery({
    queryKey: ["montecarlo", req, nPaths, blockSize],
    queryFn: () => fetchMonteCarlo({ ...req, n_paths: nPaths, block_size: blockSize }),
    enabled: view === "results",
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
      p50: res.quantiles.p50[i],
      p90: res.quantiles.p90[i],
      band: res.quantiles.p90[i] - res.quantiles.p10[i],
    }))

  const unitLabel = valueUnits === "real" ? `inflation-adjusted ${currencySymbol}` : `actual ${currencySymbol}`
  const toSeriesWithUnits = (res: any): SeriesPoint[] => {
    const base = toSeries(res)
    if (valueUnits === "real") return base
    const r = 1 + inflationPct / 100
    return base.map((p, idx) => {
      const tYears = (idx + 1) / 12
      const f = Math.pow(r, tYears)
      return { ...p, p10: p.p10 * f, p50: p.p50 * f, band: p.band * f }
    })
  }

  function toCashFlowRows(res: any): CashFlowRow[] {
    if (!res?.quantiles?.p50?.length) return []
    const months = res.quantiles.p50.length
    const yearsCount = Math.floor(months / 12)
    const rows: CashFlowRow[] = []
    const initialTotal = initial
    const vpct = vpwPct / 100
    const gBand = guardBand / 100
    const gStep = guardStep / 100
    const initialWR = initialTotal > 0 ? spend / initialTotal : 0
    let guardSpend = spend
    for (let y = 0; y < yearsCount; y++) {
      const prevIdx = y * 12 - 1
      const startMedian = y === 0 ? initialTotal : Number(res.quantiles.p50[prevIdx] ?? 0)
      const startP10 = y === 0 ? initialTotal : Number(res.quantiles.p10[prevIdx] ?? 0)
      let basic = 0
      if (y < startDelayYears) {
        basic = Math.max(annualContrib, 0)
      } else {
        if (strategyName === "variable_percentage") {
          basic = Math.max(0, startMedian * vpct)
        } else if (strategyName === "guardrails") {
          const wr = startMedian > 0 ? guardSpend / startMedian : 0
          const low = initialWR * (1 - gBand)
          const high = initialWR * (1 + gBand)
          if (wr < low) guardSpend = Math.min(guardSpend * (1 + gStep), guardSpend + guardSpend * gStep)
          if (wr > high) guardSpend = Math.max(guardSpend * (1 - gStep), guardSpend - guardSpend * gStep)
          basic = guardSpend
        } else {
          basic = spend
        }
      }
      const otherSpending = expenses
        .filter((item) => item.at_year_from_now === y)
        .reduce((acc, item) => acc + item.amount, 0)
      const otherIncome = otherIncomes
        .filter((item) => item.start_year === y)
        .reduce((acc, item) => acc + item.amount, 0)
      const recurringIncome = y >= incomeStartYear ? incomeAmount : 0
      const netIncome = recurringIncome + otherIncome
      const cashFlow = basic + otherSpending - netIncome
      const age = currentAge > 0 ? currentAge + y : undefined
      rows.push({ year: baseYear + y, age, startMedian, startP10, basic, otherSpending, otherIncome: netIncome, cashFlow } as CashFlowRow)
    }
    return rows
  }

  const fireTarget = fireTargetFromSpend(spend, 0.04)
  const estimatedYearsToFI = computeYearsToFI({ balance: initial, target: fireTarget, annualContrib, realReturnPct: expectedRealReturn })
  useEffect(() => {
    if (stillWorking) setStartDelayYears(estimatedYearsToFI)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, spend, annualContrib, expectedRealReturn, stillWorking])

  function applyPreset(name: "lean" | "baseline" | "fat") {
    if (name === "lean") {
      setInitial(500_000)
      setSpend(25_000)
      setYears(30)
      setStillWorking(true)
      setAnnualContrib(15_000)
      setExpectedRealReturn(5)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
    } else if (name === "baseline") {
      setInitial(1_000_000)
      setSpend(40_000)
      setYears(30)
      setStillWorking(true)
      setAnnualContrib(20_000)
      setExpectedRealReturn(5)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
    } else {
      setInitial(2_000_000)
      setSpend(100_000)
      setYears(35)
      setStillWorking(false)
      setAnnualContrib(0)
      setExpectedRealReturn(4)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
    }
  }

  function buildShareURL() {
    const url = new URL(window.location.href)
    const p = new URLSearchParams()
    p.set("m", market)
    p.set("i", String(initial))
    p.set("s", String(spend))
    p.set("y", String(years))
    p.set("sw", stillWorking ? "1" : "0")
    p.set("ac", String(annualContrib))
    p.set("er", String(expectedRealReturn))
    p.set("sd", String(startDelayYears))
    p.set("ia", String(incomeAmount))
    p.set("isy", String(incomeStartYear))
    p.set("st", strategyName)
    p.set("inf", String(inflationPct))
    p.set("vu", valueUnits)
    if (currentAge) p.set("age", String(currentAge))
    if (strategyName === "variable_percentage") p.set("vp", String(vpwPct))
    if (strategyName === "guardrails") {
      p.set("gb", String(guardBand))
      p.set("gs", String(guardStep))
    }
    p.set("np", String(nPaths))
    p.set("bs", String(blockSize))
    const extras = { otherIncomes, expenses }
    try {
      p.set("x", encodeURIComponent(JSON.stringify(extras)))
    } catch {
      // ignore
    }
    url.search = p.toString()
    return url.toString()
  }

  async function copyShareLink() {
    const link = buildShareURL()
    try {
      await navigator.clipboard.writeText(link)
    } catch {
      // clipboard may be blocked
    }
    window.history.replaceState(null, "", link)
    alert("Shareable link copied to clipboard")
  }

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search)
    if (!sp.size) return
    const num = (k: string, d: number) => {
      const v = Number(sp.get(k))
      return Number.isNaN(v) ? d : v
    }
    const str = (k: string, d: string) => sp.get(k) ?? d
    const has = (k: string) => sp.has(k)
    const m = str("m", "us") as MarketCode
    setMarket(m === "india" ? "india" : "us")
    setInitial(num("i", 1_000_000))
    setSpend(num("s", 40_000))
    setYears(num("y", 30))
    setStillWorking(str("sw", "1") === "1")
    setAnnualContrib(num("ac", 0))
    setExpectedRealReturn(num("er", 5))
    setStartDelayYears(num("sd", 0))
    setIncomeAmount(num("ia", 0))
    setIncomeStartYear(num("isy", 0))
    const st = str("st", "fixed") as StrategyName
    setStrategyName(st)
    if (st === "variable_percentage" && has("vp")) setVpwPct(num("vp", 4))
    if (st === "guardrails") {
      setGuardBand(num("gb", 20))
      setGuardStep(num("gs", 10))
    }
    setNPaths(num("np", 1000))
    setBlockSize(num("bs", 12))
    setInflationPct(num("inf", 3))
    const vu = str("vu", "real")
    setValueUnits(vu === "nominal" ? "nominal" : "real")
    const age = num("age", 0)
    if (age) setCurrentAge(age)
    const x = sp.get("x")
    if (x) {
      try {
        const obj = JSON.parse(decodeURIComponent(x))
        if (obj.otherIncomes) setOtherIncomes(obj.otherIncomes)
        if (obj.expenses) setExpenses(obj.expenses)
      } catch {
        // ignore malformed extras
      }
    }
    setView("results")
  }, [])

  if (view === "landing") {
    return (
      <Landing
        market={market}
        onMarketChange={setMarket}
        currencyCode={currencyCode}
        initial={initial}
        onInitial={setInitial}
        spend={spend}
        onSpend={setSpend}
        years={years}
        onYears={setYears}
        strategy={strategyName}
        onStrategy={setStrategyName}
        vpwPct={vpwPct}
        onVpwPct={setVpwPct}
        guardBand={guardBand}
        onGuardBand={setGuardBand}
        guardStep={guardStep}
        onGuardStep={setGuardStep}
        startDelayYears={startDelayYears}
        onStartDelay={setStartDelayYears}
        annualContrib={annualContrib}
        onAnnualContrib={setAnnualContrib}
        incomeAmount={incomeAmount}
        onIncomeAmount={setIncomeAmount}
        incomeStartYear={incomeStartYear}
        onIncomeStartYear={setIncomeStartYear}
        stillWorking={stillWorking}
        onStillWorking={setStillWorking}
        expectedRealReturn={expectedRealReturn}
        onExpectedRealReturn={setExpectedRealReturn}
        currentAge={currentAge}
        onCurrentAge={setCurrentAge}
        inflationPct={inflationPct}
        onInflationPct={setInflationPct}
        otherIncomes={otherIncomes}
        onOtherIncomesChange={setOtherIncomes}
        expenses={expenses}
        onExpensesChange={setExpenses}
        onSimulate={() => setView("results")}
        running={loading}
        onApplyPreset={applyPreset}
      />
    )
  }

  return (
    <div className="container results">
      <div className="layout">
        <aside>
          <Inputs
            market={market}
            onMarketChange={setMarket}
            currencyCode={currencyCode}
            initial={initial}
            onInitial={setInitial}
            spend={spend}
            onSpend={setSpend}
            years={years}
            onYears={setYears}
            strategy={strategyName}
            onStrategy={setStrategyName}
            vpwPct={vpwPct}
            onVpwPct={setVpwPct}
            guardBand={guardBand}
            onGuardBand={setGuardBand}
            guardStep={guardStep}
            onGuardStep={setGuardStep}
            startDelayYears={startDelayYears}
            onStartDelay={setStartDelayYears}
            annualContrib={annualContrib}
            onAnnualContrib={setAnnualContrib}
            incomeAmount={incomeAmount}
            onIncomeAmount={setIncomeAmount}
            incomeStartYear={incomeStartYear}
            onIncomeStartYear={setIncomeStartYear}
            stillWorking={stillWorking}
            onStillWorking={setStillWorking}
            expectedRealReturn={expectedRealReturn}
            onExpectedRealReturn={setExpectedRealReturn}
            currentAge={currentAge}
            onCurrentAge={setCurrentAge}
            inflationPct={inflationPct}
            onInflationPct={setInflationPct}
            otherIncomes={otherIncomes}
            onOtherIncomesChange={setOtherIncomes}
            expenses={expenses}
            onExpensesChange={setExpenses}
            onRun={() => {
              histQuery.refetch()
              mcQuery.refetch()
            }}
            running={loading}
            onApplyPreset={applyPreset}
          />
        </aside>
        <main>
          {error && (
            <div className="panel panel-error">Error: {(error as any)?.message || String(error)}</div>
          )}

          <div className="panel highlights">
            <div className="highlights__row">
              <div className="badge">FIRE target (25×): {formatCurrency(fireTarget)}</div>
              {stillWorking && (
                <div className="badge badge-info">Estimated FI year: {baseYear + estimatedYearsToFI}</div>
              )}
              {hist && (
                <div className="badge badge-success">Historical success: {hist.success_rate.toFixed(1)}%</div>
              )}
              {mc && (
                <div className="badge badge-success">Monte Carlo success: {mc.success_rate.toFixed(1)}%</div>
              )}
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={copyShareLink}>
                Save & share
              </button>
            </div>
            <div className="highlights__meta">
              Market data refreshes automatically. Currently using {market === "india" ? "NIFTY 50 + India CPI" : "Ken French CRSP + US CPI"}.
            </div>
          </div>

          <div className="panel">
            <div className="hstack" style={{ gap: 12, flexWrap: "wrap" }}>
              <div className="label" style={{ marginBottom: 0 }}>Display units</div>
              <div className="segmented">
                <button type="button" className={valueUnits === "real" ? "active" : ""} onClick={() => setValueUnits("real")}>
                  Inflation-adjusted
                </button>
                <button type="button" className={valueUnits === "nominal" ? "active" : ""} onClick={() => setValueUnits("nominal")}>
                  Actual values
                </button>
              </div>
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
              <div className="callout">
                <div className="hstack" style={{ gap: 8 }}>
                  <FaCircleCheck color="#16a34a" />
                  <strong>You&apos;re FI-ready based on history.</strong> Success rate is at least 80%. Explore the range below.
                </div>
              </div>
              <ProjectionChart data={toSeriesWithUnits(hist)} title={`Historical projection (${unitLabel})`} retireAtMonths={startDelayYears * 12} currencyCode={currencyCode} />
              <CashFlowTable rows={toCashFlowRows(hist)} title={`Detailed cashflow table (${unitLabel})`} currencyCode={currencyCode} />
              <ProjectionChart data={toSeriesWithUnits(mc)} title={`Monte Carlo projection (${unitLabel})`} retireAtMonths={startDelayYears * 12} currencyCode={currencyCode} />
              <Histogram
                values={valueUnits === "nominal" ? hist.ending_balances.map((v) => v * Math.pow(1 + inflationPct / 100, years)) : hist.ending_balances}
                title={`Historical ending balances (${unitLabel})`}
                currencyCode={currencyCode}
              />
            </>
          )}

          {hist && hist.success_rate < 80 && (
            <div className="callout-warn">
              <div className="hstack" style={{ gap: 8 }}>
                <FaCircleExclamation color="#b45309" />
                <strong>Not quite there yet.</strong> Success is below 80%. Adjust spending, save more, or delay retirement and rerun.
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

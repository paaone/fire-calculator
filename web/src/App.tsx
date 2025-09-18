import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import ProjectionChart, { SeriesPoint, ChartMilestone } from "./components/ProjectionChart"
import CashFlowTable, { CashFlowRow } from "./components/CashFlowTable"
import Histogram from "./components/Histogram"
import Inputs, { StrategyName } from "./components/Inputs"
import Landing from "./components/Landing"
import Accordion from "./components/Accordion"
import { FaCircleCheck, FaCircleExclamation } from "react-icons/fa6"
import { ThemeToggle } from "./theme/ThemeToggle"
import {
  fetchMarkets,
  fetchHistorical,
  fetchMonteCarlo,
  MarketCatalog,
  MarketMetadata,
  MarketCode,
  SimRequest,
  Strategy,
} from "./lib/api"
import { computeYearsToFI, fireTargetFromSpend } from "./lib/journey"

import {
  SpendingCategoryPlan,
  FutureExpensePlan,
  FutureIncomePlan,
  defaultSpendingCategories,
  expandFutureExpenses,
  expandFutureIncomes,
  totalSpendingFromCategories,
  scaleSpendingCategories,
  createId,
} from "./lib/planning"

const DEFAULT_MARKET: MarketCode = "us"

const EXPENSE_EMOJI: Record<FutureExpensePlan["category"], string> = {
  home_project: "🏠",
  vehicle: "🚗",
  education: "🎓",
  healthcare: "🩺",
  travel: "✈️",
  wedding: "💍",
  other: "⭐",
}

const EXPENSE_LABEL_FALLBACK: Record<FutureExpensePlan["category"], string> = {
  home_project: "Home milestone",
  vehicle: "Vehicle purchase",
  education: "Education milestone",
  healthcare: "Healthcare milestone",
  travel: "Travel splurge",
  wedding: "Celebration",
  other: "Future expense",
}

function expenseEmoji(category: FutureExpensePlan["category"]): string {
  return EXPENSE_EMOJI[category] ?? "⭐"
}

function expenseLabel(category: FutureExpensePlan["category"], label?: string): string {
  const trimmed = label?.trim()
  if (trimmed) return trimmed
  return EXPENSE_LABEL_FALLBACK[category] ?? "Future expense"
}

type ViewMode = "landing" | "results"

export default function App() {
  const [view, setView] = useState<ViewMode>("landing")
  const [market, setMarket] = useState<MarketCode>(DEFAULT_MARKET)
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
  const [spendingCategories, setSpendingCategories] = useState<SpendingCategoryPlan[]>(() =>
    defaultSpendingCategories(40_000),
  )
  const [futureExpenses, setFutureExpenses] = useState<FutureExpensePlan[]>([])
  const [futureIncomes, setFutureIncomes] = useState<FutureIncomePlan[]>([])
  const [nPaths, setNPaths] = useState(1000)
  const [blockSize, setBlockSize] = useState(12)
  const [inflationPct, setInflationPct] = useState(3)
  const [valueUnits, setValueUnits] = useState<"real" | "nominal">("real")
  const [currentAge, setCurrentAge] = useState(0)

  const [hydratedFromURL, setHydratedFromURL] = useState(false)
  const [applyDefaultsPending, setApplyDefaultsPending] = useState(false)

  const handleSpendChange = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0
    setSpend(safe)
    setSpendingCategories((prev) => scaleSpendingCategories(prev, safe))
  }, [])

  const handleSpendingCategoriesChange = useCallback((rows: SpendingCategoryPlan[]) => {
    setSpendingCategories(rows)
    setSpend(totalSpendingFromCategories(rows))
  }, [])


  const marketsQuery = useQuery<MarketCatalog>({
    queryKey: ["markets"],
    queryFn: fetchMarkets,
  })

  const marketMetadataList = useMemo(() => marketsQuery.data?.markets ?? [], [marketsQuery.data])

  const marketMeta = useMemo<MarketMetadata | undefined>(() => {
    return marketMetadataList.find((m) => m.key === market) ?? marketMetadataList[0]
  }, [marketMetadataList, market])

  const currencyCode = marketMeta?.currency ?? "USD"
  const locale = currencyCode === "INR" ? "en-IN" : undefined
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale ?? undefined, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    [currencyCode, locale],
  )
  const currencySymbol = useMemo(() => {
    try {
      const parts = currencyFormatter.formatToParts(1)
      return parts.find((part) => part.type === "currency")?.value ?? currencyCode
    } catch {
      return currencyCode
    }
  }, [currencyFormatter, currencyCode])
  const formatCurrency = useCallback((amount: number) => currencyFormatter.format(amount), [currencyFormatter])
  const unitLabel = valueUnits === "real" ? `inflation-adjusted ${currencySymbol}` : `actual ${currencySymbol}`

  const derivedExpenses = useMemo(() => expandFutureExpenses(futureExpenses), [futureExpenses])
  const derivedOtherIncomes = useMemo(() => expandFutureIncomes(futureIncomes), [futureIncomes])
  const normalizedExpenses = useMemo(
    () =>
      derivedExpenses.filter((item) => Number.isFinite(item.amount) && Math.abs(item.amount) > 0.01),
    [derivedExpenses],
  )
  const normalizedOtherIncomes = useMemo(
    () =>
      derivedOtherIncomes.filter((item) => Number.isFinite(item.amount) && Math.abs(item.amount) > 0.01),
    [derivedOtherIncomes],
  )

  const strategy: Strategy = useMemo(() => {

    if (strategyName === "variable_percentage") return { type: "variable_percentage", percentage: vpwPct / 100 }
    if (strategyName === "guardrails") return { type: "guardrails", guard_band: guardBand / 100, adjust_step: guardStep / 100 }
    return { type: "fixed" }
  }, [strategyName, vpwPct, guardBand, guardStep])

  const requestPayload: SimRequest = useMemo(
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
      other_incomes: normalizedOtherIncomes,
      one_time_expenses: normalizedExpenses,
    }),
    [
      market,
      initial,
      spend,
      years,
      strategy,
      startDelayYears,
      annualContrib,
      incomeAmount,
      incomeStartYear,
      normalizedOtherIncomes,
      normalizedExpenses,
    ],
  )

  const histQuery = useQuery({
    queryKey: ["historical", requestPayload],
    queryFn: () => fetchHistorical(requestPayload),
    enabled: view === "results",
  })

  const mcQuery = useQuery({
    queryKey: ["montecarlo", requestPayload, nPaths, blockSize],
    queryFn: () => fetchMonteCarlo({ ...requestPayload, n_paths: nPaths, block_size: blockSize }),
    enabled: view === "results",
  })

  const loading = histQuery.isLoading || mcQuery.isLoading
  const errorMessage = histQuery.error || mcQuery.error ? String(histQuery.error ?? mcQuery.error) : ""
  const hist = histQuery.data
  const mc = mcQuery.data

  const applyDefaultsFromMeta = useCallback(
    (meta: MarketMetadata) => {
      const d = meta.defaults
      setInitial(d.initial)
      setSpendingCategories(defaultSpendingCategories(d.spend))
      setSpend(d.spend)
      setYears(d.years)
      setInflationPct(d.inflation_pct)
      setExpectedRealReturn(d.expected_real_return_pct)
      setStillWorking(d.still_working)
      setAnnualContrib(d.annual_contrib)
      setIncomeAmount(d.income_amount)
      setIncomeStartYear(d.income_start_year)
      setStartDelayYears(d.start_delay_years)
      setNPaths(d.n_paths)
      setBlockSize(d.block_size)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    },
    [],
  )

  useEffect(() => {
    if (!marketMetadataList.length || hydratedFromURL) return

    const search = window.location.search
    const params = new URLSearchParams(search)

    const chooseMarket = (value: string | null): MarketMetadata | undefined => {
      if (!value) return marketMetadataList[0]
      return marketMetadataList.find((m) => m.key === value) ?? marketMetadataList[0]
    }

    if (!params.size) {
      const meta = chooseMarket(market)
      if (meta) {
        setMarket(meta.key)
        applyDefaultsFromMeta(meta)
      }
      setHydratedFromURL(true)
      setView("landing")
      return
    }

    const num = (key: string, fallback: number) => {
      const value = Number(params.get(key))
      return Number.isNaN(value) ? fallback : value
    }
    const str = (key: string, fallback: string) => params.get(key) ?? fallback
    const has = (key: string) => params.has(key)

    const meta = chooseMarket(str("m", DEFAULT_MARKET))
    if (meta) {
      setMarket(meta.key)
    }

    setInitial(num("i", initial))
    const nextSpend = num("s", spend)
    setYears(num("y", years))
    setStillWorking(str("sw", "1") === "1")
    setAnnualContrib(num("ac", annualContrib))
    setExpectedRealReturn(num("er", expectedRealReturn))
    setStartDelayYears(num("sd", startDelayYears))
    setIncomeAmount(num("ia", incomeAmount))
    setIncomeStartYear(num("isy", incomeStartYear))

    const st = str("st", strategyName) as StrategyName
    setStrategyName(st)
    if (st === "variable_percentage" && has("vp")) setVpwPct(num("vp", vpwPct))
    if (st === "guardrails") {
      setGuardBand(num("gb", guardBand))
      setGuardStep(num("gs", guardStep))
    }

    setNPaths(num("np", nPaths))
    setBlockSize(num("bs", blockSize))
    setInflationPct(num("inf", inflationPct))
    setValueUnits((str("vu", valueUnits) as "real" | "nominal") ?? "real")
    const age = num("age", currentAge)
    if (age) setCurrentAge(age)

    let parsedExtras: any = undefined
    const extras = params.get("x")
    if (extras) {
      try {
        parsedExtras = JSON.parse(decodeURIComponent(extras))
      } catch {
        // ignore malformed extras
      }
    }

    if (parsedExtras?.spendingCategories?.length) {
      setSpendingCategories(parsedExtras.spendingCategories)
      setSpend(totalSpendingFromCategories(parsedExtras.spendingCategories))
    } else {
      handleSpendChange(nextSpend)
    }

    if (parsedExtras?.futureExpenses?.length) {
      setFutureExpenses(parsedExtras.futureExpenses)
    } else if (parsedExtras?.expenses?.length) {
      setFutureExpenses(
        parsedExtras.expenses.map((item: any, index: number) => ({
          id: `${createId()}-${index}`,
          label: item.label ?? `Goal ${index + 1}`,
          amount: Number(item.amount ?? 0),
          startYear: Number(item.at_year_from_now ?? 0),
          years: 1,
          inflation: 2.5,
          category: "other" as const,
          frequency: "one_time" as const,
        })),
      )
    } else {
      setFutureExpenses([])
    }

    if (parsedExtras?.futureIncomes?.length) {
      setFutureIncomes(parsedExtras.futureIncomes)
    } else if (parsedExtras?.otherIncomes?.length) {
      setFutureIncomes(
        parsedExtras.otherIncomes.map((item: any, index: number) => ({
          id: `${createId()}-${index}`,
          label: item.label ?? `Income ${index + 1}`,
          amount: Number(item.amount ?? 0),
          startYear: Number(item.start_year ?? 0),
          years: 1,
          inflation: 2.5,
          category: "other" as const,
          frequency: "one_time" as const,
        })),
      )
    } else {
      setFutureIncomes([])
    }

    setHydratedFromURL(true)
    setView("results")
  }, [
    marketMetadataList,
    hydratedFromURL,
    applyDefaultsFromMeta,
    initial,
    spend,
    years,
    strategyName,
    vpwPct,
    guardBand,
    guardStep,
    startDelayYears,
    annualContrib,
    incomeAmount,
    incomeStartYear,
    nPaths,
    blockSize,
    inflationPct,
    currentAge,
    valueUnits,
    handleSpendChange,
  ])

  useEffect(() => {
    if (!applyDefaultsPending || !marketMeta) return
    applyDefaultsFromMeta(marketMeta)
    setApplyDefaultsPending(false)
  }, [applyDefaultsPending, marketMeta, applyDefaultsFromMeta])

  const handleMarketChange = (next: MarketCode) => {
    setMarket(next)
    setApplyDefaultsPending(true)
    setView((prev) => (prev === "results" ? prev : "landing"))
  }

  const baseYear = new Date().getFullYear()

  const chartMilestones = useMemo<ChartMilestone[]>(() => {
    const map = new Map<number, ChartMilestone>()

    const addMilestone = (year: number, emoji: string, label: string, drawLine = false) => {
      const trimmedLabel = label.trim()
      const existing = map.get(year)
      if (existing) {
        existing.emoji = `${existing.emoji} ${emoji}`.trim()
        existing.label = trimmedLabel ? (existing.label ? `${existing.label} | ${trimmedLabel}` : trimmedLabel) : existing.label
        existing.drawLine = existing.drawLine || drawLine
      } else {
        map.set(year, { year, emoji, label: trimmedLabel, drawLine })
      }
    }

    if (stillWorking && startDelayYears > 0) {
      addMilestone(baseYear + startDelayYears, "🌴", "Retirement", true)
    }

    futureExpenses
      .filter((expense) => Number.isFinite(expense.amount) && Math.abs(expense.amount) > 0.01)
      .forEach((expense) => {
        const year = baseYear + Math.max(0, Math.round(expense.startYear))
        const emoji = expenseEmoji(expense.category)
        const label = expenseLabel(expense.category, expense.label)
        addMilestone(year, emoji, label, false)
      })

    return Array.from(map.values()).sort((a, b) => a.year - b.year)
  }, [stillWorking, startDelayYears, futureExpenses, baseYear])

  const toSeries = useCallback(
    (res: any): SeriesPoint[] =>
      (res?.quantiles?.p90 || []).map((_: number, index: number) => ({
        month: index + 1,
        year: baseYear + Math.floor(index / 12),
        p10: res.quantiles.p10[index],
        p50: res.quantiles.p50[index],
        p90: res.quantiles.p90[index],
        band: res.quantiles.p90[index] - res.quantiles.p10[index],
      })),
    [baseYear],
  )

  const toSeriesWithUnits = useCallback(
    (res: any): SeriesPoint[] => {
      const series = toSeries(res)
      if (valueUnits === "real") return series
      const rate = 1 + inflationPct / 100
      return series.map((point, index) => {
        const yearsElapsed = (index + 1) / 12
        const factor = Math.pow(rate, yearsElapsed)
        return {
          ...point,
          p10: point.p10 * factor,
          p50: point.p50 * factor,
          band: point.band * factor,
        }
      })
    },
    [toSeries, valueUnits, inflationPct],
  )

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

      const otherSpending = normalizedExpenses
        .filter((item) => item.at_year_from_now === y)
        .reduce((acc, item) => acc + item.amount, 0)
      const otherIncome = normalizedOtherIncomes
        .filter((item) => item.start_year === y)
        .reduce((acc, item) => acc + item.amount, 0)
      const recurringIncome = y >= incomeStartYear ? incomeAmount : 0
      const netIncome = recurringIncome + otherIncome
      const cashFlow = basic + otherSpending - netIncome
      const age = currentAge > 0 ? currentAge + y : undefined

      rows.push({
        year: baseYear + y,
        age,
        startMedian,
        startP10,
        basic,
        otherSpending,
        otherIncome: netIncome,
        cashFlow,
      })
    }

    return rows
  }

  const applyPreset = useCallback((name: "lean" | "baseline" | "fat") => {
    if (name === "lean") {
      const total = 25_000
      setInitial(500_000)
      setSpendingCategories(defaultSpendingCategories(total))
      setSpend(total)
      setYears(30)
      setStillWorking(true)
      setAnnualContrib(15_000)
      setExpectedRealReturn(5)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
      setStartDelayYears(0)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    } else if (name === "baseline") {
      const total = 40_000
      setInitial(1_000_000)
      setSpendingCategories(defaultSpendingCategories(total))
      setSpend(total)
      setYears(30)
      setStillWorking(true)
      setAnnualContrib(20_000)
      setExpectedRealReturn(5)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
      setStartDelayYears(0)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    } else {
      const total = 100_000
      setInitial(2_000_000)
      setSpendingCategories(defaultSpendingCategories(total))
      setSpend(total)
      setYears(35)
      setStillWorking(false)
      setAnnualContrib(0)
      setExpectedRealReturn(4)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
      setStartDelayYears(0)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    }
  }, [])

  const fireTarget = fireTargetFromSpend(spend, 0.04)
  const estimatedYearsToFI = computeYearsToFI({
    balance: initial,
    target: fireTarget,
    annualContrib,
    realReturnPct: expectedRealReturn,
  })

  useEffect(() => {
    if (stillWorking) {
      setStartDelayYears(estimatedYearsToFI)
    }
  }, [stillWorking, estimatedYearsToFI])

  const buildShareURL = () => {
    const url = new URL(window.location.href)
    const params = new URLSearchParams()
    params.set("m", market)
    params.set("i", String(initial))
    params.set("s", String(spend))
    params.set("y", String(years))
    params.set("sw", stillWorking ? "1" : "0")
    params.set("ac", String(annualContrib))
    params.set("er", String(expectedRealReturn))
    params.set("sd", String(startDelayYears))
    params.set("ia", String(incomeAmount))
    params.set("isy", String(incomeStartYear))
    params.set("st", strategyName)
    params.set("inf", String(inflationPct))
    params.set("vu", valueUnits)
    if (currentAge) params.set("age", String(currentAge))
    if (strategyName === "variable_percentage") params.set("vp", String(vpwPct))
    if (strategyName === "guardrails") {
      params.set("gb", String(guardBand))
      params.set("gs", String(guardStep))
    }
    params.set("np", String(nPaths))
    params.set("bs", String(blockSize))
    const extras = {
      spendingCategories,
      futureIncomes,
      futureExpenses,
    }
    try {
      params.set("x", encodeURIComponent(JSON.stringify(extras)))
    } catch {
      // ignore serialization errors
    }
    url.search = params.toString()
    return url.toString()
  }

  const copyShareLink = async () => {
    const shareURL = buildShareURL()
    try {
      await navigator.clipboard.writeText(shareURL)
    } catch {
      // ignore clipboard failures (browser restrictions)
    }
    window.history.replaceState(null, "", shareURL)
    alert("Shareable link copied to clipboard")
  }

  const marketsLoaded = Boolean(marketMeta)
  const marketOptions = marketMetadataList.map((m) => ({ key: m.key as MarketCode, label: m.label }))

  if (!marketsLoaded) {
    return (
      <div className="container" style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="panel" style={{ maxWidth: 360 }}>
          <h3 className="title">Loading markets</h3>
          <p className="help">Fetching market metadata and defaults...</p>
        </div>
      </div>
    )
  }

  if (view === "landing") {
    return (
      <Landing
        market={market}
        markets={marketOptions}
        onMarketChange={handleMarketChange}
        currencyCode={currencyCode}
        initial={initial}
        onInitial={setInitial}
        spend={spend}
        onSpend={handleSpendChange}
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
        spendingCategories={spendingCategories}
        onSpendingCategoriesChange={handleSpendingCategoriesChange}
        futureExpenses={futureExpenses}
        onFutureExpensesChange={setFutureExpenses}
        futureIncomes={futureIncomes}
        onFutureIncomesChange={setFutureIncomes}
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
            markets={marketOptions}
            onMarketChange={handleMarketChange}
            currencyCode={currencyCode}
            initial={initial}
            onInitial={setInitial}
            spend={spend}
            onSpend={handleSpendChange}
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
            spendingCategories={spendingCategories}
            onSpendingCategoriesChange={handleSpendingCategoriesChange}
            futureExpenses={futureExpenses}
            onFutureExpensesChange={setFutureExpenses}
            futureIncomes={futureIncomes}
            onFutureIncomesChange={setFutureIncomes}
            onRun={() => {
              histQuery.refetch()
              mcQuery.refetch()
            }}
            running={loading}
            onApplyPreset={applyPreset}
          />
        </aside>
        <main>
          {errorMessage && <div className="panel panel-error">{errorMessage}</div>}

          <div className="panel highlights">
            <div className="highlights__row">
              <div className="badge">FIRE target (25x): {formatCurrency(fireTarget)}</div>
              {stillWorking && <div className="badge badge-info">Estimated FI year: {baseYear + estimatedYearsToFI}</div>}
              {hist && <div className="badge badge-success">Historical success: {hist.success_rate.toFixed(1)}%</div>}
              {mc && <div className="badge badge-success">Monte Carlo success: {mc.success_rate.toFixed(1)}%</div>}
              <ThemeToggle />
              <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={copyShareLink}>
                Save & share
              </button>
            </div>
            <div className="highlights__meta">
              Market data refreshes automatically. Source: {marketMeta?.source}. Coverage {marketMeta?.coverage.start} -
              {" "}
              {marketMeta?.coverage.end} ({marketMeta?.coverage.months} months).
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
                <span className="label">Simulated paths</span>
                <input className="input" type="number" min={100} max={10000} step={100} value={nPaths} onChange={(e) => setNPaths(Number(e.target.value))} />
              </div>
              <div>
                <span className="label">Block size (months)</span>
                <input className="input" type="number" min={1} max={60} step={1} value={blockSize} onChange={(e) => setBlockSize(Number(e.target.value))} />
              </div>
            </div>
          </Accordion>

          {hist && hist.success_rate >= 80 && (
            <>
              <div className="callout">
                <div className="hstack" style={{ gap: 8 }}>
                  <FaCircleCheck color="#16a34a" />
                  <strong>You're FI-ready based on history.</strong> Success rate is at least 80%. Explore the range below.
                </div>
              </div>
              <ProjectionChart data={toSeriesWithUnits(hist)} title={`Historical projection (${unitLabel})`} currencyCode={currencyCode} milestones={chartMilestones} />
              <CashFlowTable rows={toCashFlowRows(hist)} title={`Detailed cashflow table (${unitLabel})`} currencyCode={currencyCode} />
              <ProjectionChart data={toSeriesWithUnits(mc)} title={`Monte Carlo projection (${unitLabel})`} currencyCode={currencyCode} milestones={chartMilestones} />
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

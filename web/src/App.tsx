import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import ProjectionChart, { SeriesPoint, ChartMilestone, ChartPhase } from "./components/ProjectionChart"
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

const STAR_EMOJI = String.fromCodePoint(0x2B50)
const RETIREMENT_EMOJI = String.fromCodePoint(0x1F334)

const EXPENSE_EMOJI: Record<FutureExpensePlan["category"], string> = {
  home_project: String.fromCodePoint(0x1F3E0),
  vehicle: String.fromCodePoint(0x1F697),
  education: String.fromCodePoint(0x1F393),
  healthcare: String.fromCodePoint(0x2695, 0xFE0F),
  travel: String.fromCodePoint(0x2708, 0xFE0F),
  wedding: String.fromCodePoint(0x1F48D),
  other: STAR_EMOJI,
}

const EXPENSE_LABEL_FALLBACK: Record<FutureExpensePlan["category"], string> = {
  home_project: "Home Buying / Renovation",
  vehicle: "Vehicle Purchase / Lease",
  education: "Education",
  healthcare: "Healthcare",
  travel: "Travel Splurge",
  wedding: "Wedding / Celebration",
  other: "Custom Goal",
}

function expenseEmoji(category: FutureExpensePlan["category"]): string {
  return EXPENSE_EMOJI[category] ?? STAR_EMOJI
}

function expenseLabel(category: FutureExpensePlan["category"], label?: string): string {
  const trimmed = label?.trim()
  if (trimmed) return trimmed
  return EXPENSE_LABEL_FALLBACK[category] ?? "Future expense"
}

interface HistoricalAnalysis {
  successRate: number
  bestCase: number
  worstCase: number
  zeroYear: number | null
  yearsToZero: number | null
}

function analyzeHistoricalResults(hist: any, years: number, currencyCode: string, valueUnits: "real" | "nominal", inflationPct: number): HistoricalAnalysis {
  if (!hist || !hist.ending_balances || !hist.sample_path) {
    return {
      successRate: 0,
      bestCase: 0,
      worstCase: 0,
      zeroYear: null,
      yearsToZero: null
    }
  }

  // Apply the same transformation as the histogram for consistency
  const adjustedBalances = valueUnits === "nominal" 
    ? hist.ending_balances.map((v: number) => v * Math.pow(1 + inflationPct / 100, years))
    : hist.ending_balances

  const bestCase = Math.max(...adjustedBalances)
  const worstCase = Math.min(...adjustedBalances)
  
  // Check if portfolio goes to zero in the sample path
  let zeroYear: number | null = null
  let yearsToZero: number | null = null
  
  if (hist.sample_path && hist.sample_path.length > 0) {
    const monthsInPath = hist.sample_path.length
    for (let i = 0; i < monthsInPath; i++) {
      if (hist.sample_path[i] <= 0) {
        zeroYear = Math.floor(i / 12) + 1 // Convert months to years (1-indexed)
        yearsToZero = years - zeroYear + 1 // Years remaining after hitting zero
        break
      }
    }
  }

  return {
    successRate: hist.success_rate,
    bestCase,
    worstCase,
    zeroYear,
    yearsToZero
  }
}

function formatCurrencyCompact(amount: number, currencyCode: string): string {
  const symbol = currencyCode === 'INR' ? '₹' : '$'
  
  if (currencyCode === 'INR') {
    // For Indian market, use Crore (10 million) and Lakh (100 thousand) system
    if (amount >= 10000000) { // 1 crore+
      return `${symbol}${(amount / 10000000).toFixed(1)} Cr`
    } else if (amount >= 100000) { // 1 lakh+
      return `${symbol}${(amount / 100000).toFixed(1)} L`
    } else if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(0)}K`
    } else {
      return `${symbol}${amount.toFixed(0)}`
    }
  } else {
    // For other currencies (USD), use Million system
    if (amount >= 10000000) { // 10 million+
      return `${symbol}${(amount / 1000000).toFixed(1)}M`
    } else if (amount >= 1000000) { // 1 million+
      return `${symbol}${(amount / 1000000).toFixed(2)}M`
    } else if (amount >= 1000) {
      return `${symbol}${(amount / 1000).toFixed(0)}K`
    } else {
      return `${symbol}${amount.toFixed(0)}`
    }
  }
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
  const [incomeDurationYears, setIncomeDurationYears] = useState(0)
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
  const [currentAge, setCurrentAge] = useState(35)

  const [hydratedFromURL, setHydratedFromURL] = useState(false)
  const [applyDefaultsPending, setApplyDefaultsPending] = useState(false)
  const [activePreset, setActivePreset] = useState<'lean' | 'baseline' | 'fat' | null>('baseline')

  const markCustom = useCallback(() => {
    setActivePreset((prev) => (prev === null ? prev : null))
  }, [])

  useEffect(() => {
    if (view === "results" && typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [view])

  const handleSpendChange = useCallback((value: number) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0
    if (safe === spend) return
    markCustom()
    setSpend(safe)
    setSpendingCategories((prev) => scaleSpendingCategories(prev, safe))
  }, [spend, markCustom])

  const handleSpendingCategoriesChange = useCallback((rows: SpendingCategoryPlan[]) => {
    markCustom()
    setSpendingCategories(rows)
    setSpend(totalSpendingFromCategories(rows))
  }, [markCustom])

  const handleInitialChange = useCallback((value: number) => {
    if (value === initial) return
    markCustom()
    setInitial(value)
  }, [initial, markCustom])

  const handleYearsChange = useCallback((value: number) => {
    if (value === years) return
    markCustom()
    setYears(value)
  }, [years, markCustom])

  const handleStrategyChange = useCallback((next: StrategyName) => {
    if (next === strategyName) return
    markCustom()
    setStrategyName(next)
  }, [strategyName, markCustom])

  const handleVpwChange = useCallback((value: number) => {
    if (value === vpwPct) return
    markCustom()
    setVpwPct(value)
  }, [vpwPct, markCustom])

  const handleGuardBandChange = useCallback((value: number) => {
    if (value === guardBand) return
    markCustom()
    setGuardBand(value)
  }, [guardBand, markCustom])

  const handleGuardStepChange = useCallback((value: number) => {
    if (value === guardStep) return
    markCustom()
    setGuardStep(value)
  }, [guardStep, markCustom])

  const handleStartDelayChange = useCallback((value: number) => {
    if (value === startDelayYears) return
    markCustom()
    setStartDelayYears(value)
  }, [startDelayYears, markCustom])

  const handleAnnualContribChange = useCallback((value: number) => {
    if (value === annualContrib) return
    markCustom()
    setAnnualContrib(value)
  }, [annualContrib, markCustom])

  const handleIncomeAmountChange = useCallback((value: number) => {
    if (value === incomeAmount) return
    markCustom()
    setIncomeAmount(value)
  }, [incomeAmount, markCustom])

  const handleIncomeStartYearChange = useCallback((value: number) => {
    if (value === incomeStartYear) return
    markCustom()
    setIncomeStartYear(value)
  }, [incomeStartYear, markCustom])

  const handleIncomeDurationYearsChange = useCallback((value: number) => {
    if (value === incomeDurationYears) return
    markCustom()
    setIncomeDurationYears(value)
  }, [incomeDurationYears, markCustom])

  const handleStillWorkingChange = useCallback((value: boolean) => {
    if (value === stillWorking) return
    markCustom()
    setStillWorking(value)
  }, [stillWorking, markCustom])

  const handleExpectedRealReturnChange = useCallback((value: number) => {
    if (value === expectedRealReturn) return
    markCustom()
    setExpectedRealReturn(value)
  }, [expectedRealReturn, markCustom])

  const handleCurrentAgeChange = useCallback((value: number) => {
    if (value === currentAge) return
    markCustom()
    setCurrentAge(value)
  }, [currentAge, markCustom])

  const handleInflationChange = useCallback((value: number) => {
    if (value === inflationPct) return
    markCustom()
    setInflationPct(value)
  }, [inflationPct, markCustom])

  const handleFutureExpensesChange = useCallback((rows: FutureExpensePlan[]) => {
    markCustom()
    setFutureExpenses(rows)
  }, [markCustom])

  const handleFutureIncomesChange = useCallback((rows: FutureIncomePlan[]) => {
    markCustom()
    setFutureIncomes(rows)
  }, [markCustom])


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

  const expenseSchedule = useMemo(() => {
    const map = new Map<number, { nominal: number; real: number }>()
    normalizedExpenses.forEach((item) => {
      const bucket = map.get(item.at_year_from_now) ?? { nominal: 0, real: 0 }
      bucket.nominal += item.amount
      bucket.real += item.real_amount ?? item.amount
      map.set(item.at_year_from_now, bucket)
    })
    return map
  }, [normalizedExpenses])

  const incomeSchedule = useMemo(() => {
    const map = new Map<number, { nominal: number; real: number }>()
    normalizedOtherIncomes.forEach((item) => {
      const bucket = map.get(item.start_year) ?? { nominal: 0, real: 0 }
      bucket.real += item.amount
      bucket.nominal += item.nominal_amount ?? item.amount
      map.set(item.start_year, bucket)
    })
    return map
  }, [normalizedOtherIncomes])

  const requestExpenses = useMemo(
    () => normalizedExpenses.map(({ amount, at_year_from_now }) => ({ amount, at_year_from_now })),
    [normalizedExpenses],
  )

  const requestIncomes = useMemo(
    () => normalizedOtherIncomes.map(({ amount, start_year }) => ({ amount, start_year })),
    [normalizedOtherIncomes],
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
      income_duration_years: incomeDurationYears,
      other_incomes: requestIncomes,
      one_time_expenses: requestExpenses,
      profile: { current_age: currentAge },
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
      incomeDurationYears,
      requestIncomes,
      requestExpenses,
      currentAge,
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
  const showHistoricalSuccess = Boolean(hist && hist.success_rate >= 80)
  const showHistoricalWarn = Boolean(hist && hist.success_rate < 80)

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
      setIncomeDurationYears(d.income_duration_years ?? 0)
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
    setIncomeDurationYears(num("idy", incomeDurationYears))

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
    if (next === market) return
    markCustom()
    setMarket(next)
    setApplyDefaultsPending(true)
    setView((prev) => (prev === "results" ? prev : "landing"))
  }

  const baseYear = new Date().getFullYear()

  const chartPhases = useMemo<ChartPhase[]>(() => {
    const phases: ChartPhase[] = []
    const horizonYear = baseYear + Math.max(0, Math.round(years))
    if (stillWorking) {
      const retireYear = baseYear + Math.max(0, Math.round(startDelayYears))
      if (retireYear > baseYear) {
        phases.push({ start: baseYear, end: retireYear, color: 'rgba(37, 99, 235, 0.16)', label: 'Working years' })
      }
      phases.push({ start: retireYear, end: horizonYear, color: 'rgba(16, 185, 129, 0.14)', label: 'Retirement years' })
    } else {
      phases.push({ start: baseYear, end: horizonYear, color: 'rgba(16, 185, 129, 0.14)', label: 'Retirement years' })
    }
    return phases.filter((phase) => Number.isFinite(phase.start) && (phase.end === undefined || Number.isFinite(phase.end)))
  }, [stillWorking, startDelayYears, years, baseYear])

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

    if (stillWorking) {
      const retirementYear = baseYear + Math.max(0, Math.round(startDelayYears))
      addMilestone(retirementYear, RETIREMENT_EMOJI, "Retirement", true)
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
      (res?.quantiles?.p95 || []).map((_: number, index: number) => ({
        month: index + 1,
        year: baseYear + Math.floor(index / 12),
        p5: res.quantiles.p5[index],
        p50: res.quantiles.p50[index],
        p95: res.quantiles.p95[index],
        band: res.quantiles.p95[index] - res.quantiles.p5[index],
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
          p5: point.p5 * factor,
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
    const inflationRate = 1 + inflationPct / 100
    let guardSpend = spend

    for (let y = 0; y < yearsCount; y++) {
      const prevIdx = y * 12 - 1
      const startMedianReal = y === 0 ? initialTotal : Number(res.quantiles.p50[prevIdx] ?? 0)
      const startP5Real = y === 0 ? initialTotal : Number(res.quantiles.p5[prevIdx] ?? 0)
      const unitFactor = valueUnits === "nominal" ? Math.pow(inflationRate, y) : 1
      let baseBasic = 0

      if (stillWorking && y < startDelayYears) {
        baseBasic = Math.max(annualContrib, 0)
      } else if (strategyName === "variable_percentage") {
        baseBasic = Math.max(0, startMedianReal * vpct)
      } else if (strategyName === "guardrails") {
        const wr = startMedianReal > 0 ? guardSpend / startMedianReal : 0
        const low = initialWR * (1 - gBand)
        const high = initialWR * (1 + gBand)
        if (wr < low) guardSpend = Math.min(guardSpend * (1 + gStep), guardSpend + guardSpend * gStep)
        if (wr > high) guardSpend = Math.max(guardSpend * (1 - gStep), guardSpend - guardSpend * gStep)
        baseBasic = guardSpend
      } else {
        baseBasic = spend
      }

      const expenseBucket = expenseSchedule.get(y) ?? { nominal: 0, real: 0 }
      const otherSpending = valueUnits === "nominal" ? expenseBucket.nominal : expenseBucket.real
      const incomeBucket = incomeSchedule.get(y) ?? { nominal: 0, real: 0 }
      const otherIncome = valueUnits === "nominal" ? incomeBucket.nominal : incomeBucket.real
      const retirementYear = y - incomeStartYear
      const isRecurringIncomeActive = y >= incomeStartYear && (incomeDurationYears <= 0 || retirementYear < incomeDurationYears)
      const recurringIncomeReal = isRecurringIncomeActive ? incomeAmount : 0
      const recurringIncome = valueUnits === "nominal" ? recurringIncomeReal * unitFactor : recurringIncomeReal
      const basic = baseBasic * unitFactor
      const netIncome = recurringIncome + otherIncome
      const cashFlow = basic + otherSpending - netIncome
      const age = currentAge > 0 ? currentAge + y : undefined
      const isSavingsYear = stillWorking && y < startDelayYears

      rows.push({
        year: baseYear + y,
        age,
        startMedian: startMedianReal * unitFactor,
        startP5: startP5Real * unitFactor,
        basic,
        otherSpending,
        otherIncome: netIncome,
        cashFlow,
        isSavingsYear,
      })
    }

    return rows
  }

  const applyPreset = useCallback((name: "lean" | "baseline" | "fat") => {
    const defaults = marketMeta?.defaults
    if (!defaults) return

    if (name === "baseline") {
      setInitial(defaults.initial)
      setSpendingCategories(defaultSpendingCategories(defaults.spend))
      setSpend(defaults.spend)
      setYears(defaults.years)
      setStillWorking(defaults.still_working)
      setAnnualContrib(defaults.annual_contrib)
      setExpectedRealReturn(defaults.expected_real_return_pct)
      setStrategyName("fixed")
      setIncomeAmount(defaults.income_amount)
      setIncomeStartYear(defaults.income_start_year)
      setIncomeDurationYears(defaults.income_duration_years)
      setStartDelayYears(defaults.start_delay_years)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    } else if (name === "lean") {
      // Lean FIRE ratios: 0.5x initial, 0.625x spending, 0.75x contribution
      const leanInitial = Math.round(defaults.initial * 0.5 / 1000) * 1000
      const leanSpend = Math.round(defaults.spend * 0.625 / 1000) * 1000
      const leanContrib = Math.round(defaults.annual_contrib * 0.75 / 1000) * 1000
      
      setInitial(leanInitial)
      setSpendingCategories(defaultSpendingCategories(leanSpend))
      setSpend(leanSpend)
      setYears(defaults.years)
      setStillWorking(true)
      setAnnualContrib(leanContrib)
      setExpectedRealReturn(defaults.expected_real_return_pct)
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
      setIncomeDurationYears(0)
      setStartDelayYears(0)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    } else {
      // Fat FIRE ratios: 2x initial, 2.5x spending, 0x contribution (already retired)
      const fatInitial = Math.round(defaults.initial * 2 / 1000) * 1000
      const fatSpend = Math.round(defaults.spend * 2.5 / 1000) * 1000
      const fatYears = Math.max(defaults.years + 5, 35) // Add 5 years or min 35
      
      setInitial(fatInitial)
      setSpendingCategories(defaultSpendingCategories(fatSpend))
      setSpend(fatSpend)
      setYears(fatYears)
      setStillWorking(false)
      setAnnualContrib(0)
      setExpectedRealReturn(Math.max(defaults.expected_real_return_pct - 1, 4)) // Slightly lower return
      setStrategyName("fixed")
      setIncomeAmount(0)
      setIncomeStartYear(0)
      setIncomeDurationYears(0)
      setStartDelayYears(0)
      setFutureIncomes([])
      setFutureExpenses([])
      setValueUnits("real")
    }
    setActivePreset(name)
  }, [marketMeta])

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
    params.set("idy", String(incomeDurationYears))
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
        onInitial={handleInitialChange}
        spend={spend}
        onSpend={handleSpendChange}
        years={years}
        onYears={handleYearsChange}
        strategy={strategyName}
        onStrategy={handleStrategyChange}
        vpwPct={vpwPct}
        onVpwPct={handleVpwChange}
        guardBand={guardBand}
        onGuardBand={handleGuardBandChange}
        guardStep={guardStep}
        onGuardStep={handleGuardStepChange}
        startDelayYears={startDelayYears}
        onStartDelay={handleStartDelayChange}
        annualContrib={annualContrib}
        onAnnualContrib={handleAnnualContribChange}
        incomeAmount={incomeAmount}
        onIncomeAmount={handleIncomeAmountChange}
        incomeStartYear={incomeStartYear}
        onIncomeStartYear={handleIncomeStartYearChange}
        incomeDurationYears={incomeDurationYears}
        onIncomeDurationYears={handleIncomeDurationYearsChange}
        stillWorking={stillWorking}
        onStillWorking={handleStillWorkingChange}
        expectedRealReturn={expectedRealReturn}
        onExpectedRealReturn={handleExpectedRealReturnChange}
        currentAge={currentAge}
        onCurrentAge={handleCurrentAgeChange}
        inflationPct={inflationPct}
        onInflationPct={handleInflationChange}
        spendingCategories={spendingCategories}
        onSpendingCategoriesChange={handleSpendingCategoriesChange}
        futureExpenses={futureExpenses}
        onFutureExpensesChange={handleFutureExpensesChange}
        futureIncomes={futureIncomes}
        onFutureIncomesChange={handleFutureIncomesChange}
        onSimulate={() => setView("results")}
        running={loading}
        onApplyPreset={applyPreset}
        selectedPreset={activePreset}
      />
    )
  }

  return (
    <div className="container results">
      <div className="layout">
        <aside>
          <Inputs
            variant="results"
            market={market}
            markets={marketOptions}
            onMarketChange={handleMarketChange}
            currencyCode={currencyCode}
            initial={initial}
            onInitial={handleInitialChange}
            spend={spend}
            onSpend={handleSpendChange}
            years={years}
            onYears={handleYearsChange}
            strategy={strategyName}
            onStrategy={handleStrategyChange}
            vpwPct={vpwPct}
            onVpwPct={handleVpwChange}
            guardBand={guardBand}
            onGuardBand={handleGuardBandChange}
            guardStep={guardStep}
            onGuardStep={handleGuardStepChange}
            startDelayYears={startDelayYears}
            onStartDelay={handleStartDelayChange}
            annualContrib={annualContrib}
            onAnnualContrib={handleAnnualContribChange}
            incomeAmount={incomeAmount}
            onIncomeAmount={handleIncomeAmountChange}
            incomeStartYear={incomeStartYear}
            onIncomeStartYear={handleIncomeStartYearChange}
            incomeDurationYears={incomeDurationYears}
            onIncomeDurationYears={handleIncomeDurationYearsChange}
            stillWorking={stillWorking}
            onStillWorking={handleStillWorkingChange}
            expectedRealReturn={expectedRealReturn}
            onExpectedRealReturn={handleExpectedRealReturnChange}
            currentAge={currentAge}
            onCurrentAge={handleCurrentAgeChange}
            inflationPct={inflationPct}
            onInflationPct={handleInflationChange}
            spendingCategories={spendingCategories}
            onSpendingCategoriesChange={handleSpendingCategoriesChange}
            futureExpenses={futureExpenses}
            onFutureExpensesChange={handleFutureExpensesChange}
            futureIncomes={futureIncomes}
            onFutureIncomesChange={handleFutureIncomesChange}
            onRun={() => {
              histQuery.refetch()
              mcQuery.refetch()
            }}
            running={loading}
            onShare={copyShareLink}
            onApplyPreset={applyPreset}
            selectedPreset={activePreset}
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
              <div style={{ marginLeft: "auto" }}>
                <ThemeToggle />
              </div>
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

          {showHistoricalSuccess && (
            <>
              <div className="callout">
                <div className="hstack" style={{ gap: 8 }}>
                  <FaCircleCheck color="#16a34a" />
                  <strong>You're FI-ready based on history.</strong> Success rate is <strong>{hist?.success_rate.toFixed(1) ?? '0'}%</strong>. Explore the range below.
                </div>
              </div>

              {hist && (() => {
                const analysis = analyzeHistoricalResults(hist, years, currencyCode, valueUnits, inflationPct)
                return (
                  <div className="callout" style={{ backgroundColor: 'var(--color-surface-secondary)', border: '1px solid var(--color-border)' }}>
                    <div style={{ marginBottom: '12px' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1.1em' }}>Historical Analysis & Sequence of Returns</h4>
                      <p style={{ margin: '0 0 12px 0', fontSize: '0.9em', color: 'var(--color-text-secondary)' }}>
                        <strong>Sequence of returns risk</strong> refers to the danger of experiencing poor investment returns early in retirement, 
                        which can permanently damage your portfolio's ability to sustain withdrawals. Even with the same average returns over time, 
                        bad early years can deplete your portfolio faster than it can recover.
                      </p>
                    </div>
                    
                    <div className="grid" style={{ gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#16a34a' }}>Best Case Scenario</div>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{formatCurrencyCompact(analysis.bestCase, currencyCode)}</div>
                        <div style={{ fontSize: '0.85em', color: 'var(--color-text-secondary)' }}>Highest portfolio value after {years} years</div>
                      </div>
                      
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#dc2626' }}>Worst Case Scenario</div>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{formatCurrencyCompact(analysis.worstCase, currencyCode)}</div>
                        <div style={{ fontSize: '0.85em', color: 'var(--color-text-secondary)' }}>
                          {analysis.worstCase <= 0 ? 'Portfolio depleted' : `Lowest portfolio value after ${years} years`}
                        </div>
                      </div>

                      {analysis.zeroYear && (
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#dc2626' }}>Portfolio Depletion</div>
                          <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>Year {analysis.zeroYear}</div>
                          <div style={{ fontSize: '0.85em', color: 'var(--color-text-secondary)' }}>
                            {analysis.yearsToZero && analysis.yearsToZero > 0 
                              ? `${analysis.yearsToZero} years of shortfall` 
                              : 'Portfolio reaches zero'}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#2563eb' }}>Success Rate</div>
                        <div style={{ fontSize: '1.2em', fontWeight: 'bold' }}>{analysis.successRate.toFixed(1)}%</div>
                        <div style={{ fontSize: '0.85em', color: 'var(--color-text-secondary)' }}>
                          {hist.num_windows} historical {years}-year periods tested
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              <ProjectionChart data={toSeriesWithUnits(hist)} title={`Historical projection (${unitLabel})`} currencyCode={currencyCode} milestones={chartMilestones} phases={chartPhases} />
              <Histogram
                values={valueUnits === "nominal" ? hist!.ending_balances.map((v) => v * Math.pow(1 + inflationPct / 100, years)) : hist!.ending_balances}
                title={`Historical ending balances (${unitLabel})`}
                currencyCode={currencyCode}
              />
              <CashFlowTable rows={toCashFlowRows(hist)} title={`Detailed cashflow table (${unitLabel})`} currencyCode={currencyCode} />
            </>
          )}

          <Accordion title="Advanced (Monte Carlo)" defaultOpen={false}>
            <div className="row">
              <div>
                <span className="label">Simulated paths</span>
                <input
                  className="input"
                  type="number"
                  min={100}
                  max={10000}
                  step={100}
                  value={nPaths}
                  onChange={(e) => setNPaths(Number(e.target.value))}
                />
              </div>
              <div>
                <span className="label">Block size (months)</span>
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={blockSize}
                  onChange={(e) => setBlockSize(Number(e.target.value))}
                />
              </div>
            </div>
          </Accordion>

          {mc && (
            <ProjectionChart data={toSeriesWithUnits(mc)} title={`Monte Carlo projection (${unitLabel})`} currencyCode={currencyCode} milestones={chartMilestones} phases={chartPhases} />
          )}

          {showHistoricalWarn && (
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

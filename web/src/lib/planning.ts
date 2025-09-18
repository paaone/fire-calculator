export type SpendingCategoryKey =
  | "housing"
  | "food"
  | "transportation"
  | "healthcare"
  | "education"
  | "travel"
  | "childcare"
  | "other"

export interface SpendingCategoryPlan {
  id: string
  label: string
  amount: number
  inflation: number
  category: SpendingCategoryKey
}

export type ExpenseCategoryKey =
  | "home_project"
  | "vehicle"
  | "education"
  | "healthcare"
  | "travel"
  | "wedding"
  | "other"

export type IncomeCategoryKey =
  | "social_security"
  | "pension"
  | "rental"
  | "inheritance"
  | "business"
  | "other"

export interface FutureExpensePlan {
  id: string
  label: string
  amount: number
  startYear: number
  years: number
  inflation: number
  category: ExpenseCategoryKey
  frequency: "one_time" | "recurring"
}

export interface FutureIncomePlan {
  id: string
  label: string
  amount: number
  startYear: number
  years: number
  inflation: number
  category: IncomeCategoryKey
  frequency: "one_time" | "recurring"
}

export const SPENDING_CATEGORY_PRESETS: Array<{
  key: SpendingCategoryKey
  label: string
  weight: number
  inflation: number
}> = [
  { key: "housing", label: "Housing & utilities", weight: 0.3, inflation: 2.5 },
  { key: "food", label: "Groceries & dining", weight: 0.18, inflation: 2.5 },
  { key: "transportation", label: "Transportation", weight: 0.1, inflation: 2.3 },
  { key: "healthcare", label: "Healthcare", weight: 0.12, inflation: 4 },
  { key: "education", label: "Education & personal growth", weight: 0.07, inflation: 5 },
  { key: "travel", label: "Travel & experiences", weight: 0.1, inflation: 3 },
  { key: "childcare", label: "Family & childcare", weight: 0.08, inflation: 3.5 },
  { key: "other", label: "Everything else", weight: 0.05, inflation: 2.5 },
]

export const FUTURE_EXPENSE_OPTIONS: Array<{
  key: ExpenseCategoryKey
  label: string
  defaultInflation: number
}> = [
  { key: "home_project", label: "Home renovation / down payment", defaultInflation: 2.8 },
  { key: "vehicle", label: "Vehicle purchase", defaultInflation: 3 },
  { key: "education", label: "Education", defaultInflation: 5 },
  { key: "healthcare", label: "Healthcare milestone", defaultInflation: 4.5 },
  { key: "travel", label: "Travel splurge", defaultInflation: 3 },
  { key: "wedding", label: "Wedding / celebration", defaultInflation: 3.2 },
  { key: "other", label: "Custom goal", defaultInflation: 2.5 },
]

export const FUTURE_INCOME_OPTIONS: Array<{
  key: IncomeCategoryKey
  label: string
  defaultInflation: number
}> = [
  { key: "social_security", label: "Social Security / government pension", defaultInflation: 2.4 },
  { key: "pension", label: "Employer pension", defaultInflation: 2 },
  { key: "rental", label: "Rental income", defaultInflation: 2.5 },
  { key: "inheritance", label: "Inheritance / lump sum", defaultInflation: 0 },
  { key: "business", label: "Business income", defaultInflation: 2.5 },
  { key: "other", label: "Other income", defaultInflation: 2.5 },
]

export function createId() {
  return Math.random().toString(36).slice(2, 10)
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100
}

export function totalSpendingFromCategories(categories: SpendingCategoryPlan[]): number {
  return categories.reduce((acc, item) => acc + (Number.isFinite(item.amount) ? item.amount : 0), 0)
}

export function defaultSpendingCategories(total: number): SpendingCategoryPlan[] {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0
  const categories: SpendingCategoryPlan[] = []
  let running = 0
  SPENDING_CATEGORY_PRESETS.forEach((preset, index) => {
    const base = safeTotal * preset.weight
    const amount = index === SPENDING_CATEGORY_PRESETS.length - 1 ? safeTotal - running : base
    const rounded = roundCurrency(amount)
    running += rounded
    categories.push({
      id: createId(),
      label: preset.label,
      amount: rounded,
      inflation: preset.inflation,
      category: preset.key,
    })
  })
  return categories
}

export function scaleSpendingCategories(categories: SpendingCategoryPlan[], total: number): SpendingCategoryPlan[] {
  const safeTotal = Number.isFinite(total) && total > 0 ? total : 0
  if (!categories.length) return defaultSpendingCategories(safeTotal)
  const current = totalSpendingFromCategories(categories)
  if (current <= 0) return defaultSpendingCategories(safeTotal)
  const ratio = safeTotal / current
  let running = 0
  return categories.map((item, index) => {
    const scaled = roundCurrency(item.amount * ratio)
    if (index === categories.length - 1) {
      const correction = roundCurrency(safeTotal - running)
      return { ...item, amount: correction }
    }
    running += scaled
    return { ...item, amount: scaled }
  })
}

export function suggestedInflationForExpense(category: ExpenseCategoryKey): number {
  return FUTURE_EXPENSE_OPTIONS.find((option) => option.key === category)?.defaultInflation ?? 2.5
}

export function suggestedInflationForIncome(category: IncomeCategoryKey): number {
  return FUTURE_INCOME_OPTIONS.find((option) => option.key === category)?.defaultInflation ?? 2.5
}

export function suggestedInflationForSpending(category: SpendingCategoryKey): number {
  return SPENDING_CATEGORY_PRESETS.find((preset) => preset.key === category)?.inflation ?? 2.5
}

export function toRealAmount(amount: number, inflationPct: number, yearsFromNow: number): number {
  if (!Number.isFinite(amount)) return 0
  const rate = 1 + (Number.isFinite(inflationPct) ? inflationPct : 0) / 100
  if (rate <= 0) return amount
  const exponent = Math.max(0, yearsFromNow)
  return amount / Math.pow(rate, exponent)
}

export function expandFutureExpenses(items: FutureExpensePlan[]): { amount: number; at_year_from_now: number }[] {
  const expanded: { amount: number; at_year_from_now: number }[] = []
  items.forEach((item) => {
    const cycles = item.frequency === "recurring" ? Math.max(1, Math.round(item.years)) : 1
    for (let i = 0; i < cycles; i++) {
      const year = Math.max(0, Math.round(item.startYear + i))
      const realAmount = toRealAmount(item.amount, item.inflation, year)
      expanded.push({ amount: roundCurrency(realAmount), at_year_from_now: year })
    }
  })
  return expanded
}

export function expandFutureIncomes(items: FutureIncomePlan[]): { amount: number; start_year: number }[] {
  const expanded: { amount: number; start_year: number }[] = []
  items.forEach((item) => {
    const cycles = item.frequency === "recurring" ? Math.max(1, Math.round(item.years)) : 1
    for (let i = 0; i < cycles; i++) {
      const year = Math.max(0, Math.round(item.startYear + i))
      const realAmount = toRealAmount(item.amount, item.inflation, year)
      expanded.push({ amount: roundCurrency(realAmount), start_year: year })
    }
  })
  return expanded
}

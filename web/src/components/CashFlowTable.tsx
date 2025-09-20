import React, { useMemo } from "react"

export interface CashFlowRow {
  year: number
  age?: number
  startMedian: number
  startP10: number
  basic: number
  otherSpending: number
  otherIncome: number
  cashFlow: number
  isSavingsYear: boolean
}

export default function CashFlowTable({ rows, title, currencyCode = "USD" }: { rows: CashFlowRow[]; title?: string; currencyCode?: string }) {
  const locale = currencyCode === "INR" ? "en-IN" : undefined
  const formatter = useMemo(() => new Intl.NumberFormat(locale ?? undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }), [currencyCode, locale])
  const currency = (n: number) => formatter.format(n)
  const currencyNet = (n: number) => {
    if (n < 0) {
      return `(${formatter.format(Math.abs(n))})`
    }
    return formatter.format(n)
  }

  if (!rows?.length) return null

  const hasOtherSpending = rows.some((row) => Math.abs(row.otherSpending) > 0.01)
  const hasOtherIncome = rows.some((row) => Math.abs(row.otherIncome) > 0.01)

  return (
    <div className="panel">
      <div className="hstack" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title ?? "Projection table"}</div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Year / Age</th>
              <th>Starting Balance (Median)</th>
              <th>Starting Balance (10th %)</th>
              <th>Basic Spend / Save</th>
              {hasOtherSpending && <th>Other Spending</th>}
              {hasOtherIncome && <th>Other Income</th>}
              <th>Net Cash Flow</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const yearAge = r.age ? `${r.year} (${r.age})` : String(r.year)
              const basicClass = r.isSavingsYear ? "table-cell-saving" : "table-cell-spend"
              const otherSpendingClass = r.otherSpending > 0 ? "table-cell-spend" : r.otherSpending < 0 ? "table-cell-saving" : ""
              const otherIncomeClass = r.otherIncome > 0 ? "table-cell-saving" : r.otherIncome < 0 ? "table-cell-spend" : ""
              return (
                <tr key={r.year}>
                  <td>{yearAge}</td>
                  <td>{currency(r.startMedian)}</td>
                  <td>{currency(r.startP10)}</td>
                  <td className={basicClass}>{currency(r.basic)}</td>
                  {hasOtherSpending && (
                    <td className={otherSpendingClass || undefined}>{currency(r.otherSpending)}</td>
                  )}
                  {hasOtherIncome && (
                    <td className={otherIncomeClass || undefined}>{currency(r.otherIncome)}</td>
                  )}
                  <td className="table-cell-net-flow">{currencyNet(r.cashFlow)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

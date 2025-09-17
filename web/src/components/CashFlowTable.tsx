import React from 'react'

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export interface CashFlowRow {
  year: number
  age?: number
  startMedian: number
  startP10: number
  basic: number
  otherSpending: number
  otherIncome: number
  cashFlow: number
}

export default function CashFlowTable({ rows, title }: { rows: CashFlowRow[]; title?: string }) {
  if (!rows?.length) return null
  return (
    <div className="panel">
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title ?? 'Projection table'}</div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Year/Age</th>
              <th>Starting Portfolio Value (Median)</th>
              <th>Starting Portfolio Value (10th Percentile)</th>
              <th>Basic Saving or Retirement Spending</th>
              <th>Other Spending Goals</th>
              <th>Other Income Events</th>
              <th>Cash Flow</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const yearAge = r.age ? `${r.year} (${r.age})` : String(r.year)
              return (
                <tr key={r.year}>
                  <td>{yearAge}</td>
                  <td>{currency(r.startMedian)}</td>
                  <td>{currency(r.startP10)}</td>
                  <td>{currency(r.basic)}</td>
                  <td>{currency(r.otherSpending)}</td>
                  <td>{currency(r.otherIncome)}</td>
                  <td>{currency(r.cashFlow)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

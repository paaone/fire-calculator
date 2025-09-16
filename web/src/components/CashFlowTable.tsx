import React from 'react'

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export interface CashFlowRow {
  year: number
  p10: number
  p50: number
  p90: number
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
              <th>Year</th>
              <th>p10 balance</th>
              <th>p50 balance</th>
              <th>p90 balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td>{currency(r.p10)}</td>
                <td>{currency(r.p50)}</td>
                <td>{currency(r.p90)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}


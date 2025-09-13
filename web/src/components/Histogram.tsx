import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function Histogram({ values, bins = 30, title }: { values: number[]; bins?: number; title?: string }) {
  if (!values.length) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = (max - min) / bins || 1
  const hist = new Array(bins).fill(0)
  for (const v of values) {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((v - min) / width)))
    hist[idx]++
  }
  const data = hist.map((count, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count,
  }))
  return (
    <div className="panel" style={{ width: '100%', height: 280 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title ?? 'Ending Balance Distribution'}</div>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="x0" tickFormatter={(v) => currency(Number(v))} interval={Math.max(0, Math.floor(bins / 6))} />
          <YAxis />
          <Tooltip formatter={(v: any) => String(v)} labelFormatter={(x0) => currency(Number(x0))} />
          <Bar dataKey="count" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

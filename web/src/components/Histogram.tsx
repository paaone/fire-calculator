import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

type Props = {
  values: number[]
  bins?: number
  title?: string
  currencyCode?: string
}

export default function Histogram({ values, bins = 30, title, currencyCode = "USD" }: Props) {
  const locale = currencyCode === "INR" ? "en-IN" : undefined
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(locale ?? undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }),
    [currencyCode, locale],
  )
  const axisFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale ?? undefined, {
        style: "currency",
        currency: currencyCode,
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [currencyCode, locale],
  )

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
    <div className="panel chart-card">
      <div className="chart-card__header">
        <div style={{ fontWeight: 600 }}>{title ?? "Ending balance distribution"}</div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ left: 16, right: 16, top: 16, bottom: 36 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="x0"
              tickFormatter={(v) => axisFormatter.format(Number(v))}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(bins / 6))}
              dy={8}
            />
            <YAxis tickLine={false} axisLine={false} width={60} allowDecimals={false} />
            <Tooltip
              formatter={(value: any) => String(value)}
              labelFormatter={(x0) => currencyFormatter.format(Number(x0))}
              contentStyle={{ borderRadius: 10, borderColor: "#e2e8f0" }}
            />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

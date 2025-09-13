import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface SeriesPoint {
  month: number
  p10: number
  p50: number
  p90: number
}

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ProjectionChart({ data, title }: { data: SeriesPoint[]; title?: string }) {
  return (
    <div style={{ width: '100%', height: 360 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title ?? 'Projection'}</div>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={(m) => String(Math.floor((m as number) / 12)) + 'y'} />
          <YAxis tickFormatter={currency} width={90} />
          <Tooltip formatter={(v: any) => currency(Number(v))} labelFormatter={(m) => `${Math.floor(Number(m)/12)} years`} />
          <Legend />
          <Area type="monotone" dataKey="p90" name="P90" stroke="#82ca9d" fill="url(#colorBand)" dot={false} />
          <Area type="monotone" dataKey="p10" name="P10" stroke="#8884d8" fillOpacity={0} dot={false} />
          <Line type="monotone" dataKey="p50" name="Median" stroke="#555" dot={false} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}


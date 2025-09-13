import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'

export interface SeriesPoint { month: number; p10: number; p50: number; p90: number; band: number }

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ProjectionChart({ data, title, retireAtMonths }: { data: SeriesPoint[]; title?: string; retireAtMonths?: number }) {
  return (
    <div className="panel" style={{ width: '100%', height: 380 }}>
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title ?? 'Projection'}</div>
      </div>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#a7f3d0" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#bfdbfe" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={(m) => `${Math.floor(Number(m)/12)}y`} ticks={yearTicks(data)} />
          <YAxis tickFormatter={currency} width={90} domain={[0, (dataMax: number) => dataMax * 1.05]} />
          <Tooltip content={<CustomTooltip />} />
          {retireAtMonths && retireAtMonths > 0 && (
            <ReferenceLine x={retireAtMonths} stroke="#94a3b8" strokeDasharray="4 3" label={{ value: 'Retire', position: 'insideTop', fill: '#64748b' }} />
          )}
          {/* Confidence band (no legend clutter) */}
          <Area type="monotone" dataKey="p10" stroke="#93c5fd" fillOpacity={0} dot={false} stackId="band" />
          <Area type="monotone" dataKey="band" stroke="#1e88e5" fill="url(#colorBand)" dot={false} stackId="band" />
          {/* Median line */}
          <Line type="monotone" dataKey="p50" name="Median" stroke="#1e88e5" dot={false} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function yearTicks(data: SeriesPoint[]) {
  const last = data[data.length - 1]?.month ?? 0
  const ticks = [] as number[]
  for (let m = 12; m <= last; m += 12) ticks.push(m)
  return ticks
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const month = Number(label)
  const years = Math.floor(month / 12)
  const p50 = Number(payload.find((p: any) => p.dataKey === 'p50')?.value ?? 0)
  const p10 = Number(payload.find((p: any) => p.dataKey === 'p10')?.value ?? 0)
  const band = Number(payload.find((p: any) => p.dataKey === 'band')?.value ?? 0)
  const p90 = p10 + band
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div className="label" style={{ marginBottom: 4 }}>Year {years}</div>
      <div className="hstack" style={{ gap: 12 }}>
        <div><strong>Median:</strong> {currency(p50)}</div>
        <div><strong>Range:</strong> {currency(p10)} – {currency(p90)}</div>
      </div>
    </div>
  )
}

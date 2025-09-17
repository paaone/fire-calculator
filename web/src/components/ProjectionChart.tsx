import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from 'recharts'

export interface SeriesPoint { month: number; year: number; p10: number; p50: number; p90: number; band: number }

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function abbrCurrency(n: number) {
  const abs = Math.abs(n)
  const trim = (s: string) => s.replace(/\.0$/, '')
  if (abs >= 1_000_000_000) return `$${trim((n / 1_000_000_000).toFixed(1))}B`
  if (abs >= 1_000_000) return `$${trim((n / 1_000_000).toFixed(1))}M`
  if (abs >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${Math.round(n)}`
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
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#bae6fd" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="year" ticks={yearTicks(data)} />
          <YAxis tickFormatter={abbrCurrency} width={68} domain={[0, (dataMax: number) => dataMax * 1.05]} />
          <Tooltip content={<TooltipContent />} />
          {retireAtMonths && retireAtMonths > 0 && (
            <ReferenceLine x={data[0]?.year + Math.floor(retireAtMonths / 12)} stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" label={{ value: 'Retire', position: 'insideTop', fill: '#64748b' }} />
          )}
          {/* Range band (p10 to p90) */}
          <Area type="monotone" dataKey="p10" stroke="#93c5fd" strokeWidth={2.2} fillOpacity={0} dot={false} stackId="band" />
          <Area type="monotone" dataKey="band" stroke="#1e88e5" strokeWidth={2.2} fill="url(#colorBand)" dot={false} stackId="band" />
          {/* Median line */}
          <Area type="monotone" dataKey="p50" stroke="#0ea5e9" strokeWidth={2.4} fillOpacity={0} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function yearTicks(data: SeriesPoint[]) {
  if (!data.length) return []
  const start = data[0].year
  const end = data[data.length - 1].year
  const ticks: number[] = []
  for (let y = start; y <= end; y++) ticks.push(y)
  return ticks
}

function TooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const year = Number(label)
  const p10 = Number(payload.find((p: any) => p.dataKey === 'p10')?.value ?? 0)
  const band = Number(payload.find((p: any) => p.dataKey === 'band')?.value ?? 0)
  const p90 = p10 + band
  const p50 = Number(payload.find((p: any) => p.dataKey === 'p50')?.value ?? 0)
  return (
    <div className="panel" style={{ padding: 12 }}>
      <div className="label" style={{ marginBottom: 4 }}>{year}</div>
      <div><strong>Median:</strong> {currency(p50)}</div>
      <div><strong>Range:</strong> {currency(p10)} to {currency(p90)}</div>
    </div>
  )
}




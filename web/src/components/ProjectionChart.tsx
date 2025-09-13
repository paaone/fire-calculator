import { Area, AreaChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export interface SeriesPoint { month: number; p10: number; p50: number; p90: number; band: number }

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ProjectionChart({ data, title, log = false }: { data: SeriesPoint[]; title?: string; log?: boolean }) {
  return (
    <div className="panel" style={{ width: '100%', height: 380 }}>
      <div className="hstack" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title ?? 'Projection'}</div>
        <div className="switch" role="tablist" aria-label="Scale">
          <button className={!log ? 'active' : ''} onClick={() => {}} disabled>Linear</button>
          <button className={log ? 'active' : ''} onClick={() => {}} disabled>Log</button>
        </div>
      </div>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tickFormatter={(m) => `${Math.floor(Number(m)/12)}y`} ticks={yearTicks(data)} />
          <YAxis tickFormatter={currency} width={90} domain={[0, (dataMax: number) => dataMax * 1.05]} />
          <Tooltip formatter={(v: any) => currency(Number(v))} labelFormatter={(m) => `${Math.floor(Number(m)/12)} years`} />
          <Legend />
          {/* Band between p10 and p90 using stacked areas */}
          <Area type="monotone" dataKey="p10" name="P10 baseline" stroke="#93c5fd" fillOpacity={0} dot={false} stackId="band" />
          <Area type="monotone" dataKey="band" name="P10–P90 band" stroke="#2563eb" fill="url(#colorBand)" dot={false} stackId="band" />
          {/* Median line */}
          <Line type="monotone" dataKey="p50" name="Median" stroke="#555" dot={false} strokeWidth={2} />
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

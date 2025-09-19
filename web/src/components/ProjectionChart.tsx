import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, ReferenceArea } from "recharts"

export interface SeriesPoint {
  month: number
  year: number
  p10: number
  p50: number
  p90: number
  band: number
}

export type ChartPhase = {
  start: number
  end?: number
  color: string
  label?: string
}

export type ChartMilestone = {
  year: number
  label: string
  emoji: string
  drawLine?: boolean
}

type Props = {
  data: SeriesPoint[]
  title?: string
  currencyCode?: string
  milestones?: ChartMilestone[]
  phases?: ChartPhase[]
}

export default function ProjectionChart({ data, title, currencyCode = "USD", milestones = [], phases = [] }: Props) {
  const locale = currencyCode === "INR" ? "en-IN" : undefined
  const currencyFormatter = useMemo(
    () => new Intl.NumberFormat(locale ?? undefined, { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }),
    [currencyCode, locale],
  )
  const compactFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale ?? undefined, {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 1,
        notation: "compact",
      }),
    [currencyCode, locale],
  )

  return (
    <div className="panel chart-card">
      <div className="chart-card__header">
        <div style={{ fontWeight: 600 }}>{title ?? "Projection"}</div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ left: 16, right: 16, top: 16, bottom: 36 }}>
            <defs>
              <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#bae6fd" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="year" ticks={yearTicks(data)} tickLine={false} axisLine={false} dy={8} />
            <YAxis
              tickFormatter={(value: number) => compactFormatter.format(value)}
              width={88}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TooltipContent format={currencyFormatter.format} />} cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} />
            {phases.map((phase) => {
              const endYear = phase.end ?? (data[data.length - 1]?.year ?? phase.start)
              return (
                <ReferenceArea
                  key={`${phase.start}-${phase.end ?? 'end'}-${phase.label ?? 'phase'}`}
                  x1={phase.start}
                  x2={endYear}
                  strokeOpacity={0}
                  fill={phase.color}
                  label={phase.label ? { value: phase.label, position: "insideTopLeft", fill: "#64748b", fontSize: 12, offset: 10 } : undefined}
                />
              )
            })}
            {milestones.map((marker) => {
              const lineStroke = marker.drawLine ? "#94a3b8" : "rgba(148, 163, 184, 0.001)"
              const dash = marker.drawLine ? "4 3" : undefined
              const labelValue = marker.label ? `${marker.emoji} ${marker.label}` : marker.emoji
              return (
                <ReferenceLine
                  key={`${marker.year}-${marker.label}`}
                  x={marker.year}
                  stroke={lineStroke}
                  strokeWidth={marker.drawLine ? 2 : 0}
                  strokeDasharray={dash}
                  label={{ value: labelValue, position: "insideTop", fill: "#94a3b8", fontSize: 13 }}
                />
              )
            })}
            <Area type="monotone" dataKey="p10" stroke="#93c5fd" strokeWidth={2} fillOpacity={0} dot={false} stackId="band" />
            <Area type="monotone" dataKey="band" stroke="#1e88e5" strokeWidth={2} fill="url(#colorBand)" dot={false} stackId="band" />
            <Area type="monotone" dataKey="p50" stroke="#0ea5e9" strokeWidth={2.4} fillOpacity={0} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
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

type TooltipProps = {
  active?: boolean
  payload?: any[]
  label?: string | number
  format: (value: number) => string
}

function TooltipContent({ active, payload, label, format }: TooltipProps) {
  if (!active || !payload?.length) return null
  const year = Number(label)
  const p10 = Number(payload.find((p: any) => p.dataKey === "p10")?.value ?? 0)
  const band = Number(payload.find((p: any) => p.dataKey === "band")?.value ?? 0)
  const p90 = p10 + band
  const p50 = Number(payload.find((p: any) => p.dataKey === "p50")?.value ?? 0)
  return (
    <div className="tooltip-card">
      <div className="label" style={{ marginBottom: 4 }}>{year}</div>
      <div><strong>Median:</strong> {format(p50)}</div>
      <div><strong>Range:</strong> {format(p10)} to {format(p90)}</div>
    </div>
  )
}

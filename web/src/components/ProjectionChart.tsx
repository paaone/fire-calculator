import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine, ReferenceArea, Line, ComposedChart } from "recharts"

export interface SeriesPoint {
  month: number
  year: number
  p5: number
  p50: number
  p95: number
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

// Custom milestone droplet component
const MilestoneDroplet = (props: any) => {
  const { cx, cy, payload } = props
  if (!payload?.milestone) return null
  
  // Create a droplet shape with circular top and pointed bottom
  const circleRadius = 10
  const dropletHeight = 16
  const circleCenter = cy - dropletHeight + circleRadius
  const pointY = cy
  
  // Create the droplet path (circle on top, triangle pointing down)
  const dropletPath = `
    M ${cx} ${pointY}
    L ${cx - circleRadius * 0.6} ${circleCenter + circleRadius * 0.6}
    A ${circleRadius} ${circleRadius} 0 1 1 ${cx + circleRadius * 0.6} ${circleCenter + circleRadius * 0.6}
    Z
  `
  
  return (
    <g>
      {/* Droplet shape */}
      <path
        d={dropletPath}
        fill="#ffffff"
        stroke="#1e88e5"
        strokeWidth={2}
        style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))' }}
      />
      {/* Emoji in the circular part */}
      <text
        x={cx}
        y={circleCenter}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fill="#1e88e5"
      >
        {payload.milestone.emoji}
      </text>
    </g>
  )
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

  // Enhanced data with milestone information and p95 values
  const enhancedData = useMemo(() => {
    const milestoneMap = new Map<number, ChartMilestone>()
    milestones.forEach(milestone => {
      milestoneMap.set(milestone.year, milestone)
    })

    return data.map(point => {
      // Only show milestones on the first month of the year (month % 12 === 1)
      const isFirstMonthOfYear = point.month % 12 === 1
      const milestone = milestoneMap.get(point.year)
      
      return {
        ...point,
        p95: point.p5 + point.band,
        milestone: (isFirstMonthOfYear && milestone) ? milestone : null
      }
    })
  }, [data, milestones])

  return (
    <div className="panel chart-card">
      <div className="chart-card__header">
        <div style={{ fontWeight: 600 }}>{title ?? "Projection"}</div>
      </div>
      <div className="chart-card__body">
        <ResponsiveContainer>
          <ComposedChart data={enhancedData} margin={{ left: 16, right: 16, top: 16, bottom: 36 }}>
            <defs>
              <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.65} />
                <stop offset="95%" stopColor="#bae6fd" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="year" ticks={yearTicks(enhancedData)} tickLine={false} axisLine={false} dy={8} />
            <YAxis
              tickFormatter={(value: number) => compactFormatter.format(value)}
              width={88}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TooltipContent format={currencyFormatter.format} milestones={milestones} />} cursor={{ stroke: "#94a3b8", strokeDasharray: "4 4" }} />
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
            <Area type="monotone" dataKey="p5" stroke="#93c5fd" strokeWidth={2} fillOpacity={0} dot={false} stackId="band" />
            <Area 
              type="monotone" 
              dataKey="band" 
              stroke="#1e88e5" 
              strokeWidth={2} 
              fill="url(#colorBand)" 
              dot={false}
              stackId="band" 
            />
            <Area type="monotone" dataKey="p50" stroke="#0ea5e9" strokeWidth={2.4} fillOpacity={0} dot={false} />
            <Line 
              type="monotone" 
              dataKey="p95" 
              stroke="transparent" 
              strokeWidth={0} 
              dot={<MilestoneDroplet />}
            />
          </ComposedChart>
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
  milestones: ChartMilestone[]
}

function TooltipContent({ active, payload, label, format, milestones }: TooltipProps) {
  if (!active || !payload?.length) return null
  const year = Number(label)
  const p5 = Number(payload.find((p: any) => p.dataKey === "p5")?.value ?? 0)
  const band = Number(payload.find((p: any) => p.dataKey === "band")?.value ?? 0)
  const p95 = p5 + band
  const p50 = Number(payload.find((p: any) => p.dataKey === "p50")?.value ?? 0)
  
  // Find milestones for this year
  const yearMilestones = milestones.filter(m => m.year === year)
  
  return (
    <div className="tooltip-card">
      <div className="label" style={{ marginBottom: 4 }}>{year}</div>
      <div><strong>Median:</strong> {format(p50)}</div>
      <div><strong>Range:</strong> {format(p5)} to {format(p95)}</div>
      {yearMilestones.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
          {yearMilestones.map((milestone, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span style={{ fontSize: "14px" }}>{milestone.emoji}</span>
              <span style={{ fontSize: "13px", color: "#64748b" }}>{milestone.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

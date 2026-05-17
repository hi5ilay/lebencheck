'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'

interface HistoryPoint {
  date: string
  prices: Record<string, number>
}

interface PriceDropAreaChartProps {
  history: HistoryPoint[]
}

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`
  return dateStr
}

function getCheapestPrice(prices: Record<string, number>): number {
  const vals = Object.values(prices).filter((v) => v > 0)
  return vals.length ? Math.min(...vals) : 0
}

interface ChartPoint {
  date: string
  baseline: number
  cheapest: number
  drop: boolean
}

const DROP_THRESHOLD = 0.05 // 5%

export default function PriceDropAreaChart({ history }: PriceDropAreaChartProps) {
  if (!history || history.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
        אין נתוני היסטוריה
      </div>
    )
  }

  // Baseline = average cheapest price of first 7 days
  const firstWeek = history.slice(0, 7)
  const baselineAvg =
    firstWeek.reduce((sum, p) => sum + getCheapestPrice(p.prices), 0) /
    Math.max(firstWeek.length, 1)

  const chartData: ChartPoint[] = history.map((point) => {
    const cheapest = getCheapestPrice(point.prices)
    const pctDrop = baselineAvg > 0 ? (baselineAvg - cheapest) / baselineAvg : 0
    return {
      date: formatDateShort(point.date),
      baseline: parseFloat(baselineAvg.toFixed(2)),
      cheapest: parseFloat(cheapest.toFixed(2)),
      drop: pctDrop >= DROP_THRESHOLD,
    }
  })

  const dropPoints = chartData.filter((p) => p.drop)
  const allVals = chartData.flatMap((p) => [p.baseline, p.cheapest])
  const yMin = Math.max(0, Math.min(...allVals) - 0.5)
  const yMax = Math.max(...allVals) + 0.5

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-3 flex items-center gap-6 justify-center text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-200" />
          <span className="text-gray-600">קו בסיס (שבוע ראשון)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-400" />
          <span className="text-gray-600">מחיר זול ביותר</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-200" />
          <span className="text-gray-600">חיסכון</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 16, left: 8, bottom: 8 }}
        >
          <defs>
            <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#BFDBFE" stopOpacity={0.5} />
              <stop offset="95%" stopColor="#BFDBFE" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[parseFloat(yMin.toFixed(2)), parseFloat(yMax.toFixed(2))]}
            tickFormatter={(v: number) => `₪${v.toFixed(1)}`}
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              `₪${(value as number).toFixed(2)}`,
              (name as string) === 'baseline' ? 'קו בסיס' : 'הזול ביותר',
            ]}
            contentStyle={{
              fontFamily: 'Heebo, sans-serif',
              fontSize: 13,
              direction: 'rtl',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
            }}
          />
          {/* Baseline area */}
          <Area
            type="monotone"
            dataKey="baseline"
            stroke="#93C5FD"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            fill="url(#baselineGrad)"
            dot={false}
            isAnimationActive
            animationDuration={900}
          />
          {/* Cheapest price area — fills up to baseline creating savings viz */}
          <Area
            type="monotone"
            dataKey="cheapest"
            stroke="#10B981"
            strokeWidth={2.5}
            fill="url(#savingsGrad)"
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
          {/* Mark significant drops */}
          {dropPoints.map((p, i) => (
            <ReferenceLine
              key={`drop-${i}`}
              x={p.date}
              stroke="#10B981"
              strokeDasharray="3 2"
              strokeWidth={1}
              label={{
                value: '↓',
                position: 'top',
                fontSize: 14,
                fill: '#059669',
              }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

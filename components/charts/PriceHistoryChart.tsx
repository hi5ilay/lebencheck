'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { CHAIN_COLORS, CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'
import PriceTooltip from '@/components/charts/PriceTooltip'

interface HistoryPoint {
  date: string
  prices: Record<string, number>
}

interface PriceHistoryChartProps {
  data: HistoryPoint[]
  selectedRange: '7d' | '30d' | '90d'
}

const CHAINS = Object.keys(CHAIN_COLORS)

function formatDateShort(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}`
  }
  return dateStr
}

function filterByRange(data: HistoryPoint[], range: '7d' | '30d' | '90d'): HistoryPoint[] {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  return data.slice(-days)
}

export default function PriceHistoryChart({ data, selectedRange }: PriceHistoryChartProps) {
  const filtered = filterByRange(data, selectedRange)

  // Flatten: each point has { date, shufersal, ramiLevy, ... }
  const chartData = filtered.map((point) => ({
    date: formatDateShort(point.date),
    ...point.prices,
  }))

  // Compute Y domain: min - 0.50 to max + 0.50
  const allValues = filtered.flatMap((p) => Object.values(p.prices)).filter(Boolean)
  const minVal = allValues.length ? Math.min(...allValues) - 0.5 : 0
  const maxVal = allValues.length ? Math.max(...allValues) + 0.5 : 10
  const yMin = Math.max(0, parseFloat(minVal.toFixed(2)))

  const renderLegend = () => (
    <div dir="rtl" className="flex flex-wrap justify-center gap-3 mt-2">
      {CHAINS.map((chain) => (
        <span key={chain} className="flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: CHAIN_COLORS[chain] }}
          />
          {CHAIN_NAMES_DISPLAY[chain]}
        </span>
      ))}
    </div>
  )

  return (
    <div className="w-full" dir="rtl">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 16, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[yMin, parseFloat(maxVal.toFixed(2))]}
            tickFormatter={(v: number) => `₪${v.toFixed(1)}`}
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip content={<PriceTooltip />} />
          {CHAINS.map((chain) => (
            <Line
              key={chain}
              type="monotone"
              dataKey={chain}
              name={CHAIN_NAMES_DISPLAY[chain]}
              stroke={CHAIN_COLORS[chain]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              connectNulls
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-out"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      {renderLegend()}
    </div>
  )
}

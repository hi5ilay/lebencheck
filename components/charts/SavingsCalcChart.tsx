'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import { CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'

interface ChainCost {
  chain: string
  chainName: string
  monthlyCost: number
}

interface SavingsCalcChartProps {
  chainCosts: ChainCost[]
}

export default function SavingsCalcChart({ chainCosts }: SavingsCalcChartProps) {
  if (!chainCosts || chainCosts.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
        בחר מוצרים לחישוב
      </div>
    )
  }

  const sorted = [...chainCosts].sort((a, b) => a.monthlyCost - b.monthlyCost)
  const cheapestCost = sorted[0]?.monthlyCost ?? 0

  const chartData = sorted.map((c) => ({
    name: CHAIN_NAMES_DISPLAY[c.chain] ?? c.chainName,
    chain: c.chain,
    cost: parseFloat(c.monthlyCost.toFixed(2)),
    isCheapest: c.monthlyCost === cheapestCost,
  }))

  const maxCost = Math.max(...chartData.map((d) => d.cost))
  const yMax = maxCost > 0 ? maxCost * 1.15 : 100

  return (
    <div className="w-full" dir="rtl">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart
          data={chartData}
          margin={{ top: 28, right: 16, left: 8, bottom: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12, fill: '#374151', fontFamily: 'Heebo, sans-serif', fontWeight: 600 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, parseFloat(yMax.toFixed(2))]}
            tickFormatter={(v: number) => `₪${v}`}
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          <Tooltip
            formatter={(value: unknown) => [
              `₪${(value as number).toFixed(2)}`,
              'הוצאה חודשית',
            ]}
            contentStyle={{
              fontFamily: 'Heebo, sans-serif',
              fontSize: 13,
              direction: 'rtl',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
            }}
          />
          <Bar
            dataKey="cost"
            name="cost"
            radius={[6, 6, 0, 0]}
            maxBarSize={64}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.isCheapest ? '#10B981' : '#93C5FD'}
              />
            ))}
            <LabelList
              dataKey="cost"
              position="top"
              formatter={(v: unknown) => `₪${(v as number).toFixed(0)}`}
              style={{ fontSize: 11, fontFamily: 'Heebo, sans-serif', fontWeight: 700 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

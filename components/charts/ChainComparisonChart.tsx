'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { PriceEntry } from '@/lib/types'
import { CHAIN_COLORS, CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'

interface ChainComparisonChartProps {
  entries: PriceEntry[]
}

interface ChartRow {
  name: string
  prices: Record<string, number>
  cheapestChain: string
  average: number
}

const CHAINS = Object.keys(CHAIN_COLORS)

function buildChartData(entries: PriceEntry[]): ChartRow[] {
  const byProduct = new Map<string, PriceEntry[]>()
  for (const e of entries) {
    const key = e.product.id
    if (!byProduct.has(key)) byProduct.set(key, [])
    byProduct.get(key)!.push(e)
  }

  const rows: ChartRow[] = []
  for (const [, group] of byProduct) {
    const prices: Record<string, number> = {}
    for (const e of group) {
      if (!prices[e.chain] || e.price < prices[e.chain]) {
        prices[e.chain] = e.price
      }
    }
    const vals = Object.values(prices)
    const average = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
    const cheapestChain = Object.entries(prices).sort(([, a], [, b]) => a - b)[0]?.[0] ?? ''
    rows.push({
      name: group[0].product.displayName,
      prices,
      cheapestChain,
      average,
    })
  }
  return rows.slice(0, 8)
}

// Flatten to recharts format: { name, shufersal, ramiLevy, ... }
function flattenRows(rows: ChartRow[]) {
  return rows.map((r) => ({
    name: r.name,
    cheapestChain: r.cheapestChain,
    average: r.average,
    ...r.prices,
  }))
}

const nationalAvg = (rows: ChartRow[]): number => {
  const all = rows.flatMap((r) => Object.values(r.prices))
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0
}

interface CustomLabelProps {
  x?: number
  y?: number
  width?: number
  value?: number
  chain?: string
  cheapestChain?: string
}

function PriceLabel({ x = 0, y = 0, width = 0, value, chain, cheapestChain }: CustomLabelProps) {
  if (!value) return null
  const isCheapest = chain === cheapestChain
  return (
    <g>
      <text
        x={x + width / 2}
        y={y - 6}
        textAnchor="middle"
        fontSize={10}
        fontFamily="Heebo, sans-serif"
        fill={isCheapest ? '#059669' : '#374151'}
        fontWeight={isCheapest ? '700' : '400'}
      >
        ₪{value.toFixed(2)}
      </text>
      {isCheapest && (
        <text
          x={x + width / 2}
          y={y - 16}
          textAnchor="middle"
          fontSize={8}
          fontFamily="Heebo, sans-serif"
          fill="#059669"
          fontWeight="600"
        >
          הזול ביותר
        </text>
      )}
    </g>
  )
}

export default function ChainComparisonChart({ entries }: ChainComparisonChartProps) {
  const rows = buildChartData(entries)
  const chartData = flattenRows(rows)
  const avgLine = nationalAvg(rows)

  if (chartData.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-400 text-sm">
        אין נתונים להצגה
      </div>
    )
  }

  return (
    <div className="w-full" dir="rtl">
      <ResponsiveContainer width="100%" height={380}>
        <BarChart
          data={chartData}
          margin={{ top: 32, right: 16, left: 8, bottom: 60 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            interval={0}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tickFormatter={(v: number) => `₪${v}`}
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              `₪${(value as number).toFixed(2)}`,
              CHAIN_NAMES_DISPLAY[name as string] ?? (name as string),
            ]}
            contentStyle={{
              fontFamily: 'Heebo, sans-serif',
              fontSize: 13,
              direction: 'rtl',
              borderRadius: 12,
              border: '1px solid #e5e7eb',
            }}
          />
          {avgLine > 0 && (
            <ReferenceLine
              y={avgLine}
              stroke="#1E3A8A"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{
                value: `ממוצע ₪${avgLine.toFixed(2)}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#1E3A8A',
                fontFamily: 'Heebo, sans-serif',
              }}
            />
          )}
          {CHAINS.map((chain) => (
            <Bar
              key={chain}
              dataKey={chain}
              name={chain}
              fill={CHAIN_COLORS[chain]}
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
              isAnimationActive
              animationDuration={700}
              animationEasing="ease-out"
            >
              {chartData.map((entry, idx) => (
                <Cell
                  key={`cell-${idx}`}
                  fill={
                    entry.cheapestChain === chain
                      ? '#10B981'
                      : CHAIN_COLORS[chain]
                  }
                />
              ))}
              <LabelList
                content={(props) => (
                  <PriceLabel
                    {...(props as CustomLabelProps)}
                    chain={chain}
                    cheapestChain={chartData[(props as { index?: number }).index ?? 0]?.cheapestChain}
                  />
                )}
              />
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
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
    </div>
  )
}

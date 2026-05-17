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
import type { PriceEntry } from '@/lib/types'

interface EilatPremiumChartProps {
  nationalEntries: PriceEntry[]
  eilatEntries: PriceEntry[]
}

interface ChartRow {
  name: string
  national: number
  eilat: number
  premium: number
}

function buildRows(national: PriceEntry[], eilat: PriceEntry[]): ChartRow[] {
  const nationalByProduct = new Map<string, number[]>()
  for (const e of national) {
    if (!nationalByProduct.has(e.product.id)) nationalByProduct.set(e.product.id, [])
    nationalByProduct.get(e.product.id)!.push(e.price)
  }

  const eilatByProduct = new Map<string, number[]>()
  for (const e of eilat) {
    if (!eilatByProduct.has(e.product.id)) eilatByProduct.set(e.product.id, [])
    eilatByProduct.get(e.product.id)!.push(e.price)
  }

  const rows: ChartRow[] = []
  for (const [productId, natPrices] of nationalByProduct) {
    const eilatPrices = eilatByProduct.get(productId)
    if (!eilatPrices || eilatPrices.length === 0) continue

    const natAvg = natPrices.reduce((a, b) => a + b, 0) / natPrices.length
    const eilAvg = eilatPrices.reduce((a, b) => a + b, 0) / eilatPrices.length
    const premium = natAvg > 0 ? ((eilAvg - natAvg) / natAvg) * 100 : 0

    // Get display name from national entries
    const entry = national.find((e) => e.product.id === productId)
    rows.push({
      name: entry?.product.displayName ?? productId,
      national: parseFloat(natAvg.toFixed(2)),
      eilat: parseFloat(eilAvg.toFixed(2)),
      premium: parseFloat(premium.toFixed(1)),
    })
  }

  return rows.slice(0, 8)
}

interface PremiumLabelProps {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  index?: number
  data?: ChartRow[]
  isEilat?: boolean
}

function PremiumOverlay({ x = 0, y = 0, height = 0, index = 0, data = [] }: PremiumLabelProps) {
  const row = data[index]
  if (!row || row.premium <= 0) return null
  return (
    <text
      x={x + 8}
      y={y + height / 2 + 4}
      fontSize={10}
      fontFamily="Heebo, sans-serif"
      fill="#fff"
      fontWeight="700"
    >
      +{row.premium.toFixed(1)}% יקר יותר באילת
    </text>
  )
}

export default function EilatPremiumChart({ nationalEntries, eilatEntries }: EilatPremiumChartProps) {
  const rows = buildRows(nationalEntries, eilatEntries)

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
        אין נתוני אילת להשוואה
      </div>
    )
  }

  return (
    <div className="w-full" dir="rtl">
      <div className="mb-3 flex items-center gap-4 justify-center text-sm">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#1E3A8A' }} />
          <span className="text-gray-600">ממוצע ארצי</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#F4A261' }} />
          <span className="text-gray-600">ממוצע אילת</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={rows.length * 72 + 40}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 8, right: 80, left: 8, bottom: 8 }}
          barCategoryGap="30%"
          barGap={4}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v: number) => `₪${v}`}
            tick={{ fontSize: 11, fill: '#6b7280', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={130}
            tick={{ fontSize: 11, fill: '#374151', fontFamily: 'Heebo, sans-serif' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: unknown, name: unknown) => [
              `₪${(value as number).toFixed(2)}`,
              (name as string) === 'national' ? 'ממוצע ארצי' : 'ממוצע אילת',
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
            dataKey="national"
            name="national"
            fill="#1E3A8A"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive
            animationDuration={700}
          >
            <LabelList
              dataKey="national"
              position="right"
              formatter={(v: unknown) => `₪${(v as number).toFixed(2)}`}
              style={{ fontSize: 11, fontFamily: 'Heebo, sans-serif', fill: '#374151' }}
            />
          </Bar>
          <Bar
            dataKey="eilat"
            name="eilat"
            fill="#F4A261"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            isAnimationActive
            animationDuration={900}
          >
            {rows.map((row, index) => (
              <Cell key={`eilat-${index}`} fill={row.premium > 0 ? '#F4A261' : '#10B981'} />
            ))}
            <LabelList
              content={(props) => {
                const { x = 0, y = 0, width = 0, height = 0, index = 0 } = props as PremiumLabelProps
                const row = rows[index]
                if (!row) return null
                const labelX = (x as number) + (width as number) + 6
                return (
                  <g>
                    <text
                      x={labelX}
                      y={(y as number) + (height as number) / 2 + 4}
                      fontSize={10}
                      fontFamily="Heebo, sans-serif"
                      fill={row.premium > 0 ? '#D97706' : '#059669'}
                      fontWeight="700"
                    >
                      {row.premium > 0
                        ? `+${row.premium.toFixed(1)}%`
                        : `${row.premium.toFixed(1)}%`}
                    </text>
                  </g>
                )
              }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

'use client'

import { CHAIN_COLORS, CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'
import type { TooltipContentProps } from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'

interface PriceTooltipProps extends Partial<TooltipContentProps<ValueType, NameType>> {
  label?: string | number
}

export default function PriceTooltip({ active, payload, label }: PriceTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  const validEntries = payload
    .filter((p) => p.value != null && typeof p.value === 'number')
    .map((p) => ({
      chain: String(p.dataKey ?? ''),
      name: CHAIN_NAMES_DISPLAY[String(p.dataKey ?? '')] ?? String(p.name ?? ''),
      value: p.value as number,
      color: CHAIN_COLORS[String(p.dataKey ?? '')] ?? p.color ?? '#888',
    }))
    .sort((a, b) => a.value - b.value)

  const cheapest = validEntries[0]

  const formatDate = (d: string | number) => {
    if (!d) return ''
    const str = String(d)
    if (str.includes('-')) {
      const [, m, day] = str.split('-')
      return `${day}/${m}`
    }
    return str
  }

  return (
    <div
      dir="rtl"
      className="rounded-xl border border-gray-200 bg-white shadow-xl"
      style={{ minWidth: 180, padding: '12px 16px' }}
    >
      {label != null && (
        <p className="mb-2 text-xs font-semibold text-gray-500 border-b border-gray-100 pb-1">
          {formatDate(label)}
        </p>
      )}
      <ul className="space-y-1">
        {validEntries.map((entry) => {
          const isCheapest = entry.chain === cheapest.chain
          return (
            <li
              key={entry.chain}
              className={`flex items-center justify-between gap-4 text-sm rounded-md px-2 py-0.5 ${
                isCheapest ? 'bg-emerald-50' : ''
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className={isCheapest ? 'font-semibold text-emerald-700' : 'text-gray-700'}>
                  {entry.name}
                </span>
              </span>
              <span
                className={`font-bold tabular-nums ${isCheapest ? 'text-emerald-600' : 'text-gray-800'}`}
              >
                ₪{entry.value.toFixed(2)}
                {isCheapest && (
                  <span className="mr-1 text-xs font-medium text-emerald-500"> ★</span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

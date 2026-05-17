'use client'

import { useEffect, useState } from 'react'
import type { PriceEntry } from '@/lib/types'
import { CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'
import clsx from 'clsx'

interface HistoryPoint {
  date: string
  prices: Record<string, number>
}

interface DealCardProps {
  entries: PriceEntry[]
  history: HistoryPoint[]
}

interface Deal {
  productName: string
  chainName: string
  currentPrice: number
  previousPrice: number
  dropPct: number
}

function computeDeal(entries: PriceEntry[], history: HistoryPoint[]): Deal | null {
  if (!history || history.length < 7) return null
  if (!entries || entries.length === 0) return null

  // Get price 7 days ago (or earliest available)
  const sevenDaysAgo = history[Math.max(0, history.length - 8)]
  const today = history[history.length - 1]

  if (!sevenDaysAgo || !today) return null

  let bestDeal: Deal | null = null
  let maxDrop = 0

  for (const entry of entries) {
    const prevPrice = sevenDaysAgo.prices[entry.chain]
    const curPrice = today.prices[entry.chain] ?? entry.price
    if (!prevPrice || !curPrice || prevPrice <= curPrice) continue

    const dropPct = ((prevPrice - curPrice) / prevPrice) * 100
    if (dropPct > maxDrop) {
      maxDrop = dropPct
      bestDeal = {
        productName: entry.product.displayName,
        chainName: CHAIN_NAMES_DISPLAY[entry.chain] ?? entry.chainName,
        currentPrice: curPrice,
        previousPrice: prevPrice,
        dropPct,
      }
    }
  }

  // Fallback: use entry prices vs history
  if (!bestDeal) {
    for (const entry of entries) {
      const prevPrice = sevenDaysAgo.prices[entry.chain]
      if (!prevPrice) continue
      const dropPct = ((prevPrice - entry.price) / prevPrice) * 100
      if (dropPct > maxDrop) {
        maxDrop = dropPct
        bestDeal = {
          productName: entry.product.displayName,
          chainName: CHAIN_NAMES_DISPLAY[entry.chain] ?? entry.chainName,
          currentPrice: entry.price,
          previousPrice: prevPrice,
          dropPct,
        }
      }
    }
  }

  return bestDeal
}

export default function DealCard({ entries, history }: DealCardProps) {
  const [pulsing, setPulsing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setPulsing(true)
      setTimeout(() => setPulsing(false), 800)
    }, 3000)
    return () => clearInterval(interval)
  }, [mounted])

  if (!mounted) {
    // Shimmer loading state
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
        <div className="mb-3 h-5 w-24 rounded-full bg-gray-200" />
        <div className="mb-2 h-7 w-48 rounded-lg bg-gray-200" />
        <div className="h-5 w-32 rounded-lg bg-gray-100" />
      </div>
    )
  }

  const deal = computeDeal(entries, history)

  if (!deal) {
    // Shimmer / placeholder when no deal found
    return (
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-6 shadow-sm">
        <div className="mb-1 text-xs font-semibold uppercase tracking-widest text-emerald-600">
          עסקת היום
        </div>
        <p className="text-gray-400 text-sm">אין ירידות מחירים ב-7 הימים האחרונים</p>
      </div>
    )
  }

  return (
    <div
      dir="rtl"
      className={clsx(
        'relative overflow-hidden rounded-2xl border-2 bg-white p-6 shadow-md transition-all duration-300',
        pulsing ? 'border-emerald-400 shadow-emerald-100 shadow-lg' : 'border-emerald-200',
      )}
    >
      {/* Pulsing ring */}
      {pulsing && (
        <span className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-emerald-300 ring-offset-1 animate-ping opacity-30" />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
          עסקת היום
        </span>
        <span className="rounded-full bg-emerald-500 px-3 py-1 text-sm font-bold text-white shadow-sm">
          ירידה של {deal.dropPct.toFixed(1)}%
        </span>
      </div>

      {/* Product info */}
      <h3 className="mb-1 text-xl font-bold text-gray-900 leading-tight">
        {deal.productName}
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        ב{deal.chainName}
      </p>

      {/* Price comparison */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-gray-400 mb-0.5">מחיר נוכחי</p>
          <p className="text-3xl font-black text-emerald-600 leading-none">
            ₪{deal.currentPrice.toFixed(2)}
          </p>
        </div>
        <div className="mb-1 text-gray-400 text-lg font-light">←</div>
        <div>
          <p className="text-xs text-gray-400 mb-0.5">לפני 7 ימים</p>
          <p className="text-xl font-semibold text-gray-400 line-through leading-none">
            ₪{deal.previousPrice.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Decorative accent */}
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 rounded-t-2xl" />
    </div>
  )
}

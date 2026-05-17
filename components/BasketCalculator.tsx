'use client'

import { useState, useMemo } from 'react'
import type { PriceEntry } from '@/lib/types'
import { CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'
import SavingsCalcChart from '@/components/charts/SavingsCalcChart'
import { isEilatStore } from '@/lib/parseProducts'
import clsx from 'clsx'

interface BasketCalculatorProps {
  entries: PriceEntry[]
}

interface BasketItem {
  productId: string
  displayName: string
  weeklyQty: number
}

const WEEKS_PER_MONTH = 4.33

function getUniqueProducts(entries: PriceEntry[]) {
  const seen = new Set<string>()
  const products: { id: string; displayName: string }[] = []
  for (const e of entries) {
    if (!seen.has(e.product.id) && !isEilatStore(e.storeCity)) {
      seen.add(e.product.id)
      products.push({ id: e.product.id, displayName: e.product.displayName })
    }
  }
  return products.sort((a, b) => a.displayName.localeCompare(b.displayName, 'he'))
}

function calcChainCosts(
  items: BasketItem[],
  entries: PriceEntry[],
): Array<{ chain: string; chainName: string; monthlyCost: number }> {
  // Build cheapest price per product per chain
  const priceMap = new Map<string, Map<string, number>>() // productId -> chainId -> price
  for (const e of entries) {
    if (isEilatStore(e.storeCity)) continue
    if (!priceMap.has(e.product.id)) priceMap.set(e.product.id, new Map())
    const chainMap = priceMap.get(e.product.id)!
    if (!chainMap.has(e.chain) || e.price < chainMap.get(e.chain)!) {
      chainMap.set(e.chain, e.price)
    }
  }

  // Get all chains
  const allChains = new Set<string>()
  for (const [, chainMap] of priceMap) {
    for (const chain of chainMap.keys()) allChains.add(chain)
  }

  const costs: Array<{ chain: string; chainName: string; monthlyCost: number }> = []
  for (const chain of allChains) {
    let weeklyCost = 0
    let hasAllItems = true
    for (const item of items) {
      if (item.weeklyQty === 0) continue
      const chainMap = priceMap.get(item.productId)
      if (!chainMap) { hasAllItems = false; break }
      const price = chainMap.get(chain)
      if (price == null) { hasAllItems = false; break }
      weeklyCost += price * item.weeklyQty
    }
    if (!hasAllItems) continue
    costs.push({
      chain,
      chainName: CHAIN_NAMES_DISPLAY[chain] ?? chain,
      monthlyCost: parseFloat((weeklyCost * WEEKS_PER_MONTH).toFixed(2)),
    })
  }

  return costs.sort((a, b) => a.monthlyCost - b.monthlyCost)
}

export default function BasketCalculator({ entries }: BasketCalculatorProps) {
  const products = useMemo(() => getUniqueProducts(entries), [entries])
  const [basket, setBasket] = useState<Map<string, BasketItem>>(new Map())

  const chainCosts = useMemo(() => {
    const items = Array.from(basket.values()).filter((i) => i.weeklyQty > 0)
    if (items.length === 0) return []
    return calcChainCosts(items, entries)
  }, [basket, entries])

  const maxSavings = useMemo(() => {
    if (chainCosts.length < 2) return 0
    return chainCosts[chainCosts.length - 1].monthlyCost - chainCosts[0].monthlyCost
  }, [chainCosts])

  function setQty(productId: string, displayName: string, qty: number) {
    setBasket((prev) => {
      const next = new Map(prev)
      if (qty <= 0) {
        next.delete(productId)
      } else {
        next.set(productId, { productId, displayName, weeklyQty: qty })
      }
      return next
    })
  }

  return (
    <div dir="rtl" className="space-y-8">
      {/* Product selector */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-bold text-gray-800">בחר מוצרים וכמויות שבועיות</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((product) => {
            const item = basket.get(product.id)
            const qty = item?.weeklyQty ?? 0
            return (
              <div
                key={product.id}
                className={clsx(
                  'flex items-center justify-between rounded-xl border px-4 py-3 transition-colors',
                  qty > 0
                    ? 'border-cobalt-200 bg-blue-50 border-blue-200'
                    : 'border-gray-100 bg-gray-50',
                )}
              >
                <span className="text-sm font-medium text-gray-800 flex-1 ml-3">
                  {product.displayName}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(product.id, product.displayName, Math.max(0, qty - 1))}
                    className={clsx(
                      'h-7 w-7 rounded-full text-lg font-bold leading-none transition-colors',
                      qty > 0
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed',
                    )}
                    disabled={qty === 0}
                    aria-label="הפחת"
                  >
                    −
                  </button>
                  <span
                    className={clsx(
                      'w-6 text-center text-sm font-bold tabular-nums',
                      qty > 0 ? 'text-blue-800' : 'text-gray-400',
                    )}
                  >
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(product.id, product.displayName, qty + 1)}
                    className="h-7 w-7 rounded-full bg-blue-700 text-white text-lg font-bold leading-none hover:bg-blue-800 transition-colors"
                    aria-label="הוסף"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        {basket.size === 0 && (
          <p className="mt-4 text-center text-sm text-gray-400">
            לחץ + ליד מוצר להוספה לסל
          </p>
        )}
      </div>

      {/* Results */}
      {chainCosts.length > 0 && (
        <>
          {/* Savings headline */}
          {maxSavings > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 text-white shadow-md">
              <p className="mb-1 text-sm font-medium opacity-80">החיסכון החודשי שלך</p>
              <p className="text-4xl font-black tracking-tight">
                ₪{maxSavings.toFixed(2)}
              </p>
              <p className="mt-1 text-sm opacity-70">
                בין {chainCosts[0].chainName} ל-{chainCosts[chainCosts.length - 1].chainName}
              </p>
            </div>
          )}

          {/* Chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-gray-800">עלות חודשית לפי רשת</h2>
            <SavingsCalcChart chainCosts={chainCosts} />
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    רשת
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    עלות שבועית
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    עלות חודשית
                  </th>
                  <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    יחסי
                  </th>
                </tr>
              </thead>
              <tbody>
                {chainCosts.map((c, i) => {
                  const isCheapest = i === 0
                  const diff = c.monthlyCost - chainCosts[0].monthlyCost
                  return (
                    <tr
                      key={c.chain}
                      className={clsx(
                        'border-b border-gray-50',
                        isCheapest && 'bg-emerald-50/70',
                      )}
                    >
                      <td className="px-5 py-3.5 font-semibold text-gray-800">
                        {c.chainName}
                        {isCheapest && (
                          <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            הזול ביותר
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums text-gray-600">
                        ₪{(c.monthlyCost / WEEKS_PER_MONTH).toFixed(2)}
                      </td>
                      <td
                        className={clsx(
                          'px-5 py-3.5 tabular-nums font-bold',
                          isCheapest ? 'text-emerald-600' : 'text-gray-800',
                        )}
                      >
                        ₪{c.monthlyCost.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        {diff > 0 ? (
                          <span className="text-xs font-medium text-red-600">
                            +₪{diff.toFixed(2)} יותר
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-600">הכי זול</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

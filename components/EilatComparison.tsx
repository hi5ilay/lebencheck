'use client'

import type { PriceEntry } from '@/lib/types'
import { CHAIN_NAMES_DISPLAY } from '@/components/charts/ChartTheme'
import EilatPremiumChart from '@/components/charts/EilatPremiumChart'
import clsx from 'clsx'

interface EilatComparisonProps {
  nationalEntries: PriceEntry[]
  eilatEntries: PriceEntry[]
}

interface ComparisonRow {
  productId: string
  displayName: string
  nationalAvg: number
  eilatAvg: number
  premiumPct: number
  nationalCheapest: { chain: string; price: number } | null
  eilatCheapest: { chain: string; price: number } | null
}

function buildRows(national: PriceEntry[], eilat: PriceEntry[]): ComparisonRow[] {
  const natByProduct = new Map<string, PriceEntry[]>()
  for (const e of national) {
    if (!natByProduct.has(e.product.id)) natByProduct.set(e.product.id, [])
    natByProduct.get(e.product.id)!.push(e)
  }

  const eilatByProduct = new Map<string, PriceEntry[]>()
  for (const e of eilat) {
    if (!eilatByProduct.has(e.product.id)) eilatByProduct.set(e.product.id, [])
    eilatByProduct.get(e.product.id)!.push(e)
  }

  const rows: ComparisonRow[] = []
  for (const [productId, natEntries] of natByProduct) {
    const eilatProd = eilatByProduct.get(productId)
    if (!eilatProd || eilatProd.length === 0) continue

    const natAvg =
      natEntries.reduce((s, e) => s + e.price, 0) / natEntries.length
    const eilatAvg =
      eilatProd.reduce((s, e) => s + e.price, 0) / eilatProd.length
    const premiumPct = natAvg > 0 ? ((eilatAvg - natAvg) / natAvg) * 100 : 0

    const natCheapest = natEntries.sort((a, b) => a.price - b.price)[0]
    const eilatCheapest = eilatProd.sort((a, b) => a.price - b.price)[0]

    rows.push({
      productId,
      displayName: natEntries[0].product.displayName,
      nationalAvg: parseFloat(natAvg.toFixed(2)),
      eilatAvg: parseFloat(eilatAvg.toFixed(2)),
      premiumPct: parseFloat(premiumPct.toFixed(1)),
      nationalCheapest: natCheapest
        ? { chain: natCheapest.chain, price: natCheapest.price }
        : null,
      eilatCheapest: eilatCheapest
        ? { chain: eilatCheapest.chain, price: eilatCheapest.price }
        : null,
    })
  }

  return rows.sort((a, b) => b.premiumPct - a.premiumPct)
}

export default function EilatComparison({ nationalEntries, eilatEntries }: EilatComparisonProps) {
  const rows = buildRows(nationalEntries, eilatEntries)

  return (
    <div dir="rtl" className="space-y-10">
      {/* Comparison table */}
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  מוצר
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  ממוצע ארצי
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  ממוצע אילת
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  פרמיית אילת
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.productId}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3.5 font-semibold text-gray-800">
                    {row.displayName}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="tabular-nums font-bold text-blue-800">
                      ₪{row.nationalAvg.toFixed(2)}
                    </div>
                    {row.nationalCheapest && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        הזול:{' '}
                        {CHAIN_NAMES_DISPLAY[row.nationalCheapest.chain] ??
                          row.nationalCheapest.chain}{' '}
                        ₪{row.nationalCheapest.price.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="tabular-nums font-bold text-amber-700">
                      ₪{row.eilatAvg.toFixed(2)}
                    </div>
                    {row.eilatCheapest && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        הזול:{' '}
                        {CHAIN_NAMES_DISPLAY[row.eilatCheapest.chain] ??
                          row.eilatCheapest.chain}{' '}
                        ₪{row.eilatCheapest.price.toFixed(2)}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <span
                      className={clsx(
                        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
                        row.premiumPct > 0
                          ? 'bg-red-100 text-red-700'
                          : row.premiumPct < 0
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {row.premiumPct > 0 ? '+' : ''}
                      {row.premiumPct.toFixed(1)}%
                      {row.premiumPct > 0 && <span className="mr-1">יקר יותר</span>}
                      {row.premiumPct < 0 && <span className="mr-1">זול יותר</span>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400 text-sm rounded-2xl border border-gray-100 bg-white">
          אין נתוני אילת לפי הסינון הנוכחי
        </div>
      )}

      {/* Chart section */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-6 text-lg font-bold text-gray-800">
          השוואת מחירים גרפית: ארצי לעומת אילת
        </h2>
        {/* Israel flag accent strip */}
        <div className="mb-5 h-0.5 w-full rounded-full bg-gradient-to-r from-blue-700 via-white to-blue-700" />
        <EilatPremiumChart
          nationalEntries={nationalEntries}
          eilatEntries={eilatEntries}
        />
      </div>
    </div>
  )
}

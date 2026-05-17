'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { PriceEntry } from '@/lib/types'
import { CHAIN_NAMES_DISPLAY, CHAIN_COLORS } from '@/components/charts/ChartTheme'
import { isEilatStore } from '@/lib/parseProducts'
import clsx from 'clsx'

interface PriceTableProps {
  entries: PriceEntry[]
  showEilatOnly?: boolean
}

interface ProductGroup {
  productId: string
  displayName: string
  rows: PriceEntry[]
  cheapestPrice: number
  cheapestChain: string
}

function groupAndSort(entries: PriceEntry[], eilatOnly: boolean): ProductGroup[] {
  const filtered = eilatOnly
    ? entries.filter((e) => isEilatStore(e.storeCity))
    : entries.filter((e) => !isEilatStore(e.storeCity))

  const byProduct = new Map<string, PriceEntry[]>()
  for (const e of filtered) {
    if (!byProduct.has(e.product.id)) byProduct.set(e.product.id, [])
    byProduct.get(e.product.id)!.push(e)
  }

  const groups: ProductGroup[] = []
  for (const [productId, rows] of byProduct) {
    // De-duplicate: keep cheapest per chain
    const byChain = new Map<string, PriceEntry>()
    for (const r of rows) {
      if (!byChain.has(r.chain) || r.price < byChain.get(r.chain)!.price) {
        byChain.set(r.chain, r)
      }
    }
    const deduped = Array.from(byChain.values()).sort((a, b) => a.price - b.price)
    const cheapestPrice = deduped[0]?.price ?? 0
    const cheapestChain = deduped[0]?.chain ?? ''
    groups.push({
      productId,
      displayName: rows[0].product.displayName,
      rows: deduped,
      cheapestPrice,
      cheapestChain,
    })
  }

  return groups.sort((a, b) => a.displayName.localeCompare(b.displayName, 'he'))
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
  } catch {
    return iso
  }
}

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
}

export default function PriceTable({ entries, showEilatOnly = false }: PriceTableProps) {
  const groups = useMemo(
    () => groupAndSort(entries, showEilatOnly),
    [entries, showEilatOnly],
  )

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm" dir="rtl">
        אין נתונים להצגה
      </div>
    )
  }

  return (
    <div dir="rtl" className="w-full">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-100 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                מוצר
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                רשת
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                מחיר
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                מחיר/100מ"ל
              </th>
              <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                עודכן
              </th>
            </tr>
          </thead>
          <motion.tbody
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {groups.map((group, gIdx) =>
              group.rows.map((entry, rIdx) => {
                const isCheapest =
                  entry.chain === group.cheapestChain &&
                  entry.price === group.cheapestPrice

                return (
                  <motion.tr
                    key={`${entry.chain}-${group.productId}-${entry.price}`}
                    variants={itemVariants}
                    className={clsx(
                      'border-b border-gray-50 transition-colors hover:bg-gray-50',
                      isCheapest && 'bg-emerald-50/60',
                    )}
                  >
                    {rIdx === 0 ? (
                      <td
                        className="px-5 py-3 font-semibold text-gray-800"
                        rowSpan={group.rows.length}
                      >
                        {group.displayName}
                      </td>
                    ) : null}
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: CHAIN_COLORS[entry.chain] ?? '#888',
                          }}
                        />
                        <span className="text-gray-700">
                          {CHAIN_NAMES_DISPLAY[entry.chain] ?? entry.chainName}
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        key={`price-${entry.price}`}
                        className={clsx(
                          'font-bold tabular-nums transition-colors',
                          isCheapest ? 'text-emerald-600' : 'text-gray-800',
                        )}
                      >
                        ₪{entry.price.toFixed(2)}
                      </span>
                      {isCheapest && (
                        <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                          הזול ביותר
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 tabular-nums text-gray-500">
                      ₪{entry.pricePer100ml.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-gray-400 text-xs">
                      {formatDate(entry.updatedAt)}
                    </td>
                  </motion.tr>
                )
              }),
            )}
          </motion.tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <motion.div
        className="grid gap-3 md:hidden"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {groups.map((group) => (
          <motion.div
            key={group.productId}
            variants={itemVariants}
            className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
          >
            <div className="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
              <h3 className="font-bold text-sm text-gray-800">{group.displayName}</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {group.rows.map((entry) => {
                const isCheapest =
                  entry.chain === group.cheapestChain &&
                  entry.price === group.cheapestPrice
                return (
                  <div
                    key={`${entry.chain}-${entry.price}`}
                    className={clsx(
                      'flex items-center justify-between px-4 py-3',
                      isCheapest && 'bg-emerald-50/70',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CHAIN_COLORS[entry.chain] ?? '#888' }}
                      />
                      <span className="text-sm text-gray-700">
                        {CHAIN_NAMES_DISPLAY[entry.chain] ?? entry.chainName}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      {isCheapest && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                          הזול
                        </span>
                      )}
                      <span
                        key={`m-price-${entry.price}`}
                        className={clsx(
                          'font-bold tabular-nums',
                          isCheapest ? 'text-emerald-600' : 'text-gray-800',
                        )}
                      >
                        ₪{entry.price.toFixed(2)}
                      </span>
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

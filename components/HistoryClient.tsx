'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { PriceEntry } from '@/lib/types'
import PriceHistoryChart from '@/components/charts/PriceHistoryChart'
import ChainComparisonChart from '@/components/charts/ChainComparisonChart'
import PriceDropAreaChart from '@/components/charts/PriceDropAreaChart'
import clsx from 'clsx'

interface HistoryClientProps {
  history: Array<{ date: string; prices: Record<string, number> }>
  entries: PriceEntry[]
}

type Range = '7d' | '30d' | '90d'

const RANGE_LABELS: Record<Range, string> = {
  '7d': 'שבוע',
  '30d': 'חודש',
  '90d': '3 חודשים',
}

export default function HistoryClient({ history, entries }: HistoryClientProps) {
  const [range, setRange] = useState<Range>('30d')

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: 'Heebo, system-ui, sans-serif' }}
    >
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-black tracking-tight text-blue-900">
            לבןצ&#39;ק
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/" className="hover:text-blue-800 transition-colors">ראשי</Link>
            <Link href="/eilat" className="hover:text-blue-800 transition-colors">אילת</Link>
            <Link
              href="/calculator"
              className="rounded-full bg-blue-800 px-3 py-1.5 text-xs text-white hover:bg-blue-700 transition-colors"
            >
              מחשבון
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-blue-800" />
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-800">
              היסטוריה
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            מגמות מחירים לאורך זמן
          </h1>
          <p className="text-base text-gray-500">
            ראה כיצד השתנו מחירי הלבן ב-42 הימים האחרונים
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8">
        {/* Range toggle */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">טווח זמן:</span>
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
            {(Object.entries(RANGE_LABELS) as [Range, string][]).map(([r, label]) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={clsx(
                  'rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200',
                  range === r
                    ? 'bg-blue-800 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-800',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Price history line chart */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-800">מחירים לאורך זמן לפי רשת</h2>
          <p className="mb-5 text-sm text-gray-400">לבן גיל 1% 1 ליטר — ממוצע כל הרשתות</p>
          {history.length > 0 ? (
            <PriceHistoryChart data={history} selectedRange={range} />
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
              אין נתוני היסטוריה
            </div>
          )}
        </section>

        {/* Chain comparison bar chart */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-800">השוואת מחירים לפי רשת ומוצר</h2>
          <p className="mb-5 text-sm text-gray-400">המחיר הזול ביותר מסומן בירוק</p>
          <ChainComparisonChart entries={entries} />
        </section>

        {/* Price drop area chart */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-800">ירידות מחירים</h2>
          <p className="mb-5 text-sm text-gray-400">
            השטח הירוק מראה את החיסכון מול מחיר הבסיס. חץ ↓ = ירידה מעל 5%
          </p>
          {history.length > 0 ? (
            <PriceDropAreaChart history={history} />
          ) : (
            <div className="flex h-48 items-center justify-center text-gray-400 text-sm">
              אין נתוני היסטוריה
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

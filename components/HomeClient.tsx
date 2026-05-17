'use client'

import { useState } from 'react'
import type { PriceEntry } from '@/lib/types'
import PriceTable from '@/components/PriceTable'
import DealCard from '@/components/DealCard'
import Link from 'next/link'
import clsx from 'clsx'

interface HomeClientProps {
  entries: PriceEntry[]
  timestamp: string
  history: Array<{ date: string; prices: Record<string, number> }>
}

type View = 'national' | 'eilat'

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function HomeClient({ entries, timestamp, history }: HomeClientProps) {
  const [view, setView] = useState<View>('national')

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: 'Heebo, system-ui, sans-serif' }}
    >
      {/* Nav */}
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tight text-blue-900">לבןצ&#39;ק</span>
            <span className="hidden rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 sm:inline">
              בטא
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-600">
            <Link href="/history" className="hover:text-blue-800 transition-colors">
              היסטוריה
            </Link>
            <Link href="/eilat" className="hover:text-blue-800 transition-colors">
              אילת
            </Link>
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
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-blue-800" />
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-800">
              מחיר בזמן אמת
            </span>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-gray-900 sm:text-5xl">
            לבןצ&#39;ק
          </h1>
          <p className="mb-0 text-lg text-gray-500 max-w-md">
            מחירי לבן בישראל — בזמן אמת. השווה, חסוך, קנה חכם.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        {/* Deal of the day */}
        <DealCard entries={entries} history={history} />

        {/* Toggle */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-full border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setView('national')}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200',
                view === 'national'
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800',
              )}
            >
              כל הארץ
            </button>
            <button
              onClick={() => setView('eilat')}
              className={clsx(
                'rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200',
                view === 'eilat'
                  ? 'bg-blue-800 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-800',
              )}
            >
              אילת
            </button>
          </div>
          {view === 'eilat' && (
            <Link
              href="/eilat"
              className="text-xs text-blue-700 hover:underline font-medium"
            >
              השוואה מלאה ←
            </Link>
          )}
        </div>

        {/* Price table */}
        <PriceTable entries={entries} showEilatOnly={view === 'eilat'} />

        {/* Footer info */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs text-gray-400">
          <span>עדכון אחרון: {formatTimestamp(timestamp)}</span>
          <span>נתונים מהרשתות הגדולות בישראל</span>
        </div>
      </div>
    </main>
  )
}

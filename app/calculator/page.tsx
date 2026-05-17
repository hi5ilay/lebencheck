'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { getMockPrices } from '@/lib/fetchPrices'
import BasketCalculator from '@/components/BasketCalculator'

export default function CalculatorPage() {
  const snapshot = useMemo(() => getMockPrices(), [])

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
            <Link href="/history" className="hover:text-blue-800 transition-colors">היסטוריה</Link>
            <Link href="/eilat" className="hover:text-blue-800 transition-colors">אילת</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              מחשבון
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            מחשבון סל קניות
          </h1>
          <p className="max-w-lg text-base text-gray-500">
            בחר אילו מוצרי לבן אתה קונה בשבוע, ונגלה לך כמה תחסוך בקנייה ברשת הזולה ביותר.
            החישוב מבוסס על{' '}
            <span className="font-semibold text-gray-700">4.33 שבועות לחודש</span>.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        <BasketCalculator entries={snapshot.allEntries} />
      </div>
    </main>
  )
}

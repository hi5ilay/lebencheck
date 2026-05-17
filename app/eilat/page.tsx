import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import type { PriceSnapshot, PriceEntry } from '@/lib/types'
import { getMockPrices } from '@/lib/fetchPrices'
import { isEilatStore } from '@/lib/parseProducts'
import EilatComparison from '@/components/EilatComparison'
import Link from 'next/link'

export const revalidate = 21600

export const metadata: Metadata = {
  title: 'מחירים באילת לעומת הארץ — לבןצ\'ק',
  description: 'השוואת מחירי לבן בין אילת לשאר הארץ',
}

function loadPrices(): PriceSnapshot {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'prices.json')
    const raw = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as PriceSnapshot
  } catch {
    return getMockPrices()
  }
}

export default function EilatPage() {
  const snapshot = loadPrices()
  const allEntries: PriceEntry[] = snapshot.allEntries

  const nationalEntries = allEntries.filter((e) => !isEilatStore(e.storeCity))
  const eilatEntries = allEntries.filter((e) => isEilatStore(e.storeCity))

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
            <Link href="/" className="hover:text-blue-800 transition-colors">
              ראשי
            </Link>
            <Link href="/history" className="hover:text-blue-800 transition-colors">
              היסטוריה
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
        <div className="mx-auto max-w-5xl px-4 py-12">
          <div className="mb-2 flex items-center gap-2">
            <span className="h-1.5 w-8 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-600">
              אילת
            </span>
          </div>
          <h1 className="mb-2 text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
            מחירים באילת לעומת הארץ
          </h1>
          <p className="text-base text-gray-500">
            כמה יותר יקר לקנות לבן באילת? הנה התשובה.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {eilatEntries.length === 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 text-center">
            <p className="text-amber-700 font-medium">
              אין נתוני מחירים מאילת כרגע. נסה שוב מאוחר יותר.
            </p>
          </div>
        ) : (
          <EilatComparison
            nationalEntries={nationalEntries}
            eilatEntries={eilatEntries}
          />
        )}
      </div>
    </main>
  )
}

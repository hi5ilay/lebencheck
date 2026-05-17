import fs from 'fs'
import path from 'path'
import type { Metadata } from 'next'
import type { PriceSnapshot } from '@/lib/types'
import { getMockPrices } from '@/lib/fetchPrices'
import HistoryClient from '@/components/HistoryClient'

export const revalidate = 21600

export const metadata: Metadata = {
  title: 'היסטוריית מחירים — לבןצ\'ק',
  description: 'מגמות מחירי לבן לאורך זמן בכל הרשתות',
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

function loadHistory(): Array<{ date: string; prices: Record<string, number> }> {
  try {
    const filePath = path.join(process.cwd(), 'public', 'data', 'history.json')
    const raw = fs.readFileSync(filePath, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed.history ?? parsed
  } catch {
    return []
  }
}

export default function HistoryPage() {
  const history = loadHistory()
  const snapshot = loadPrices()

  return (
    <HistoryClient
      history={history}
      entries={snapshot.allEntries}
    />
  )
}

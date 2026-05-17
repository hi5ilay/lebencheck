import { NextResponse } from 'next/server'
import { fetchAllPrices, getMockPrices } from '@/lib/fetchPrices'
import { writeFile } from 'fs/promises'
import path from 'path'

export const revalidate = 21600

export async function GET() {
  try {
    let snapshot = await fetchAllPrices()

    // Fall back to mock if no real data fetched
    if (snapshot.allEntries.length === 0) {
      snapshot = getMockPrices()
    }

    const cachePath = path.join(process.cwd(), 'public', 'data', 'prices.json')
    await writeFile(cachePath, JSON.stringify(snapshot, null, 2), 'utf8')

    return NextResponse.json({
      success: true,
      timestamp: snapshot.timestamp,
      totalEntries: snapshot.allEntries.length,
      chains: snapshot.chains.map(c => ({ chain: c.chainId, entries: c.entries.length })),
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

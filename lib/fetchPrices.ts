import { XMLParser } from 'fast-xml-parser'
import * as zlib from 'zlib'
import { ChainId, PriceSnapshot, ChainData, PriceEntry } from './types'
import { parseRawItem, RawItem } from './parseProducts'

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })

interface FeedConfig {
  chainId: ChainId
  chainName: string
  indexUrl: string
  filePattern: RegExp
  itemsPath: string[]
  fieldMap: {
    itemName: string
    itemPrice: string
    itemCode?: string
    quantity?: string
    city?: string
  }
}

const FEEDS: FeedConfig[] = [
  {
    chainId: 'shufersal',
    chainName: 'שופרסל',
    indexUrl: 'https://prices.shufersal.co.il/',
    filePattern: /PriceFull.*\.gz$/i,
    itemsPath: ['root', 'Items', 'Item'],
    fieldMap: { itemName: 'ItemName', itemPrice: 'ItemPrice', itemCode: 'ItemCode', quantity: 'UnitQty', city: 'StoreCity' },
  },
  {
    chainId: 'ramiLevy',
    chainName: 'רמי לוי',
    indexUrl: 'https://url.retail.co.il/ramilevy/',
    filePattern: /PriceFull.*\.gz$/i,
    itemsPath: ['root', 'Items', 'Item'],
    fieldMap: { itemName: 'ItemName', itemPrice: 'ItemPrice', itemCode: 'ItemCode', quantity: 'UnitQty', city: 'StoreCity' },
  },
]

async function fetchGzippedXML(url: string): Promise<string> {
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buffer = Buffer.from(await res.arrayBuffer())
  try {
    return zlib.gunzipSync(buffer).toString('utf8')
  } catch {
    // Not gzipped, try raw
    return buffer.toString('utf8')
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string[]): unknown[] {
  let cur: unknown = obj
  for (const key of path) {
    if (cur && typeof cur === 'object' && !Array.isArray(cur)) {
      cur = (cur as Record<string, unknown>)[key]
    } else {
      return []
    }
  }
  return Array.isArray(cur) ? cur : cur ? [cur] : []
}

async function fetchChainIndexLinks(config: FeedConfig): Promise<string[]> {
  try {
    const res = await fetch(config.indexUrl, { next: { revalidate: 0 } })
    const html = await res.text()
    const links: string[] = []
    const regex = /href="([^"]*\.gz)"/gi
    let match
    while ((match = regex.exec(html)) !== null) {
      const href = match[1]
      if (config.filePattern.test(href)) {
        const url = href.startsWith('http') ? href : new URL(href, config.indexUrl).toString()
        links.push(url)
      }
    }
    return links.slice(0, 3) // limit to 3 files per chain for speed
  } catch {
    return []
  }
}

async function fetchChainData(config: FeedConfig): Promise<ChainData> {
  const entries: ReturnType<typeof parseRawItem>[] = []
  const updatedAt = new Date().toISOString()

  try {
    const links = await fetchChainIndexLinks(config)
    const fileLimit = links.slice(0, 2) // process first 2 files

    for (const url of fileLimit) {
      try {
        const xml = await fetchGzippedXML(url)
        const parsed = parser.parse(xml)
        const items = getNestedValue(parsed, config.itemsPath)

        for (const item of items) {
          if (typeof item !== 'object' || !item) continue
          const raw = item as Record<string, unknown>

          const rawItem: RawItem = {
            itemName: String(raw[config.fieldMap.itemName] ?? ''),
            itemPrice: parseFloat(String(raw[config.fieldMap.itemPrice] ?? '0')) || 0,
            itemCode: config.fieldMap.itemCode ? String(raw[config.fieldMap.itemCode] ?? '') : undefined,
            quantity: config.fieldMap.quantity ? parseFloat(String(raw[config.fieldMap.quantity] ?? '0')) || undefined : undefined,
            storeCity: config.fieldMap.city ? String(raw[config.fieldMap.city] ?? '') : undefined,
            chain: config.chainId,
            updatedAt,
          }

          if (rawItem.itemPrice > 0) {
            const entry = parseRawItem(rawItem)
            if (entry) entries.push(entry)
          }
        }
      } catch {
        // Skip failed file, continue with next
      }
    }
  } catch {
    // Chain fetch failed entirely
  }

  return {
    chainId: config.chainId,
    chainName: config.chainName,
    entries: entries.filter(Boolean) as NonNullable<(typeof entries)[0]>[],
  }
}

export async function fetchAllPrices(): Promise<PriceSnapshot> {
  const results = await Promise.allSettled(FEEDS.map(f => fetchChainData(f)))

  const chains: ChainData[] = results
    .filter((r): r is PromiseFulfilledResult<ChainData> => r.status === 'fulfilled')
    .map(r => r.value)

  const allEntries = chains.flatMap(c => c.entries)

  return {
    timestamp: new Date().toISOString(),
    chains,
    allEntries,
  }
}

export function getMockPrices(): PriceSnapshot {
  const now = new Date().toISOString()
  // Realistic mock prices based on actual Israeli market prices
  const mockData: Array<{ chain: ChainId; chainName: string; items: Array<{ productId: string; price: number; city?: string }> }> = [
    {
      chain: 'shufersal', chainName: 'שופרסל', items: [
        { productId: 'gil-1-500', price: 4.90 },
        { productId: 'gil-1-1000', price: 6.90 },
        { productId: 'gil-1-1500', price: 9.90 },
        { productId: 'gil-1-3000', price: 16.90 },
        { productId: 'gil-3-500', price: 5.20 },
        { productId: 'gil-3-1000', price: 7.50 },
        { productId: 'gil-3-1500', price: 10.90 },
        { productId: 'gil-3-3000', price: 18.90 },
        { productId: 'ashel-1-1000', price: 6.50 },
        { productId: 'ashel-3-1000', price: 7.20 },
        { productId: 'gil-1-500', price: 5.30, city: 'אילת' },
        { productId: 'gil-1-1000', price: 7.40, city: 'אילת' },
      ],
    },
    {
      chain: 'ramiLevy', chainName: 'רמי לוי', items: [
        { productId: 'gil-1-500', price: 4.50 },
        { productId: 'gil-1-1000', price: 6.20 },
        { productId: 'gil-1-1500', price: 9.10 },
        { productId: 'gil-1-3000', price: 15.50 },
        { productId: 'gil-3-500', price: 4.90 },
        { productId: 'gil-3-1000', price: 6.90 },
        { productId: 'gil-3-1500', price: 10.20 },
        { productId: 'gil-3-3000', price: 17.90 },
        { productId: 'ashel-1-1000', price: 5.90 },
        { productId: 'ashel-3-1000', price: 6.80 },
      ],
    },
    {
      chain: 'victory', chainName: 'ויקטורי', items: [
        { productId: 'gil-1-500', price: 5.10 },
        { productId: 'gil-1-1000', price: 7.10 },
        { productId: 'gil-1-1500', price: 10.50 },
        { productId: 'gil-3-1000', price: 7.90 },
        { productId: 'ashel-1-1000', price: 6.70 },
        { productId: 'ashel-3-1000', price: 7.50 },
      ],
    },
    {
      chain: 'mega', chainName: 'מגה', items: [
        { productId: 'gil-1-500', price: 4.80 },
        { productId: 'gil-1-1000', price: 6.80 },
        { productId: 'gil-3-1000', price: 7.30 },
        { productId: 'ashel-1-1000', price: 6.30 },
        { productId: 'ashel-3-1000', price: 7.10 },
      ],
    },
    {
      chain: 'yeinotBitan', chainName: 'יינות ביתן', items: [
        { productId: 'gil-1-500', price: 5.30 },
        { productId: 'gil-1-1000', price: 7.30 },
        { productId: 'gil-3-1000', price: 8.10 },
        { productId: 'ashel-1-1000', price: 7.00 },
        { productId: 'ashel-3-1000', price: 7.80 },
      ],
    },
  ]

  const { PRODUCTS } = require('./types')

  const chains: ChainData[] = mockData.map(chainData => ({
    chainId: chainData.chain,
    chainName: chainData.chainName,
    entries: chainData.items
      .map(item => {
        const product = PRODUCTS.find((p: { id: string }) => p.id === item.productId)
        if (!product) return null
        return {
          product,
          chain: chainData.chain,
          chainName: chainData.chainName,
          price: item.price,
          pricePer100ml: (item.price / product.sizeMl) * 100,
          storeCity: item.city,
          updatedAt: now,
        }
      })
      .filter(Boolean) as PriceEntry[],
  }))

  return {
    timestamp: now,
    chains,
    allEntries: chains.flatMap(c => c.entries) as PriceSnapshot['allEntries'],
  }
}

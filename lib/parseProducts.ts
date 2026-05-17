import { Product, PriceEntry, ChainId, PRODUCTS, CHAIN_NAMES } from './types'

const LEBEN_KEYWORDS = ['לבן', 'leben', 'לבן גיל', 'לבן אשל']
const GIL_KEYWORDS = ['גיל', 'gil']
const ASHEL_KEYWORDS = ['אשל', 'ashel']

export function isLebenProduct(name: string): boolean {
  const lower = name.toLowerCase()
  return LEBEN_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()))
}

export function detectFat(name: string): '1%' | '3%' | null {
  if (name.includes('1%') || name.includes('1 %') || name.includes('1 אחוז')) return '1%'
  if (name.includes('3%') || name.includes('3 %') || name.includes('3 אחוז')) return '3%'
  if (name.includes('רזה') || name.includes('דל')) return '1%'
  return null
}

export function detectBrand(name: string): 'גיל' | 'אשל' | 'מותג פרטי' {
  const lower = name.toLowerCase()
  if (GIL_KEYWORDS.some(k => lower.includes(k))) return 'גיל'
  if (ASHEL_KEYWORDS.some(k => lower.includes(k))) return 'אשל'
  return 'מותג פרטי'
}

export function detectSize(name: string, quantityInGrams?: number): number {
  // Try to extract size from name
  const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*מ[״"]ל/i) || name.match(/(\d+(?:\.\d+)?)\s*ml/i)
  if (mlMatch) return parseFloat(mlMatch[1])

  const literMatch = name.match(/(\d+(?:\.\d+)?)\s*ליטר/i) || name.match(/(\d+(?:\.\d+)?)\s*l\b/i)
  if (literMatch) return parseFloat(literMatch[1]) * 1000

  // Fall back to quantity in grams (ml ≈ g for dairy)
  if (quantityInGrams) {
    if (quantityInGrams > 100) return quantityInGrams
  }

  return 1000 // default 1L
}

export function matchToProduct(name: string, sizeMl: number): Product | null {
  const fat = detectFat(name)
  const brand = detectBrand(name)
  if (!fat) return null

  // Find closest size match
  const sizesAvailable = [500, 1000, 1500, 3000]
  const closestSize = sizesAvailable.reduce((prev, curr) =>
    Math.abs(curr - sizeMl) < Math.abs(prev - sizeMl) ? curr : prev
  )

  if (brand === 'מותג פרטי') {
    return {
      id: `private-${fat}-${closestSize}`,
      name: `לבן מותג פרטי ${fat}`,
      brand: 'מותג פרטי',
      fat,
      sizeMl: closestSize,
      displayName: `לבן מותג פרטי ${fat} ${closestSize >= 1000 ? closestSize / 1000 + ' ליטר' : closestSize + 'מ"ל'}`,
    }
  }

  return PRODUCTS.find(p => p.brand === brand && p.fat === fat && p.sizeMl === closestSize) ?? null
}

export interface RawItem {
  itemName: string
  itemPrice: number
  itemCode?: string
  quantity?: number
  unitOfMeasure?: string
  storeCity?: string
  chain: ChainId
  updatedAt: string
}

export function parseRawItem(item: RawItem): PriceEntry | null {
  if (!isLebenProduct(item.itemName)) return null

  const sizeMl = detectSize(item.itemName, item.quantity)
  const product = matchToProduct(item.itemName, sizeMl)
  if (!product) return null

  return {
    product,
    chain: item.chain,
    chainName: CHAIN_NAMES[item.chain],
    price: item.itemPrice,
    pricePer100ml: (item.itemPrice / product.sizeMl) * 100,
    storeCity: item.storeCity,
    itemCode: item.itemCode,
    updatedAt: item.updatedAt,
  }
}

export function isEilatStore(city?: string): boolean {
  return city === 'אילת' || city?.toLowerCase() === 'eilat'
}

export function groupByProduct(entries: PriceEntry[]): Map<string, PriceEntry[]> {
  const map = new Map<string, PriceEntry[]>()
  for (const e of entries) {
    const key = e.product.id
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

export function cheapestPerChain(entries: PriceEntry[]): Map<ChainId, PriceEntry> {
  const map = new Map<ChainId, PriceEntry>()
  for (const e of entries) {
    const existing = map.get(e.chain)
    if (!existing || e.price < existing.price) map.set(e.chain, e)
  }
  return map
}

export function nationalAverage(entries: PriceEntry[]): number {
  if (!entries.length) return 0
  return entries.reduce((sum, e) => sum + e.price, 0) / entries.length
}

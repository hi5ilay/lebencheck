export type FatPercent = '1%' | '3%'
export type Brand = 'גיל' | 'אשל' | 'מותג פרטי'
export type ChainId = 'shufersal' | 'ramiLevy' | 'victory' | 'mega' | 'yeinotBitan'

export interface Product {
  id: string
  name: string
  brand: Brand
  fat: FatPercent
  sizeMl: number
  displayName: string
}

export interface PriceEntry {
  product: Product
  chain: ChainId
  chainName: string
  price: number
  pricePer100ml: number
  storeCity?: string
  itemCode?: string
  updatedAt: string
}

export interface ChainData {
  chainId: ChainId
  chainName: string
  entries: PriceEntry[]
}

export interface PriceSnapshot {
  timestamp: string
  chains: ChainData[]
  allEntries: PriceEntry[]
}

export interface PriceHistory {
  date: string
  prices: Record<ChainId, number>
}

export interface UserProfile {
  id: string
  username: string
  balance: number
  createdAt: string
}

export interface TradePosition {
  productId: string
  units: number
  avgBuyPrice: number
}

export interface FlappyScore {
  username: string
  highScore: number
  totalNisEarned: number
  pipesPassed: number
}

export interface LeaderboardEntry {
  username: string
  score: number
  gameType: 'wealth' | 'flappy' | 'trading'
  createdAt: string
}

export const PRODUCTS: Product[] = [
  { id: 'gil-1-500', name: 'לבן גיל 1%', brand: 'גיל', fat: '1%', sizeMl: 500, displayName: 'לבן גיל 1% 500מ"ל' },
  { id: 'gil-1-1000', name: 'לבן גיל 1%', brand: 'גיל', fat: '1%', sizeMl: 1000, displayName: 'לבן גיל 1% 1 ליטר' },
  { id: 'gil-1-1500', name: 'לבן גיל 1%', brand: 'גיל', fat: '1%', sizeMl: 1500, displayName: 'לבן גיל 1% 1.5 ליטר' },
  { id: 'gil-1-3000', name: 'לבן גיל 1%', brand: 'גיל', fat: '1%', sizeMl: 3000, displayName: 'לבן גיל 1% 3 ליטר' },
  { id: 'gil-3-500', name: 'לבן גיל 3%', brand: 'גיל', fat: '3%', sizeMl: 500, displayName: 'לבן גיל 3% 500מ"ל' },
  { id: 'gil-3-1000', name: 'לבן גיל 3%', brand: 'גיל', fat: '3%', sizeMl: 1000, displayName: 'לבן גיל 3% 1 ליטר' },
  { id: 'gil-3-1500', name: 'לבן גיל 3%', brand: 'גיל', fat: '3%', sizeMl: 1500, displayName: 'לבן גיל 3% 1.5 ליטר' },
  { id: 'gil-3-3000', name: 'לבן גיל 3%', brand: 'גיל', fat: '3%', sizeMl: 3000, displayName: 'לבן גיל 3% 3 ליטר' },
  { id: 'ashel-1-500', name: 'לבן אשל 1%', brand: 'אשל', fat: '1%', sizeMl: 500, displayName: 'לבן אשל 1% 500מ"ל' },
  { id: 'ashel-1-1000', name: 'לבן אשל 1%', brand: 'אשל', fat: '1%', sizeMl: 1000, displayName: 'לבן אשל 1% 1 ליטר' },
  { id: 'ashel-1-1500', name: 'לבן אשל 1%', brand: 'אשל', fat: '1%', sizeMl: 1500, displayName: 'לבן אשל 1% 1.5 ליטר' },
  { id: 'ashel-1-3000', name: 'לבן אשל 1%', brand: 'אשל', fat: '1%', sizeMl: 3000, displayName: 'לבן אשל 1% 3 ליטר' },
  { id: 'ashel-3-500', name: 'לבן אשל 3%', brand: 'אשל', fat: '3%', sizeMl: 500, displayName: 'לבן אשל 3% 500מ"ל' },
  { id: 'ashel-3-1000', name: 'לבן אשל 3%', brand: 'אשל', fat: '3%', sizeMl: 1000, displayName: 'לבן אשל 3% 1 ליטר' },
  { id: 'ashel-3-1500', name: 'לבן אשל 3%', brand: 'אשל', fat: '3%', sizeMl: 1500, displayName: 'לבן אשל 3% 1.5 ליטר' },
  { id: 'ashel-3-3000', name: 'לבן אשל 3%', brand: 'אשל', fat: '3%', sizeMl: 3000, displayName: 'לבן אשל 3% 3 ליטר' },
]

export const CHAIN_NAMES: Record<ChainId, string> = {
  shufersal: 'שופרסל',
  ramiLevy: 'רמי לוי',
  victory: 'ויקטורי',
  mega: 'מגה',
  yeinotBitan: 'יינות ביתן',
}

export const TRADING_TICKERS: Record<string, string> = {
  'gil-1': 'LBGIL1',
  'gil-3': 'LBGIL3',
  'ashel-1': 'LBASH1',
  'ashel-3': 'LBASH3',
}

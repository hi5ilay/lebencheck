import { createClient } from '@/lib/supabase'
import LeaderboardClient, {
  type WealthEntry,
  type FlappyEntry,
} from '@/components/LeaderboardClient'

export const revalidate = 60

/* ─── Mock fallback data ─────────────────────────────────── */

const MOCK_WEALTH: WealthEntry[] = [
  { rank: 1, username: 'milkking', balance: 4820.5, createdAt: '2025-01-15T00:00:00Z' },
  { rank: 2, username: 'shufersal_pro', balance: 3210.75, createdAt: '2025-02-01T00:00:00Z' },
  { rank: 3, username: 'leben_trader', balance: 2890.0, createdAt: '2025-01-20T00:00:00Z' },
  { rank: 4, username: 'ramiLevy_fan', balance: 1540.2, createdAt: '2025-03-05T00:00:00Z' },
  { rank: 5, username: 'ashel_queen', balance: 990.0, createdAt: '2025-02-22T00:00:00Z' },
]

const MOCK_FLAPPY: FlappyEntry[] = [
  { rank: 1, username: 'birdie_orc', highScore: 187, createdAt: '2025-03-10T00:00:00Z' },
  { rank: 2, username: 'leben_wings', highScore: 142, createdAt: '2025-02-28T00:00:00Z' },
  { rank: 3, username: 'milkbird', highScore: 99, createdAt: '2025-01-30T00:00:00Z' },
  { rank: 4, username: 'flappymaster', highScore: 76, createdAt: '2025-04-01T00:00:00Z' },
  { rank: 5, username: 'gilbird', highScore: 54, createdAt: '2025-03-15T00:00:00Z' },
]

/* ─── Server data fetch ──────────────────────────────────── */

async function fetchWealthData(): Promise<WealthEntry[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('username, balance, created_at')
      .order('balance', { ascending: false })
      .limit(10)

    if (error || !data || data.length === 0) return MOCK_WEALTH

    return data.map((row, i) => ({
      rank: i + 1,
      username: row.username ?? 'אנונימי',
      balance: row.balance ?? 0,
      createdAt: row.created_at ?? new Date().toISOString(),
    }))
  } catch {
    return MOCK_WEALTH
  }
}

async function fetchFlappyData(): Promise<FlappyEntry[]> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('flappy_scores')
      .select('username, high_score, created_at')
      .order('high_score', { ascending: false })
      .limit(10)

    if (error || !data || data.length === 0) return MOCK_FLAPPY

    return data.map((row, i) => ({
      rank: i + 1,
      username: row.username ?? 'אנונימי',
      highScore: row.high_score ?? 0,
      createdAt: row.created_at ?? new Date().toISOString(),
    }))
  } catch {
    return MOCK_FLAPPY
  }
}

/* ─── Page ───────────────────────────────────────────────── */

export default async function LeaderboardPage() {
  const [wealthData, flappyData] = await Promise.all([fetchWealthData(), fetchFlappyData()])

  return (
    <div
      style={{
        background: '#111',
        minHeight: '100vh',
        fontFamily: 'Heebo, sans-serif',
        color: '#fff',
      }}
    >
      {/* Hero header */}
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1200 0%, rgba(26,18,0,0) 100%)',
          borderBottom: '1px solid rgba(245,158,11,0.18)',
          padding: '2.5rem 1.5rem 2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🏆</div>
        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            color: '#F59E0B',
            letterSpacing: '-0.02em',
            marginBottom: '0.4rem',
          }}
        >
          לוח התוצאות
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
          המובילים בלבןצ׳ק — עושר, ציפורים ומסחר
        </p>
      </div>

      {/* Main content */}
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '2rem 1.25rem 4rem',
        }}
      >
        <LeaderboardClient wealthData={wealthData} flappyData={flappyData} />
      </div>
    </div>
  )
}

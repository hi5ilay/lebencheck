'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { updateBalance } from '@/lib/updateBalance'

// ── European roulette data ─────────────────────────────────────────────────────
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

function numberColor(n: number): 'green' | 'red' | 'black' {
  if (n === 0) return 'green'
  return RED_NUMBERS.has(n) ? 'red' : 'black'
}

const BET_AMOUNTS = [1, 5, 10, 25, 50, 100]

type BetType =
  | { kind: 'color'; value: 'red' | 'black' }
  | { kind: 'parity'; value: 'odd' | 'even' }
  | { kind: 'half'; value: 'low' | 'high' }
  | { kind: 'dozen'; value: 1 | 2 | 3 }
  | { kind: 'number'; value: number }

function betLabel(b: BetType): string {
  switch (b.kind) {
    case 'color': return b.value === 'red' ? 'אדום' : 'שחור'
    case 'parity': return b.value === 'odd' ? 'אי-זוגי' : 'זוגי'
    case 'half': return b.value === 'low' ? '1–18' : '19–36'
    case 'dozen':
      return b.value === 1 ? '1–12' : b.value === 2 ? '13–24' : '25–36'
    case 'number': return `${b.value}`
  }
}

function betPayout(b: BetType): number {
  switch (b.kind) {
    case 'color': return 2
    case 'parity': return 2
    case 'half': return 2
    case 'dozen': return 3
    case 'number': return 36
  }
}

function betWins(b: BetType, result: number): boolean {
  switch (b.kind) {
    case 'color': return numberColor(result) === b.value
    case 'parity':
      if (result === 0) return false
      return b.value === 'odd' ? result % 2 === 1 : result % 2 === 0
    case 'half':
      if (result === 0) return false
      return b.value === 'low' ? result <= 18 : result >= 19
    case 'dozen':
      if (result === 0) return false
      if (b.value === 1) return result <= 12
      if (b.value === 2) return result >= 13 && result <= 24
      return result >= 25
    case 'number': return result === b.value
  }
}

// ── Wheel visual ───────────────────────────────────────────────────────────────
function RouletteWheel({ spinning, result }: { spinning: boolean; result: number | null }) {
  const NUM_SLOTS = 37
  const colors = Array.from({ length: NUM_SLOTS }, (_, i) => numberColor(i))

  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: 'conic-gradient(' + colors.map((c, i) => {
            const pct = (i / NUM_SLOTS) * 100
            const nxt = ((i + 1) / NUM_SLOTS) * 100
            const col = c === 'green' ? '#16A34A' : c === 'red' ? '#DC2626' : '#111'
            return `${col} ${pct}% ${nxt}%`
          }).join(', ') + ')',
          animation: spinning ? 'wheel-spin 2s linear infinite' : 'none',
          transition: spinning ? 'none' : 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 1)',
          border: '6px solid #2a2a2a',
          boxShadow: '0 0 0 2px #F59E0B, 0 0 40px rgba(245,158,11,0.2)',
        }}
      />

      {/* Number marks on wheel */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {Array.from({ length: NUM_SLOTS }, (_, i) => {
          const angle = (i / NUM_SLOTS) * 360
          return (
            <div
              key={i}
              className="absolute"
              style={{
                top: '50%',
                left: '50%',
                transform: `rotate(${angle}deg) translateX(80px) rotate(-${angle}deg)`,
                transformOrigin: '0 0',
                fontSize: '7px',
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 'bold',
                width: 14,
                textAlign: 'center',
                marginLeft: -7,
                marginTop: -4,
              }}
            >
              {i}
            </div>
          )
        })}
      </div>

      {/* Inner hub */}
      <div
        className="absolute rounded-full flex flex-col items-center justify-center z-10"
        style={{
          width: 110,
          height: 110,
          background: 'linear-gradient(145deg, #1a1a1a, #0a0a0a)',
          border: '3px solid #2a2a2a',
          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.8)',
        }}
      >
        {result !== null && !spinning ? (
          <>
            <div
              className="text-3xl font-black"
              style={{ color: numberColor(result) === 'red' ? '#EF4444' : numberColor(result) === 'green' ? '#22C55E' : '#fff' }}
            >
              {result}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {numberColor(result) === 'red' ? 'אדום' : numberColor(result) === 'green' ? 'אפס' : 'שחור'}
            </div>
          </>
        ) : spinning ? (
          <div className="text-2xl animate-spin">🎰</div>
        ) : (
          <div className="text-white/20 text-sm font-bold">סובב!</div>
        )}
      </div>

      {/* Ball indicator (top arrow) */}
      <div
        className="absolute top-1 left-1/2 -translate-x-1/2 z-20 text-[#F59E0B]"
        style={{ fontSize: '18px', filter: 'drop-shadow(0 0 4px #F59E0B)' }}
      >
        ▼
      </div>

      <style jsx>{`
        @keyframes wheel-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Roulette() {
  const { user, balance, setLocalBalance } = useAuth()

  const [betAmount, setBetAmount] = useState(5)
  const [selectedBet, setSelectedBet] = useState<BetType | null>(null)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [win, setWin] = useState<boolean | null>(null)
  const [payout, setPayout] = useState<number | null>(null)
  const [tab, setTab] = useState<'even' | 'dozen' | 'number'>('even')
  const [stats, setStats] = useState({ wins: 0, losses: 0, net: 0 })
  const spinningRef = useRef(false)

  const spin = useCallback(async () => {
    if (spinningRef.current) return
    if (!user) return
    if (!selectedBet) { setMessage('בחר הימור תחילה'); return }
    if (balance < betAmount) { setMessage('אין מספיק יתרה'); return }

    spinningRef.current = true
    setSpinning(true)
    setMessage(null)
    setWin(null)
    setPayout(null)

    // Deduct bet
    setLocalBalance(balance - betAmount)
    updateBalance(user.id, -betAmount)

    // Spin for 4 seconds
    await new Promise(r => setTimeout(r, 4200))

    const landedNumber = Math.floor(Math.random() * 37)
    setResult(landedNumber)
    setSpinning(false)
    spinningRef.current = false

    const won = betWins(selectedBet, landedNumber)
    const multiplier = betPayout(selectedBet)

    if (won) {
      const winAmount = betAmount * multiplier
      setLocalBalance(balance - betAmount + winAmount)
      updateBalance(user.id, winAmount)
      setWin(true)
      setPayout(winAmount)
      setMessage(`זכית ₪${winAmount}!`)
      setStats(s => ({ ...s, wins: s.wins + 1, net: s.net + winAmount - betAmount }))
    } else {
      setWin(false)
      setMessage(`הפסדת ₪${betAmount}`)
      setStats(s => ({ ...s, losses: s.losses + 1, net: s.net - betAmount }))
    }
  }, [user, balance, betAmount, selectedBet, setLocalBalance])

  const EVEN_BETS: BetType[] = [
    { kind: 'color', value: 'red' },
    { kind: 'color', value: 'black' },
    { kind: 'parity', value: 'odd' },
    { kind: 'parity', value: 'even' },
    { kind: 'half', value: 'low' },
    { kind: 'half', value: 'high' },
  ]

  const DOZEN_BETS: BetType[] = [
    { kind: 'dozen', value: 1 },
    { kind: 'dozen', value: 2 },
    { kind: 'dozen', value: 3 },
  ]

  function isBetSelected(b: BetType) {
    if (!selectedBet) return false
    if (b.kind !== selectedBet.kind) return false
    return (b as { value: unknown }).value === (selectedBet as { value: unknown }).value
  }

  const netColor = stats.net >= 0 ? '#4ADE80' : '#F87171'

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-md mx-auto select-none">
      {/* Balance */}
      <div className="flex items-center gap-3">
        <span className="text-white/40 text-sm">יתרה</span>
        <span className="text-[#F59E0B] font-black text-2xl">₪{balance.toFixed(0)}</span>
      </div>

      {/* Wheel */}
      <RouletteWheel spinning={spinning} result={result} />

      {/* Result message */}
      <div className="h-10 flex items-center justify-center">
        {message && (
          <div
            className="text-xl font-black px-6 py-2 rounded-xl transition-all"
            style={{
              color: win === true ? '#4ADE80' : win === false ? '#F87171' : '#F59E0B',
              background: win === true ? 'rgba(74,222,128,0.1)' : win === false ? 'rgba(248,113,113,0.1)' : 'transparent',
              border: win !== null ? `1px solid ${win ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}` : 'none',
              textShadow: win === true ? '0 0 20px rgba(74,222,128,0.5)' : 'none',
            }}
          >
            {message}
          </div>
        )}
      </div>

      {/* Bet card */}
      <div
        className="w-full rounded-2xl p-5"
        style={{ background: '#111', border: '1px solid #2a2a2a' }}
      >
        {/* Tabs */}
        <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: '#0a0a0a' }}>
          {(['even', 'dozen', 'number'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedBet(null) }}
              className="flex-1 py-1.5 rounded-md text-xs font-bold transition-all"
              style={{
                background: tab === t ? '#F59E0B' : 'transparent',
                color: tab === t ? '#000' : '#888',
              }}
            >
              {t === 'even' ? '1:2' : t === 'dozen' ? 'תריסיות' : 'מספר'}
            </button>
          ))}
        </div>

        {/* Even-money bets */}
        {tab === 'even' && (
          <div className="grid grid-cols-3 gap-2">
            {EVEN_BETS.map(b => {
              const isRed = b.kind === 'color' && b.value === 'red'
              const isBlack = b.kind === 'color' && b.value === 'black'
              const sel = isBetSelected(b)
              return (
                <button
                  key={betLabel(b)}
                  onClick={() => setSelectedBet(b)}
                  className="py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: sel
                      ? isRed ? '#DC2626' : isBlack ? '#374151' : '#F59E0B'
                      : isRed ? 'rgba(220,38,38,0.2)' : isBlack ? 'rgba(55,65,81,0.4)' : '#1a1a1a',
                    color: sel ? (isRed || isBlack ? '#fff' : '#000') : isRed ? '#FCA5A5' : isBlack ? '#D1D5DB' : '#aaa',
                    border: sel ? 'none' : `1px solid ${isRed ? '#7F1D1D' : isBlack ? '#374151' : '#2a2a2a'}`,
                    boxShadow: sel ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
                  }}
                >
                  {betLabel(b)}
                </button>
              )
            })}
          </div>
        )}

        {/* Dozen bets */}
        {tab === 'dozen' && (
          <div className="flex gap-2">
            {DOZEN_BETS.map(b => {
              const sel = isBetSelected(b)
              return (
                <button
                  key={betLabel(b)}
                  onClick={() => setSelectedBet(b)}
                  className="flex-1 py-4 rounded-xl font-bold text-sm transition-all active:scale-95"
                  style={{
                    background: sel ? '#F59E0B' : '#1a1a1a',
                    color: sel ? '#000' : '#888',
                    border: sel ? 'none' : '1px solid #2a2a2a',
                    boxShadow: sel ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
                  }}
                >
                  <div>{betLabel(b)}</div>
                  <div className="text-xs mt-1 opacity-60">×3</div>
                </button>
              )
            })}
          </div>
        )}

        {/* Number grid */}
        {tab === 'number' && (
          <div>
            {/* Zero */}
            <button
              onClick={() => setSelectedBet({ kind: 'number', value: 0 })}
              className="w-full mb-2 py-2 rounded-lg font-bold text-sm transition-all active:scale-95"
              style={{
                background: isBetSelected({ kind: 'number', value: 0 }) ? '#16A34A' : 'rgba(22,163,74,0.2)',
                color: '#4ADE80',
                border: '1px solid #15803D',
              }}
            >
              0 — ×36
            </button>

            <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(9, 1fr)' }}>
              {Array.from({ length: 36 }, (_, i) => i + 1).map(n => {
                const col = numberColor(n)
                const sel = isBetSelected({ kind: 'number', value: n })
                return (
                  <button
                    key={n}
                    onClick={() => setSelectedBet({ kind: 'number', value: n })}
                    className="rounded-lg font-bold text-xs transition-all active:scale-95 flex items-center justify-center"
                    style={{
                      height: 32,
                      background: sel
                        ? col === 'red' ? '#DC2626' : '#374151'
                        : col === 'red' ? 'rgba(220,38,38,0.25)' : 'rgba(55,65,81,0.3)',
                      color: col === 'red' ? (sel ? '#fff' : '#FCA5A5') : (sel ? '#fff' : '#D1D5DB'),
                      border: sel ? '2px solid #F59E0B' : '1px solid transparent',
                      boxShadow: sel ? '0 0 8px rgba(245,158,11,0.5)' : 'none',
                    }}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Bet amount */}
        <div className="mt-4">
          <p className="text-white/30 text-xs text-center mb-2">סכום הימור</p>
          <div className="flex gap-1.5 flex-wrap justify-center">
            {BET_AMOUNTS.map(a => (
              <button
                key={a}
                onClick={() => setBetAmount(a)}
                className="px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
                style={{
                  background: betAmount === a ? '#F59E0B' : '#1e1e1e',
                  color: betAmount === a ? '#000' : '#666',
                  border: betAmount === a ? 'none' : '1px solid #2a2a2a',
                }}
              >
                ₪{a}
              </button>
            ))}
          </div>
        </div>

        {/* Selected bet display */}
        {selectedBet && (
          <div className="mt-3 text-center text-sm">
            <span className="text-white/40">הימור נוכחי: </span>
            <span className="text-[#F59E0B] font-bold">{betLabel(selectedBet)}</span>
            <span className="text-white/40"> · ₪{betAmount} · ×{betPayout(selectedBet)}</span>
          </div>
        )}

        {/* Spin */}
        <button
          onClick={spin}
          disabled={spinning || !user || !selectedBet}
          className="w-full mt-4 py-4 rounded-xl font-black text-xl text-black transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: spinning || !selectedBet
              ? 'linear-gradient(135deg, #78350F, #92400E)'
              : 'linear-gradient(135deg, #F59E0B, #D97706)',
            boxShadow: spinning || !selectedBet ? 'none' : '0 6px 24px rgba(245,158,11,0.4)',
          }}
        >
          {spinning ? '⏳ כדור בסיבוב...' : 'סובב! 🎰'}
        </button>

        {!user && (
          <p className="text-center text-white/40 text-sm mt-3">נדרשת כניסה לחשבון כדי לשחק</p>
        )}
      </div>

      {/* Session stats */}
      <div className="w-full grid grid-cols-3 rounded-xl overflow-hidden" style={{ border: '1px solid #2a2a2a' }}>
        {[
          { label: 'ניצחונות', val: stats.wins, color: '#4ADE80' },
          { label: 'הפסדים', val: stats.losses, color: '#F87171' },
          { label: 'נטו', val: `${stats.net >= 0 ? '+' : ''}₪${stats.net}`, color: netColor },
        ].map(({ label, val, color }, idx) => (
          <div key={label} className="py-3 px-2 text-center"
            style={{ background: '#111', borderRight: idx < 2 ? '1px solid #2a2a2a' : 'none' }}>
            <div className="font-black text-base" style={{ color }}>{val}</div>
            <div className="text-white/30 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

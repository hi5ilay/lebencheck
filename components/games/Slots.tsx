'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { updateBalance } from '@/lib/updateBalance'

// ── Symbols ────────────────────────────────────────────────────────────────────
const SYMBOLS = ['🥛', '7️⃣', '⭐', '🛒', '🐄', '₪'] as const
type Symbol = typeof SYMBOLS[number]

const SYMBOL_WEIGHTS = [1, 2, 3, 4, 5, 5] // rarer = lower weight
const TOTAL_WEIGHT = SYMBOL_WEIGHTS.reduce((a, b) => a + b, 0)

function weightedRandom(): Symbol {
  let r = Math.random() * TOTAL_WEIGHT
  for (let i = 0; i < SYMBOLS.length; i++) {
    r -= SYMBOL_WEIGHTS[i]
    if (r <= 0) return SYMBOLS[i]
  }
  return SYMBOLS[SYMBOLS.length - 1]
}

function calcPayout(result: [Symbol, Symbol, Symbol], bet: number): number {
  const [a, b, c] = result
  if (a === b && b === c) {
    if (a === '🥛') return bet * 50
    if (a === '7️⃣') return bet * 25
    if (a === '⭐') return bet * 15
    return bet * 10
  }
  if (a === b || b === c || a === c) return bet * 2
  return -bet
}

const BET_OPTIONS = [1, 5, 10, 50]

// ── Reel component ────────────────────────────────────────────────────────────
function Reel({ symbols, spinning, delay }: { symbols: Symbol[]; spinning: boolean; delay: number }) {
  return (
    <div
      className="relative w-20 h-64 overflow-hidden rounded-xl border-2"
      style={{
        borderColor: spinning ? '#F59E0B' : '#2a2a2a',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 50%, #0a0a0a 100%)',
        boxShadow: spinning ? '0 0 20px rgba(245,158,11,0.3), inset 0 0 30px rgba(0,0,0,0.5)' : 'inset 0 0 30px rgba(0,0,0,0.5)',
        transition: `border-color 0.3s ease ${delay}ms`,
      }}
    >
      {/* Scanlines overlay */}
      <div className="absolute inset-0 pointer-events-none z-10"
        style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 10px, rgba(0,0,0,0.05) 10px, rgba(0,0,0,0.05) 11px)' }} />

      {/* Active row highlight */}
      <div className="absolute inset-x-0 z-10 pointer-events-none"
        style={{
          top: '50%',
          height: '76px',
          transform: 'translateY(-50%)',
          background: 'rgba(245,158,11,0.06)',
          borderTop: '1px solid rgba(245,158,11,0.25)',
          borderBottom: '1px solid rgba(245,158,11,0.25)',
        }} />

      {/* Symbol strip */}
      <div
        className="flex flex-col items-center"
        style={{
          animation: spinning ? `reel-spin-${Math.floor(delay / 200)} 0.15s linear infinite` : 'none',
          transition: spinning ? 'none' : `transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
        }}
      >
        {symbols.map((sym, i) => (
          <div key={i} className="flex items-center justify-center"
            style={{ width: 80, height: 80, fontSize: '2.2rem', lineHeight: 1 }}>
            {sym}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export function Slots() {
  const { user, balance, setLocalBalance } = useAuth()

  const [bet, setBet] = useState(5)
  const [spinning, setSpinning] = useState(false)
  const [reels, setReels] = useState<[Symbol[], Symbol[], Symbol[]]>([
    ['🥛', '7️⃣', '⭐'],
    ['🐄', '₪', '🛒'],
    ['⭐', '🥛', '7️⃣'],
  ])
  const [result, setResult] = useState<[Symbol, Symbol, Symbol] | null>(null)
  const [lastPayout, setLastPayout] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [jackpot, setJackpot] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [winPulse, setWinPulse] = useState(false)
  const [stats, setStats] = useState({ wins: 0, losses: 0, net: 0 })
  const spinningRef = useRef(false)

  const spin = useCallback(async () => {
    if (spinningRef.current) return
    if (!user) return
    if (balance < bet) {
      setMessage('אין מספיק יתרה')
      return
    }

    spinningRef.current = true
    setSpinning(true)
    setMessage(null)
    setResult(null)
    setLastPayout(null)
    setJackpot(false)
    setWinPulse(false)
    setShaking(false)

    // Deduct bet optimistically
    setLocalBalance(balance - bet)
    updateBalance(user.id, -bet)

    // Animate reels spinning (show random symbols)
    const spinInterval = setInterval(() => {
      setReels([
        [weightedRandom(), weightedRandom(), weightedRandom()],
        [weightedRandom(), weightedRandom(), weightedRandom()],
        [weightedRandom(), weightedRandom(), weightedRandom()],
      ])
    }, 80)

    // Compute final result
    const finalResult: [Symbol, Symbol, Symbol] = [
      weightedRandom(), weightedRandom(), weightedRandom()
    ]

    await new Promise(r => setTimeout(r, 1600))
    clearInterval(spinInterval)

    // Stop reels sequentially
    const r1: Symbol[] = [weightedRandom(), finalResult[0], weightedRandom()]
    setReels(prev => [r1, prev[1], prev[2]])
    await new Promise(r => setTimeout(r, 220))

    const r2: Symbol[] = [weightedRandom(), finalResult[1], weightedRandom()]
    setReels(prev => [prev[0], r2, prev[2]])
    await new Promise(r => setTimeout(r, 220))

    const r3: Symbol[] = [weightedRandom(), finalResult[2], weightedRandom()]
    setReels([r1, r2, r3])
    await new Promise(r => setTimeout(r, 220))

    setSpinning(false)
    spinningRef.current = false
    setResult(finalResult)

    const payout = calcPayout(finalResult, bet)
    setLastPayout(payout)

    if (payout > 0) {
      // Win
      setLocalBalance(balance - bet + payout)
      updateBalance(user.id, payout)
      setStats(s => ({ ...s, wins: s.wins + 1, net: s.net + payout - bet }))

      if (finalResult[0] === '🥛' && finalResult[1] === '🥛' && finalResult[2] === '🥛') {
        setJackpot(true)
        setMessage('פוט פוט פוט 🎉')
      } else {
        setWinPulse(true)
        setMessage(`זכית ₪${payout}!`)
      }
    } else {
      // Lose
      setShaking(true)
      setStats(s => ({ ...s, losses: s.losses + 1, net: s.net + payout }))
      setMessage('אולי בפעם הבאה...')
      setTimeout(() => setShaking(false), 600)
    }
  }, [user, balance, bet, setLocalBalance])

  const netColor = stats.net >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="flex flex-col items-center gap-6 select-none w-full max-w-sm mx-auto">
      {/* Balance */}
      <div className="flex items-center gap-3">
        <div className="text-white/50 text-sm">יתרה</div>
        <div className="text-[#F59E0B] font-black text-2xl">₪{balance.toFixed(0)}</div>
      </div>

      {/* Machine body */}
      <div
        className={`w-full rounded-2xl p-6 transition-transform ${shaking ? 'animate-[shake_0.5s_ease]' : ''}`}
        style={{
          background: 'linear-gradient(145deg, #1a1a1a, #111)',
          border: '2px solid #2a2a2a',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {/* Top decoration */}
        <div className="text-center mb-4">
          <div className="inline-block px-4 py-1 rounded-full text-xs font-bold tracking-widest"
            style={{ background: 'linear-gradient(90deg, #F59E0B, #D97706)', color: '#000' }}>
            SLOTS ✦ לבן קזינו
          </div>
        </div>

        {/* Reels */}
        <div
          className={`flex gap-3 justify-center mb-5 ${winPulse ? 'animate-[pulse_0.5s_ease_3]' : ''} ${jackpot ? 'animate-[bounce_0.5s_ease_infinite]' : ''}`}
          style={{
            padding: '12px',
            borderRadius: '16px',
            background: '#090909',
            border: jackpot ? '2px solid #F59E0B' : '2px solid #1a1a1a',
            boxShadow: jackpot ? '0 0 40px rgba(245,158,11,0.5)' : 'none',
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          {reels.map((reel, i) => (
            <Reel key={i} symbols={reel} spinning={spinning} delay={i * 200} />
          ))}
        </div>

        {/* Result message */}
        <div className="h-10 flex items-center justify-center">
          {message && (
            <div
              className={`text-lg font-black transition-all ${jackpot ? 'text-[#F59E0B] text-2xl animate-pulse' : lastPayout && lastPayout > 0 ? 'text-green-400' : 'text-red-400'}`}
              style={{ textShadow: jackpot ? '0 0 20px #F59E0B' : 'none' }}
            >
              {message}
            </div>
          )}
        </div>

        {/* Bet selector */}
        <div className="mt-4">
          <p className="text-white/40 text-xs text-center mb-2">הימור</p>
          <div className="flex gap-2 justify-center">
            {BET_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => !spinning && setBet(opt)}
                disabled={spinning}
                className="px-3 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
                style={{
                  background: bet === opt ? 'linear-gradient(135deg, #F59E0B, #D97706)' : '#1e1e1e',
                  color: bet === opt ? '#000' : '#888',
                  border: bet === opt ? 'none' : '1px solid #2a2a2a',
                  boxShadow: bet === opt ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
                }}
              >
                ₪{opt}
              </button>
            ))}
          </div>
        </div>

        {/* Spin button */}
        <button
          onClick={spin}
          disabled={spinning || !user}
          className="w-full mt-4 py-4 rounded-xl font-black text-xl text-black transition-all active:scale-95 disabled:opacity-50"
          style={{
            background: spinning
              ? 'linear-gradient(135deg, #78350F, #92400E)'
              : 'linear-gradient(135deg, #F59E0B, #D97706)',
            boxShadow: spinning ? 'none' : '0 6px 24px rgba(245,158,11,0.4)',
            transform: spinning ? 'translateY(2px)' : 'none',
          }}
        >
          {spinning ? '⏳ מסתובב...' : 'סובב! 🎰'}
        </button>

        {!user && (
          <p className="text-center text-white/40 text-sm mt-3">נדרשת כניסה לחשבון כדי לשחק</p>
        )}
      </div>

      {/* Session stats */}
      <div
        className="w-full grid grid-cols-3 rounded-xl overflow-hidden"
        style={{ border: '1px solid #2a2a2a' }}
      >
        {[
          { label: 'ניצחונות', val: stats.wins, color: 'text-green-400' },
          { label: 'הפסדים', val: stats.losses, color: 'text-red-400' },
          { label: 'נטו', val: `${stats.net >= 0 ? '+' : ''}₪${stats.net}`, color: netColor },
        ].map(({ label, val, color }) => (
          <div key={label} className="py-3 px-2 text-center" style={{ background: '#111', borderRight: '1px solid #2a2a2a' }}>
            <div className={`font-black text-base ${color}`}>{val}</div>
            <div className="text-white/30 text-xs mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Payout table */}
      <div className="w-full rounded-xl p-4" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
        <p className="text-white/40 text-xs text-center mb-3 tracking-wider">טבלת תשלומים</p>
        <div className="space-y-1.5 text-xs">
          {[
            { combo: '🥛 🥛 🥛', mult: '×50', color: '#F59E0B' },
            { combo: '7️⃣ 7️⃣ 7️⃣', mult: '×25', color: '#C084FC' },
            { combo: '⭐ ⭐ ⭐', mult: '×15', color: '#60A5FA' },
            { combo: 'כל שלוש זהות', mult: '×10', color: '#4ADE80' },
            { combo: 'שתי זהות', mult: '×2', color: '#A3A3A3' },
            { combo: 'ללא התאמה', mult: '-הימור', color: '#F87171' },
          ].map(row => (
            <div key={row.combo} className="flex justify-between items-center">
              <span className="text-white/60">{row.combo}</span>
              <span className="font-bold" style={{ color: row.color }}>{row.mult}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15% { transform: translateX(-6px) rotate(-1deg); }
          30% { transform: translateX(6px) rotate(1deg); }
          45% { transform: translateX(-4px); }
          60% { transform: translateX(4px); }
          75% { transform: translateX(-2px); }
          90% { transform: translateX(2px); }
        }
      `}</style>
    </div>
  )
}

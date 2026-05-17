'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getMockPrices } from '@/lib/fetchPrices'
import { updateBalance } from '@/lib/updateBalance'
import { useAuth } from '@/components/AuthProvider'

/* ─── Constants ─────────────────────────────────────────── */

interface TickerDef {
  id: string          // e.g. 'LBGIL1'
  productId: string   // maps to PriceSnapshot
  hebrewName: string
}

const TICKERS: TickerDef[] = [
  { id: 'LBGIL1', productId: 'gil-1-1000', hebrewName: 'לבן גיל 1% 1 ליטר' },
  { id: 'LBGIL3', productId: 'gil-3-1000', hebrewName: 'לבן גיל 3% 1 ליטר' },
  { id: 'LBASH1', productId: 'ashel-1-1000', hebrewName: 'לבן אשל 1% 1 ליטר' },
  { id: 'LBASH3', productId: 'ashel-3-1000', hebrewName: 'לבן אשל 3% 1 ליטר' },
]

const BOOT_LINES = [
  'LEBENCHECK TERMINAL INITIALIZING...',
  'CONNECTING TO MARKETS...',
  'MARKET DATA LOADED. READY.',
]

/* ─── Types ──────────────────────────────────────────────── */

interface PortfolioPosition {
  units: number
  avgBuyPrice: number
}

type Flash = 'up' | 'down' | null

/* ─── Helpers ────────────────────────────────────────────── */

function getBasePrices(): Record<string, number> {
  const snapshot = getMockPrices()
  const result: Record<string, number> = {}
  for (const t of TICKERS) {
    // average price across all chains for that productId
    const entries = snapshot.allEntries.filter(e => e.product.id === t.productId)
    if (entries.length > 0) {
      result[t.id] = entries.reduce((s, e) => s + e.price, 0) / entries.length
    } else {
      result[t.id] = 6.9
    }
  }
  return result
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('he-IL', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/* ─── Sub-components ─────────────────────────────────────── */

function Scanline() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10"
      style={{
        background:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.015) 2px, rgba(0,255,65,0.015) 4px)',
      }}
    />
  )
}

function BlinkingDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#00ff41',
        animation: 'blink 1s step-end infinite',
        verticalAlign: 'middle',
        marginInlineStart: 6,
      }}
    />
  )
}

/* ─── Main Component ─────────────────────────────────────── */

export default function TradingMode() {
  const { user, balance, setLocalBalance } = useAuth()

  // Boot sequence
  const [bootDone, setBootDone] = useState(false)
  const [bootLines, setBootLines] = useState<string[]>([])

  // Prices: base (session-start) and live (fluctuating)
  const basePricesRef = useRef<Record<string, number>>(getBasePrices())
  const [livePrices, setLivePrices] = useState<Record<string, number>>(() => ({ ...basePricesRef.current }))
  const [flashes, setFlashes] = useState<Record<string, Flash>>({})

  // Portfolio
  const [portfolio, setPortfolio] = useState<Map<string, PortfolioPosition>>(new Map())

  // Quantities per ticker
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(TICKERS.map(t => [t.id, 1]))
  )

  // Clock
  const [clock, setClock] = useState(() => formatTime(new Date()))

  // Circuit breaker
  const [circuitActive, setCircuitActive] = useState(false)
  const [circuitShake, setCircuitShake] = useState(false)

  // Trade message (toast-like)
  const [tradeMsg, setTradeMsg] = useState<string | null>(null)
  const tradeMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* Boot sequence */
  useEffect(() => {
    let i = 0
    function showNext() {
      if (i >= BOOT_LINES.length) {
        setTimeout(() => setBootDone(true), 300)
        return
      }
      setBootLines(prev => [...prev, BOOT_LINES[i]])
      i++
      setTimeout(showNext, 500)
    }
    showNext()
  }, [])

  /* Clock tick */
  useEffect(() => {
    const id = setInterval(() => setClock(formatTime(new Date())), 1000)
    return () => clearInterval(id)
  }, [])

  /* Price fluctuation every 100ms */
  useEffect(() => {
    if (!bootDone) return
    const id = setInterval(() => {
      setLivePrices(prev => {
        const next = { ...prev }
        const newFlashes: Record<string, Flash> = {}
        for (const t of TICKERS) {
          const delta = (Math.random() * 0.02 + 0.01) * (Math.random() < 0.5 ? 1 : -1)
          const newPrice = Math.max(0.01, prev[t.id] + delta)
          newFlashes[t.id] = newPrice > prev[t.id] ? 'up' : 'down'
          next[t.id] = newPrice
        }
        setFlashes(newFlashes)
        // clear flashes after 180ms
        setTimeout(() => setFlashes({}), 180)
        return next
      })
    }, 100)
    return () => clearInterval(id)
  }, [bootDone])

  /* Circuit breaker check */
  useEffect(() => {
    if (!bootDone) return
    const id = setInterval(() => {
      try {
        const val = sessionStorage.getItem('circuitBreaker')
        if (val === 'true' || val === '1') {
          sessionStorage.removeItem('circuitBreaker')
          setCircuitActive(true)
          setCircuitShake(true)
          setTimeout(() => setCircuitShake(false), 600)
          setTimeout(() => setCircuitActive(false), 3000)
        }
      } catch { /* ignore */ }
    }, 500)
    return () => clearInterval(id)
  }, [bootDone])

  /* Show trade message */
  const showTradeMsg = useCallback((msg: string) => {
    setTradeMsg(msg)
    if (tradeMsgTimer.current) clearTimeout(tradeMsgTimer.current)
    tradeMsgTimer.current = setTimeout(() => setTradeMsg(null), 2500)
  }, [])

  /* BUY */
  const handleBuy = useCallback(async (ticker: TickerDef) => {
    if (!user) return
    const qty = quantities[ticker.id]
    const price = livePrices[ticker.id]
    const cost = price * qty
    if (balance < cost) {
      showTradeMsg('יתרה לא מספיקה')
      return
    }
    // Optimistic balance update
    const newBalance = balance - cost
    setLocalBalance(newBalance)
    await updateBalance(user.id, -cost)

    setPortfolio(prev => {
      const next = new Map(prev)
      const pos = next.get(ticker.id)
      if (pos) {
        const totalUnits = pos.units + qty
        const avgPrice = (pos.avgBuyPrice * pos.units + price * qty) / totalUnits
        next.set(ticker.id, { units: totalUnits, avgBuyPrice: avgPrice })
      } else {
        next.set(ticker.id, { units: qty, avgBuyPrice: price })
      }
      return next
    })

    showTradeMsg(`קנית ${qty} יח' ${ticker.id} @ ₪${price.toFixed(2)}`)
  }, [user, quantities, livePrices, balance, setLocalBalance, showTradeMsg])

  /* SELL */
  const handleSell = useCallback(async (ticker: TickerDef) => {
    if (!user) return
    const qty = quantities[ticker.id]
    const pos = portfolio.get(ticker.id)
    if (!pos || pos.units <= 0) {
      showTradeMsg('אין מלאי')
      return
    }
    const actualQty = Math.min(qty, pos.units)
    const price = livePrices[ticker.id]
    const revenue = price * actualQty

    const newBalance = balance + revenue
    setLocalBalance(newBalance)
    await updateBalance(user.id, revenue)

    setPortfolio(prev => {
      const next = new Map(prev)
      const existing = next.get(ticker.id)!
      const remaining = existing.units - actualQty
      if (remaining <= 0) {
        next.delete(ticker.id)
      } else {
        next.set(ticker.id, { ...existing, units: remaining })
      }
      return next
    })

    showTradeMsg(`מכרת ${actualQty} יח' ${ticker.id} @ ₪${price.toFixed(2)}`)
  }, [user, quantities, livePrices, portfolio, balance, setLocalBalance, showTradeMsg])

  /* Quantity controls */
  const adjustQty = (tickerId: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [tickerId]: Math.max(1, (prev[tickerId] ?? 1) + delta),
    }))
  }

  /* ── Boot screen ── */
  if (!bootDone) {
    return (
      <div
        style={{
          background: '#0a0a0a',
          minHeight: '100vh',
          color: '#00ff41',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          padding: '3rem 2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Scanline />
        <div style={{ maxWidth: 700 }}>
          {bootLines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginBottom: '0.75rem', fontSize: '1rem', letterSpacing: '0.05em' }}
            >
              <span style={{ color: '#00ff41', opacity: 0.6 }}>&gt; </span>{line}
              {i === bootLines.length - 1 && (
                <span style={{ animation: 'blink 1s step-end infinite' }}>█</span>
              )}
            </motion.div>
          ))}
        </div>
        <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    )
  }

  /* ── Terminal UI ── */
  return (
    <div
      dir="rtl"
      style={{
        background: '#0a0a0a',
        minHeight: '100vh',
        color: '#00ff41',
        fontFamily: "'Fira Code', 'Courier New', monospace",
        paddingBottom: '5rem', // space for ticker tape
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Scanline />

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-10px)}
          30%{transform:translateX(10px)}
          45%{transform:translateX(-8px)}
          60%{transform:translateX(8px)}
          75%{transform:translateX(-4px)}
          90%{transform:translateX(4px)}
        }
        @keyframes priceUp {
          0%{background:rgba(0,255,65,0.25)}
          100%{background:transparent}
        }
        @keyframes priceDown {
          0%{background:rgba(255,48,48,0.25)}
          100%{background:transparent}
        }
        .flash-up { animation: priceUp 0.18s ease-out; }
        .flash-down { animation: priceDown 0.18s ease-out; }
      `}</style>

      {/* Circuit Breaker Overlay */}
      <AnimatePresence>
        {circuitActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(180,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: circuitShake ? 'shake 0.5s ease-in-out' : 'none',
            }}
          >
            <div style={{ textAlign: 'center', color: '#fff', fontFamily: "'Fira Code', monospace" }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.05em' }}>
                מסחר בלבן הושהה זמנית
              </div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.75rem', opacity: 0.7 }}>
                CIRCUIT BREAKER ACTIVATED
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div
        style={{
          borderBottom: '1px solid rgba(0,255,65,0.2)',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,255,65,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', opacity: 0.6 }}>
            LEBENCHECK TERMINAL v2.5
          </span>
          <span style={{ opacity: 0.3 }}>|</span>
          <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em' }}>
            שוק חי
          </span>
          <BlinkingDot />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.8rem', opacity: 0.7, letterSpacing: '0.08em' }}>
            {clock}
          </span>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.6rem', opacity: 0.5, letterSpacing: '0.1em' }}>יתרה</div>
            <div
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#00ff41',
                letterSpacing: '0.05em',
              }}
            >
              ₪{balance.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Trade toast */}
      <AnimatePresence>
        {tradeMsg && (
          <motion.div
            key={tradeMsg}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
              background: 'rgba(0,255,65,0.1)',
              border: '1px solid rgba(0,255,65,0.4)',
              borderRadius: 4,
              padding: '0.5rem 1.25rem',
              fontSize: '0.8rem',
              color: '#00ff41',
              letterSpacing: '0.05em',
              backdropFilter: 'blur(4px)',
            }}
          >
            {tradeMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div style={{ padding: '1.5rem', maxWidth: 1200, margin: '0 auto' }}>

        {/* Section label */}
        <div
          style={{
            fontSize: '0.6rem',
            letterSpacing: '0.2em',
            opacity: 0.4,
            marginBottom: '1.25rem',
            textTransform: 'uppercase',
          }}
        >
          ━━ מצוטטים פעילים ━━
        </div>

        {/* Ticker cards grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
          }}
        >
          {TICKERS.map((ticker) => {
            const live = livePrices[ticker.id] ?? 0
            const base = basePricesRef.current[ticker.id] ?? live
            const change = live - base
            const changePct = base > 0 ? (change / base) * 100 : 0
            const isUp = change >= 0
            const flash = flashes[ticker.id]
            const pos = portfolio.get(ticker.id)
            const unrealizedPnl = pos ? (live - pos.avgBuyPrice) * pos.units : null

            return (
              <motion.div
                key={ticker.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                style={{
                  border: '1px solid rgba(0,255,65,0.2)',
                  borderRadius: 4,
                  background: 'rgba(0,255,65,0.03)',
                  padding: '1.25rem',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top row: ticker + change */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        color: '#00ff41',
                      }}
                    >
                      {ticker.id}
                    </div>
                    <div
                      style={{
                        fontSize: '0.65rem',
                        opacity: 0.55,
                        letterSpacing: '0.05em',
                        marginTop: 2,
                      }}
                    >
                      {ticker.hebrewName}
                    </div>
                  </div>

                  {/* Change badge */}
                  <div
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: isUp ? '#00ff41' : '#ff3030',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    {isUp ? '▲' : '▼'}
                    {Math.abs(changePct).toFixed(2)}%
                  </div>
                </div>

                {/* Live price */}
                <div
                  className={flash === 'up' ? 'flash-up' : flash === 'down' ? 'flash-down' : ''}
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: 700,
                    color: isUp ? '#00ff41' : '#ff3030',
                    letterSpacing: '0.04em',
                    marginBottom: '0.25rem',
                    borderRadius: 3,
                    padding: '0 2px',
                    transition: 'color 0.15s',
                  }}
                >
                  ₪{live.toFixed(2)}
                </div>

                {/* Change absolute */}
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: isUp ? '#00ff41' : '#ff3030',
                    opacity: 0.8,
                    marginBottom: '0.85rem',
                  }}
                >
                  {isUp ? '+' : ''}{change.toFixed(3)} מתחילת המפכן
                </div>

                {/* Portfolio position */}
                {pos && (
                  <div
                    style={{
                      background: 'rgba(0,255,65,0.06)',
                      border: '1px solid rgba(0,255,65,0.15)',
                      borderRadius: 3,
                      padding: '0.4rem 0.6rem',
                      marginBottom: '0.85rem',
                      fontSize: '0.65rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ opacity: 0.6 }}>מחזיק</span>
                      <span>{pos.units} יח'</span>
                    </div>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}
                    >
                      <span style={{ opacity: 0.6 }}>מחיר ממוצע</span>
                      <span>₪{pos.avgBuyPrice.toFixed(3)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ opacity: 0.6 }}>P&amp;L לא ממומש</span>
                      <span
                        style={{
                          color:
                            unrealizedPnl !== null && unrealizedPnl >= 0
                              ? '#00ff41'
                              : '#ff3030',
                          fontWeight: 600,
                        }}
                      >
                        {unrealizedPnl !== null
                          ? `${unrealizedPnl >= 0 ? '+' : ''}₪${unrealizedPnl.toFixed(2)}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Quantity selector */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <button
                    onClick={() => adjustQty(ticker.id, -1)}
                    style={qtyBtnStyle}
                  >
                    −
                  </button>
                  <span
                    style={{
                      flex: 1,
                      textAlign: 'center',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {quantities[ticker.id]}
                  </span>
                  <button
                    onClick={() => adjustQty(ticker.id, 1)}
                    style={qtyBtnStyle}
                  >
                    +
                  </button>
                </div>

                {/* BUY / SELL */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleBuy(ticker)}
                    style={{
                      ...tradeBtnBase,
                      flex: 1,
                      background: 'rgba(0,255,65,0.12)',
                      border: '1px solid rgba(0,255,65,0.5)',
                      color: '#00ff41',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(0,255,65,0.25)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(0,255,65,0.12)'
                    }}
                  >
                    קנה ▲
                  </button>
                  <button
                    onClick={() => handleSell(ticker)}
                    style={{
                      ...tradeBtnBase,
                      flex: 1,
                      background: 'rgba(255,48,48,0.1)',
                      border: '1px solid rgba(255,48,48,0.5)',
                      color: '#ff3030',
                    }}
                    onMouseEnter={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(255,48,48,0.22)'
                    }}
                    onMouseLeave={e => {
                      ;(e.currentTarget as HTMLButtonElement).style.background =
                        'rgba(255,48,48,0.1)'
                    }}
                  >
                    מכור ▼
                  </button>
                </div>

                {/* Corner decoration */}
                <div
                  aria-hidden
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: 40,
                    height: 40,
                    borderBottom: '1px solid rgba(0,255,65,0.15)',
                    borderLeft: '1px solid rgba(0,255,65,0.15)',
                    pointerEvents: 'none',
                  }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Portfolio summary */}
        {portfolio.size > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <div
              style={{
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                opacity: 0.4,
                marginBottom: '1rem',
                textTransform: 'uppercase',
              }}
            >
              ━━ תיק מחזיקה ━━
            </div>
            <div
              style={{
                border: '1px solid rgba(0,255,65,0.2)',
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                <thead>
                  <tr
                    style={{
                      background: 'rgba(0,255,65,0.06)',
                      borderBottom: '1px solid rgba(0,255,65,0.15)',
                    }}
                  >
                    {['טיקר', 'יחידות', 'מחיר ממוצע', 'מחיר נוכחי', 'P&L לא ממומש'].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'right',
                          opacity: 0.6,
                          fontWeight: 400,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from(portfolio.entries()).map(([id, pos]) => {
                    const live = livePrices[id] ?? 0
                    const pnl = (live - pos.avgBuyPrice) * pos.units
                    return (
                      <tr
                        key={id}
                        style={{ borderBottom: '1px solid rgba(0,255,65,0.08)' }}
                      >
                        <td style={tdStyle}>{id}</td>
                        <td style={tdStyle}>{pos.units}</td>
                        <td style={tdStyle}>₪{pos.avgBuyPrice.toFixed(3)}</td>
                        <td style={tdStyle}>₪{live.toFixed(3)}</td>
                        <td
                          style={{
                            ...tdStyle,
                            color: pnl >= 0 ? '#00ff41' : '#ff3030',
                            fontWeight: 600,
                          }}
                        >
                          {pnl >= 0 ? '+' : ''}₪{pnl.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div
          style={{
            marginTop: '2.5rem',
            padding: '0.75rem 1rem',
            border: '1px solid rgba(0,255,65,0.12)',
            borderRadius: 3,
            fontSize: '0.65rem',
            opacity: 0.5,
            letterSpacing: '0.03em',
            lineHeight: 1.6,
          }}
        >
          * המחירים המוצגים בזמן אמת הם סימולציה בלבד לצורך בידור. המחירים האמיתיים מתעדכנים כל 6 שעות.
        </div>
      </div>
    </div>
  )
}

/* ─── Shared styles ──────────────────────────────────────── */

const qtyBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  background: 'transparent',
  border: '1px solid rgba(0,255,65,0.3)',
  color: '#00ff41',
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: "'Fira Code', monospace",
  fontSize: '1rem',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const tradeBtnBase: React.CSSProperties = {
  padding: '0.45rem',
  borderRadius: 3,
  cursor: 'pointer',
  fontFamily: "'Fira Code', monospace",
  fontSize: '0.75rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  transition: 'background 0.12s',
}

const tdStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  textAlign: 'right',
}

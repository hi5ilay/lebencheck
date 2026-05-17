'use client'

import { useEffect, useState, useRef } from 'react'

interface TickerTapeProps {
  prices: Record<string, { price: number; change: number }>
}

const TICKER_LABELS: Record<string, string> = {
  LBGIL1: 'LBGIL-1%',
  LBGIL3: 'LBGIL-3%',
  LBASH1: 'LBASH-1%',
  LBASH3: 'LBASH-3%',
}

export default function TickerTape({ prices }: TickerTapeProps) {
  const [crashMode, setCrashMode] = useState(false)
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true
    try {
      setCrashMode(!!sessionStorage.getItem('tickerCrash'))
    } catch { /* ignore */ }
  }, [])

  const tickers = Object.entries(TICKER_LABELS)

  function buildItem(id: string, label: string) {
    const entry = prices[id]
    if (!entry) return null
    const isUp = entry.change >= 0
    const arrow = isUp ? '▲' : '▼'
    return `${label} ₪${entry.price.toFixed(2)} ${arrow}`
  }

  const baseItems = tickers
    .map(([id, label]) => buildItem(id, label))
    .filter(Boolean) as string[]

  const crashItem = crashMode ? '| LEBEN CRASH OF 2025 🔴' : null

  const allItems = baseItems.flatMap(item => (crashItem ? [item, crashItem] : [item]))

  // duplicate for seamless loop
  const content = [...allItems, ...allItems].join('  |  ')

  return (
    <div
      aria-label="מחירי לבן בזמן אמת"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#000',
        borderTop: '1px solid rgba(0,255,65,0.25)',
        height: 32,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <style>{`
        @keyframes ticker-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-inner {
          display: inline-flex;
          white-space: nowrap;
          animation: ticker-scroll 40s linear infinite;
          will-change: transform;
        }
        .ticker-inner:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="ticker-inner">
        <span
          style={{
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontSize: '0.72rem',
            color: '#00ff41',
            letterSpacing: '0.06em',
            padding: '0 1.5rem',
          }}
        >
          {content}
        </span>
        {/* duplicate span — seamless loop */}
        <span
          aria-hidden
          style={{
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontSize: '0.72rem',
            color: '#00ff41',
            letterSpacing: '0.06em',
            padding: '0 1.5rem',
          }}
        >
          {content}
        </span>
      </div>
    </div>
  )
}

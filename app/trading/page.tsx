'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import TradingMode from '@/components/TradingMode'
import TickerTape from '@/components/TickerTape'
import { getMockPrices } from '@/lib/fetchPrices'

function buildTickerPrices() {
  const snapshot = getMockPrices()

  const TICKER_PRODUCT_IDS: Record<string, string> = {
    LBGIL1: 'gil-1-1000',
    LBGIL3: 'gil-3-1000',
    LBASH1: 'ashel-1-1000',
    LBASH3: 'ashel-3-1000',
  }

  const result: Record<string, { price: number; change: number }> = {}

  for (const [tickerId, productId] of Object.entries(TICKER_PRODUCT_IDS)) {
    const entries = snapshot.allEntries.filter(e => e.product.id === productId)
    if (entries.length > 0) {
      const avg = entries.reduce((s, e) => s + e.price, 0) / entries.length
      // Simulate a small random change for display
      const change = (Math.random() * 0.1 - 0.05)
      result[tickerId] = { price: avg, change }
    }
  }

  return result
}

export default function TradingPage() {
  const { user, loading } = useAuth()
  const [tickerPrices] = useState(() => buildTickerPrices())

  // Loading skeleton
  if (loading) {
    return (
      <div
        style={{
          background: '#0a0a0a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '3rem 2rem',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          color: '#00ff41',
        }}
      >
        <div style={{ opacity: 0.7, letterSpacing: '0.1em', fontSize: '0.9rem' }}>
          AUTHENTICATING...
        </div>
        <div
          style={{
            marginTop: '1rem',
            fontSize: '1.2rem',
            animation: 'blink 1s step-end infinite',
          }}
        >
          █
        </div>
        <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    )
  }

  // Not authenticated
  if (!user) {
    return (
      <div
        style={{
          background: '#0a0a0a',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          color: '#00ff41',
          textAlign: 'center',
          padding: '2rem',
        }}
      >
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⛔</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.08em' }}>
          נדרשת כניסה לחשבון
        </div>
        <div style={{ opacity: 0.55, fontSize: '0.8rem', marginBottom: '2rem', letterSpacing: '0.05em' }}>
          ACCESS DENIED — AUTHENTICATION REQUIRED
        </div>
        <Link
          href="/login"
          style={{
            padding: '0.6rem 2rem',
            border: '1px solid rgba(0,255,65,0.5)',
            borderRadius: 4,
            color: '#00ff41',
            textDecoration: 'none',
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            background: 'rgba(0,255,65,0.08)',
            transition: 'background 0.15s',
          }}
        >
          כניסה לחשבון
        </Link>
        <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
      </div>
    )
  }

  return (
    <>
      <TradingMode />
      <TickerTape prices={tickerPrices} />
    </>
  )
}

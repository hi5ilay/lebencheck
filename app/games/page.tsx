'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useAuth } from '@/components/AuthProvider'

interface GameCard {
  icon: string
  name: string
  description: string
  href: string
  accentColor: string
}

const GAMES: GameCard[] = [
  {
    icon: '🐦',
    name: 'פלאפי לבן',
    description: 'תעבור מכשולים ותרוויח ₪ אמיתיים!',
    href: '/games/flappy',
    accentColor: '#38bdf8',
  },
  {
    icon: '🎰',
    name: 'סלוטס',
    description: 'סובב את הגלגלים וזכה בפרסים',
    href: '/games/slots',
    accentColor: '#a78bfa',
  },
  {
    icon: '🎡',
    name: 'רולטה',
    description: 'הגלגל המסתובב מחכה לך',
    href: '/games/roulette',
    accentColor: '#f43f5e',
  },
  {
    icon: '✈️',
    name: 'מטוס קריסה',
    description: 'פרוש לפני שהמטוס נופל',
    href: '/games/plane',
    accentColor: '#f97316',
  },
  {
    icon: '🔵',
    name: 'פלינקו',
    description: 'זרוק את הכדור ותראה איפה הוא נוחת',
    href: '/games/plinko',
    accentColor: '#22d3ee',
  },
  {
    icon: '💣',
    name: 'מוקשים',
    description: 'חשוף אבנים יקרות — אל תפגע במוקש',
    href: '/games/mines',
    accentColor: '#4ade80',
  },
]

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] } },
}

export default function GamesPage() {
  const { user, balance, loading } = useAuth()

  if (loading) {
    return (
      <div
        style={{ background: '#111', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(245,158,11,0.2)',
            borderTop: '3px solid #F59E0B',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!user) {
    return (
      <div
        style={{
          background: '#111',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Heebo, sans-serif',
          color: '#fff',
          padding: '2rem',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎰</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: '#F59E0B' }}>
          לא מחובר
        </h1>
        <p style={{ opacity: 0.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
          יש להתחבר כדי לשחק במשחקים
        </p>
        <Link
          href="/login"
          style={{
            padding: '0.65rem 2.25rem',
            background: '#F59E0B',
            borderRadius: 8,
            color: '#000',
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.95rem',
          }}
        >
          כניסה לחשבון
        </Link>
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#111',
        minHeight: '100vh',
        fontFamily: 'Heebo, sans-serif',
        color: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, #1a1200 0%, #111 100%)',
          borderBottom: '1px solid rgba(245,158,11,0.2)',
          padding: '2rem 1.5rem 1.5rem',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#F59E0B',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          המשחקים שלי
        </h1>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.25)',
            borderRadius: 999,
            padding: '0.35rem 1rem',
            fontSize: '0.9rem',
            color: '#F59E0B',
            fontWeight: 600,
          }}
        >
          <span>💰</span>
          <span>היתרה שלך: ₪{balance.toFixed(2)}</span>
        </div>
      </div>

      {/* Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          maxWidth: 960,
          margin: '2rem auto',
          padding: '0 1.25rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}
      >
        {GAMES.map((game) => (
          <motion.div
            key={game.href}
            variants={cardVariants}
            whileHover={{
              scale: 1.03,
              boxShadow: `0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px ${game.accentColor}33`,
              transition: { duration: 0.2 },
            }}
            style={{
              background: '#1a1a1a',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12,
              overflow: 'hidden',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                height: 5,
                background: `linear-gradient(90deg, ${game.accentColor}, ${game.accentColor}88)`,
              }}
            />
            <div style={{ padding: '1.5rem' }}>
              <div style={{ fontSize: '2.75rem', marginBottom: '0.75rem', lineHeight: 1 }}>
                {game.icon}
              </div>
              <h2
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  marginBottom: '0.35rem',
                  color: '#fff',
                }}
              >
                {game.name}
              </h2>
              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'rgba(255,255,255,0.55)',
                  marginBottom: '1.25rem',
                  lineHeight: 1.5,
                }}
              >
                {game.description}
              </p>
              <Link
                href={game.href}
                style={{
                  display: 'inline-block',
                  padding: '0.45rem 1.5rem',
                  borderRadius: 6,
                  background: game.accentColor,
                  color: '#000',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                }}
              >
                שחק
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

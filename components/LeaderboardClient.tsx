'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface WealthEntry {
  rank: number
  username: string
  balance: number
  createdAt: string
}

export interface FlappyEntry {
  rank: number
  username: string
  highScore: number
  createdAt: string
}

interface LeaderboardClientProps {
  wealthData: WealthEntry[]
  flappyData: FlappyEntry[]
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

const rowVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: [0.0, 0.0, 0.2, 1] as [number, number, number, number] },
  }),
}

type Tab = 'wealth' | 'flappy' | 'trading'

const TABS: { id: Tab; label: string }[] = [
  { id: 'wealth', label: 'עושר' },
  { id: 'flappy', label: 'ציפור' },
  { id: 'trading', label: 'מסחר' },
]

export default function LeaderboardClient({ wealthData, flappyData }: LeaderboardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>('wealth')

  return (
    <div>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid rgba(245,158,11,0.2)',
          paddingBottom: '0',
        }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              position: 'relative',
              padding: '0.6rem 1.25rem',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: activeTab === tab.id ? '#F59E0B' : 'rgba(255,255,255,0.45)',
              fontFamily: 'Heebo, sans-serif',
              fontSize: '0.95rem',
              fontWeight: activeTab === tab.id ? 700 : 400,
              transition: 'color 0.15s',
            }}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-underline"
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: '#F59E0B',
                  borderRadius: 2,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'wealth' && (
          <motion.div
            key="wealth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <LeaderboardTable
              headers={['דירוג', 'שם משתמש', 'יתרה', 'תאריך הצטרפות']}
              rows={wealthData.map((e, i) => ({
                rank: e.rank,
                cols: [
                  formatRank(e.rank),
                  e.username,
                  `₪${e.balance.toFixed(2)}`,
                  formatDate(e.createdAt),
                ],
                index: i,
              }))}
            />
          </motion.div>
        )}

        {activeTab === 'flappy' && (
          <motion.div
            key="flappy"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <LeaderboardTable
              headers={['דירוג', 'שם משתמש', 'שיא', 'תאריך']}
              rows={flappyData.map((e, i) => ({
                rank: e.rank,
                cols: [
                  formatRank(e.rank),
                  e.username,
                  String(e.highScore),
                  formatDate(e.createdAt),
                ],
                index: i,
              }))}
            />
          </motion.div>
        )}

        {activeTab === 'trading' && (
          <motion.div
            key="trading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ textAlign: 'center', padding: '4rem 2rem' }}
          >
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📊</div>
            <div
              style={{
                fontSize: '1.2rem',
                fontWeight: 700,
                color: '#F59E0B',
                marginBottom: '0.5rem',
              }}
            >
              בקרוב
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem' }}>
              לוח תוצאות המסחר יושק בקרוב
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Sub-components ─────────────────────────────────────── */

function formatRank(rank: number) {
  return MEDAL[rank] ? `${MEDAL[rank]} ${rank}` : `${rank}`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    })
  } catch {
    return iso
  }
}

interface TableRow {
  rank: number
  cols: string[]
  index: number
}

function LeaderboardTable({ headers, rows }: { headers: string[]; rows: TableRow[] }) {
  if (rows.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.9rem',
        }}
      >
        אין נתונים להצגה
      </div>
    )
  }

  return (
    <div
      style={{
        border: '1px solid rgba(245,158,11,0.2)',
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              background: 'rgba(245,158,11,0.08)',
              borderBottom: '1px solid rgba(245,158,11,0.2)',
            }}
          >
            {headers.map(h => (
              <th
                key={h}
                style={{
                  padding: '0.75rem 1rem',
                  textAlign: 'right',
                  fontFamily: 'Heebo, sans-serif',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgba(245,158,11,0.8)',
                  letterSpacing: '0.03em',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <motion.tr
              key={row.index}
              custom={row.index}
              variants={rowVariants}
              initial="hidden"
              animate="visible"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                background: row.rank <= 3 ? `rgba(245,158,11,0.0${row.rank + 2})` : 'transparent',
              }}
            >
              {row.cols.map((col, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '0.7rem 1rem',
                    textAlign: 'right',
                    fontFamily: 'Heebo, sans-serif',
                    fontSize: '0.88rem',
                    color: ci === 0 && row.rank <= 3 ? '#F59E0B' : 'rgba(255,255,255,0.85)',
                    fontWeight: ci === 0 ? 700 : 400,
                  }}
                >
                  {col}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

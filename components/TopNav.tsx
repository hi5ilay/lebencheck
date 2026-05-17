'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, TrendingUp, GamepadIcon, Trophy, LogOut } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useAuth } from '@/components/AuthProvider'

function cn(...args: Parameters<typeof clsx>) {
  return twMerge(clsx(...args))
}

interface NavLink {
  href: string
  label: string
  authRequired?: boolean
  icon?: React.ReactNode
}

const publicLinks: NavLink[] = [
  { href: '/', label: 'השוואה' },
  { href: '/history', label: 'היסטוריה' },
  { href: '/eilat', label: 'אילת' },
  { href: '/calculator', label: 'מחשבון' },
]

const authLinks: NavLink[] = [
  { href: '/trading', label: 'מסחר', icon: <TrendingUp size={14} /> },
  { href: '/games', label: 'משחקים', icon: <GamepadIcon size={14} /> },
  { href: '/leaderboard', label: 'לוח תוצאות', icon: <Trophy size={14} /> },
]

function BalanceDisplay({ balance }: { balance: number }) {
  const formatted = balance.toLocaleString('he-IL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return (
    <motion.span
      key={formatted}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="tabular-nums font-mono text-sm font-600 text-[var(--emerald)]"
    >
      ₪{formatted}
    </motion.span>
  )
}

export function TopNav() {
  const pathname = usePathname()
  const { user, profile, balance, loading, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Logo click counter — 5 rapid clicks within 2s → circuit breaker
  const clickTimestamps = useRef<number[]>([])
  function handleLogoClick() {
    const now = Date.now()
    clickTimestamps.current = clickTimestamps.current
      .filter((t) => now - t < 2000)
      .concat(now)
    if (clickTimestamps.current.length >= 5) {
      clickTimestamps.current = []
      try {
        sessionStorage.setItem('circuitBreaker', '1')
      } catch {
        // ignore
      }
    }
  }

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const allLinks = [...publicLinks, ...(user ? authLinks : [])]

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--surface)] border-b border-[var(--border)] shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link
            href="/"
            onClick={handleLogoClick}
            className="flex items-center gap-2 shrink-0 select-none"
            aria-label="לבןצ׳ק — דף הבית"
          >
            <span className="text-2xl leading-none" aria-hidden="true">🥛</span>
            <span
              className="font-800 text-lg tracking-tight leading-none"
              style={{ color: 'var(--blue)', fontWeight: 800 }}
            >
              לבןצ׳ק
            </span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden md:flex items-center gap-1 flex-1 justify-center" role="list">
            {publicLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'px-3 py-1.5 text-sm font-500 rounded-md transition-colors relative',
                    isActive(href)
                      ? 'text-[var(--blue)]'
                      : 'text-[var(--muted)] hover:text-[var(--text)]'
                  )}
                >
                  {label}
                  {isActive(href) && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 right-2 left-2 h-0.5 rounded-full bg-[var(--blue)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                </Link>
              </li>
            ))}

            {user && (
              <>
                <li className="w-px h-4 bg-[var(--border)] mx-1" aria-hidden="true" />
                {authLinks.map(({ href, label, icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        'px-3 py-1.5 text-sm font-500 rounded-md transition-colors flex items-center gap-1.5 relative',
                        isActive(href)
                          ? 'text-[var(--blue)]'
                          : 'text-[var(--muted)] hover:text-[var(--text)]'
                      )}
                    >
                      {icon}
                      {label}
                      {isActive(href) && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute bottom-0 right-2 left-2 h-0.5 rounded-full bg-[var(--blue)]"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </Link>
                  </li>
                ))}
              </>
            )}
          </ul>

          {/* Right side: auth */}
          <div className="hidden md:flex items-center gap-3 shrink-0">
            {loading ? (
              <div className="h-8 w-24 rounded-md shimmer" />
            ) : user && profile ? (
              <>
                <div className="flex flex-col items-end leading-tight">
                  <span className="text-xs text-[var(--muted)]">{profile.username}</span>
                  <BalanceDisplay balance={balance} />
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--red)] transition-colors rounded-md hover:bg-red-50"
                  aria-label="התנתקות"
                >
                  <LogOut size={15} />
                  <span className="text-xs">יציאה</span>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-1.5 text-sm font-600 text-[var(--blue)] border border-[var(--blue)] rounded-md hover:bg-blue-50 transition-colors"
                >
                  התחבר
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-1.5 text-sm font-600 text-white rounded-md transition-colors"
                  style={{ background: 'var(--blue)' }}
                >
                  הרשמה
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-[var(--text)] rounded-md"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'סגור תפריט' : 'פתח תפריט'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />

            {/* Panel slides in from right (RTL = right side) */}
            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              className="fixed top-0 right-0 z-50 h-full w-72 bg-[var(--surface)] shadow-2xl flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between px-5 h-14 border-b border-[var(--border)]">
                <span className="font-800 text-[var(--blue)] text-lg">לבןצ׳ק 🥛</span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1.5 text-[var(--muted)] rounded-md hover:bg-gray-100"
                  aria-label="סגור תפריט"
                >
                  <X size={18} />
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto px-4 py-4">
                <ul className="flex flex-col gap-1" role="list">
                  {allLinks.map(({ href, label, icon }) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2.5 text-sm font-500 rounded-lg transition-colors',
                          isActive(href)
                            ? 'bg-blue-50 text-[var(--blue)] font-600'
                            : 'text-[var(--text)] hover:bg-gray-50'
                        )}
                      >
                        {icon}
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>

              <div className="px-4 py-4 border-t border-[var(--border)]">
                {loading ? (
                  <div className="h-10 rounded-md shimmer" />
                ) : user && profile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--muted)]">{profile.username}</span>
                      <BalanceDisplay balance={balance} />
                    </div>
                    <button
                      onClick={signOut}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--red)] transition-colors rounded-md"
                    >
                      <LogOut size={15} />
                      יציאה
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      className="w-full text-center px-4 py-2 text-sm font-600 text-[var(--blue)] border border-[var(--blue)] rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      התחבר
                    </Link>
                    <Link
                      href="/signup"
                      className="w-full text-center px-4 py-2 text-sm font-600 text-white rounded-lg transition-colors"
                      style={{ background: 'var(--blue)' }}
                    >
                      הרשמה
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

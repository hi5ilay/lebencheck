'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const HEBREW_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'שם משתמש או סיסמה שגויים',
  'Email not confirmed': 'החשבון טרם אומת',
  'Too many requests': 'יותר מדי ניסיונות. נסה שוב מאוחר יותר',
}

function mapError(msg: string): string {
  for (const [key, val] of Object.entries(HEBREW_ERRORS)) {
    if (msg.includes(key)) return val
  }
  return 'אירעה שגיאה. נסה שוב'
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const trimmed = username.trim().toLowerCase()
    if (!trimmed) {
      setError('נא להזין שם משתמש')
      return
    }
    if (!password) {
      setError('נא להזין סיסמה')
      return
    }

    setLoading(true)
    const email = `${trimmed}@lebencheck.app`

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setLoading(false)

    if (authError) {
      setError(mapError(authError.message))
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg border border-[var(--border)] overflow-hidden">
          {/* Header stripe */}
          <div
            className="h-2 w-full"
            style={{ background: 'linear-gradient(90deg, var(--blue) 0%, var(--blue-light) 100%)' }}
          />

          <div className="px-8 py-8">
            {/* Logo + heading */}
            <div className="text-center mb-8">
              <span className="text-5xl block mb-3" aria-hidden="true">🥛</span>
              <h1
                className="text-2xl font-800 tracking-tight"
                style={{ color: 'var(--blue)', fontWeight: 800 }}
              >
                כניסה
              </h1>
              <p className="text-sm text-[var(--muted)] mt-1">
                ברוך הבא בחזרה ללבןצ׳ק
              </p>
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center"
                role="alert"
                aria-live="polite"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-sm font-600 text-[var(--text)]"
                >
                  שם משתמש
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  dir="ltr"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loading}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--blue-light)] focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
                  placeholder="your_username"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-600 text-[var(--text)]"
                >
                  סיסמה
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--blue-light)] focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 pe-10"
                    placeholder="••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 left-0 flex items-center px-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-700 text-white transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-1"
                style={{
                  background: 'var(--blue)',
                  boxShadow: '0 2px 8px rgba(30,58,138,0.25)',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>מתחבר...</span>
                  </>
                ) : (
                  'כניסה'
                )}
              </button>
            </form>

            {/* Signup link */}
            <p className="text-center text-sm text-[var(--muted)] mt-6">
              אין לך חשבון?{' '}
              <Link
                href="/signup"
                className="text-[var(--blue-light)] font-600 hover:underline"
              >
                הרשמה
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

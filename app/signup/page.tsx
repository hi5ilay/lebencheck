'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/

function validateUsername(v: string): string {
  if (!v) return 'נא להזין שם משתמש'
  if (v.length < 3) return 'שם המשתמש חייב להכיל לפחות 3 תווים'
  if (v.length > 20) return 'שם המשתמש לא יכול לעלות על 20 תווים'
  if (!USERNAME_RE.test(v)) return 'שם המשתמש יכול להכיל אותיות באנגלית, מספרים וקו תחתון בלבד'
  return ''
}

function mapError(msg: string): string {
  if (msg.includes('User already registered') || msg.includes('already registered')) return 'שם המשתמש כבר בשימוש'
  if (msg.includes('Password should be at least') || msg.includes('password')) return 'הסיסמה חייבת להכיל לפחות 6 תווים'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר'
  return `שגיאה: ${msg}`
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate() {
    const errs: Record<string, string> = {}
    const usernameErr = validateUsername(username.trim())
    if (usernameErr) errs.username = usernameErr
    if (!password) {
      errs.password = 'נא להזין סיסמה'
    } else if (password.length < 6) {
      errs.password = 'הסיסמה חייבת להכיל לפחות 6 תווים'
    }
    if (!confirmPassword) {
      errs.confirmPassword = 'נא לאשר את הסיסמה'
    } else if (password !== confirmPassword) {
      errs.confirmPassword = 'הסיסמאות אינן תואמות'
    }
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setGeneralError('')

    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLoading(true)
    const trimmed = username.trim().toLowerCase()
    const email = `${trimmed}@lebencheck.app`

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: trimmed },
      },
    })

    setLoading(false)

    if (authError) {
      setGeneralError(mapError(authError.message))
      return
    }

    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-lg border border-[var(--border)] overflow-hidden">
          {/* Header stripe */}
          <div
            className="h-2 w-full"
            style={{ background: 'linear-gradient(90deg, var(--emerald) 0%, var(--blue-light) 100%)' }}
          />

          <div className="px-8 py-8">
            {/* Logo + heading */}
            <div className="text-center mb-8">
              <span className="text-5xl block mb-3" aria-hidden="true">🥛</span>
              <h1
                className="text-2xl font-800 tracking-tight"
                style={{ color: 'var(--blue)', fontWeight: 800 }}
              >
                הרשמה
              </h1>
              <p className="text-sm text-[var(--muted)] mt-1">
                הצטרף ללבןצ׳ק ועקוב אחרי מחירי הלבן
              </p>
            </div>

            {/* General error */}
            {generalError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center"
                role="alert"
                aria-live="polite"
              >
                {generalError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="username" className="text-sm font-600 text-[var(--text)]">
                  שם משתמש
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  dir="ltr"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (errors.username) setErrors((p) => ({ ...p, username: '' }))
                  }}
                  disabled={loading}
                  aria-describedby={errors.username ? 'username-err' : undefined}
                  aria-invalid={!!errors.username}
                  className={`w-full px-3.5 py-2.5 rounded-lg border bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 ${
                    errors.username
                      ? 'border-[var(--red)] focus:border-[var(--red)]'
                      : 'border-[var(--border)] focus:border-[var(--blue-light)]'
                  }`}
                  placeholder="3-20 תווים, אנגלית ומספרים"
                />
                {errors.username && (
                  <p id="username-err" className="text-xs text-[var(--red)]" role="alert">
                    {errors.username}
                  </p>
                )}
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-600 text-[var(--text)]">
                  סיסמה
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    dir="ltr"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors((p) => ({ ...p, password: '' }))
                    }}
                    disabled={loading}
                    aria-describedby={errors.password ? 'password-err' : undefined}
                    aria-invalid={!!errors.password}
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 pe-10 ${
                      errors.password
                        ? 'border-[var(--red)] focus:border-[var(--red)]'
                        : 'border-[var(--border)] focus:border-[var(--blue-light)]'
                    }`}
                    placeholder="לפחות 6 תווים"
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
                {errors.password && (
                  <p id="password-err" className="text-xs text-[var(--red)]" role="alert">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-sm font-600 text-[var(--text)]">
                  אישור סיסמה
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    dir="ltr"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' }))
                    }}
                    disabled={loading}
                    aria-describedby={errors.confirmPassword ? 'confirm-err' : undefined}
                    aria-invalid={!!errors.confirmPassword}
                    className={`w-full px-3.5 py-2.5 rounded-lg border bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60 pe-10 ${
                      errors.confirmPassword
                        ? 'border-[var(--red)] focus:border-[var(--red)]'
                        : 'border-[var(--border)] focus:border-[var(--blue-light)]'
                    }`}
                    placeholder="הזן שוב את הסיסמה"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute inset-y-0 left-0 flex items-center px-3 text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                    tabIndex={-1}
                    aria-label={showConfirm ? 'הסתר אישור סיסמה' : 'הצג אישור סיסמה'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p id="confirm-err" className="text-xs text-[var(--red)]" role="alert">
                    {errors.confirmPassword}
                  </p>
                )}
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
                    <span>נרשם...</span>
                  </>
                ) : (
                  'הרשמה'
                )}
              </button>
            </form>

            {/* Login link */}
            <p className="text-center text-sm text-[var(--muted)] mt-6">
              כבר יש לך חשבון?{' '}
              <Link href="/login" className="text-[var(--blue-light)] font-600 hover:underline">
                כניסה
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

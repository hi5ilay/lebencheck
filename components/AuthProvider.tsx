'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

interface Profile {
  id: string
  username: string
  balance: number
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  balance: number
  loading: boolean
  signOut: () => Promise<void>
  refreshBalance: () => Promise<void>
  setLocalBalance: (n: number) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, balance')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as Profile
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [balance, setBalance] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const refreshBalance = useCallback(async () => {
    if (!user) return
    const p = await fetchProfile(user.id)
    if (p) {
      setProfile(p)
      setBalance(p.balance)
    }
  }, [user])

  const setLocalBalance = useCallback((n: number) => {
    setBalance(n)
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setBalance(0)
  }, [supabase])

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (p) {
          setProfile(p)
          setBalance(p.balance)
        }
      }
      setLoading(false)
    })

    // Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        const p = await fetchProfile(session.user.id)
        if (p) {
          setProfile(p)
          setBalance(p.balance)
        }
        setLoading(false)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        setBalance(0)
        setLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider
      value={{ user, profile, balance, loading, signOut, refreshBalance, setLocalBalance }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

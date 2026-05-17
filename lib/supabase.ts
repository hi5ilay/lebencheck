import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  // Use real values only if they look valid — fall back to placeholder during build/prerender
  const url = rawUrl.startsWith('https://') ? rawUrl : 'https://placeholder.supabase.co'
  const key = rawKey.length > 20 ? rawKey : 'placeholder-anon-key-build-only'
  return createBrowserClient(url, key)
}

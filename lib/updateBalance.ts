import { createClient } from './supabase'

export async function updateBalance(userId: string, delta: number): Promise<number> {
  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single()

  const current = profile?.balance ?? 0
  const newBalance = Math.max(0, current + delta)

  await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', userId)

  return newBalance
}

export async function getBalance(userId: string): Promise<number> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('balance')
    .eq('id', userId)
    .single()
  return data?.balance ?? 0
}

export async function setBalance(userId: string, amount: number): Promise<number> {
  const supabase = createClient()
  const newBalance = Math.max(0, amount)
  await supabase
    .from('profiles')
    .update({ balance: newBalance })
    .eq('id', userId)
  return newBalance
}

'use client'

import { Mines } from '@/components/games/Mines'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'

export default function MinesPage() {
  const { user, loading } = useAuth()

  if (loading)
    return (
      <div className="min-h-screen bg-[#111] flex items-center justify-center text-white">
        טוען...
      </div>
    )

  if (!user)
    return (
      <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center gap-4">
        <p className="text-white text-xl">נדרשת כניסה לחשבון</p>
        <Link
          href="/login"
          className="px-6 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-500 transition-colors"
        >
          כניסה
        </Link>
      </div>
    )

  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center py-8 px-4">
      <h1 className="text-white text-2xl font-bold mb-6">💣 מוקשים</h1>
      <Mines />
    </div>
  )
}

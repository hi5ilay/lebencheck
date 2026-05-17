import type { Metadata } from 'next'
import { Heebo } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'
import { TopNav } from '@/components/TopNav'

const heebo = Heebo({
  subsets: ['hebrew', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-heebo',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "LebenCheck | לבןצ'ק — השוואת מחירי לבן",
  description:
    'השוואת מחירי לבן בין רשתות השיווק בישראל. עקוב אחרי מחירים, נתח מגמות ושחק במשחקי מסחר וירטואלי.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      className={`${heebo.variable} h-full antialiased`}
      style={{ fontFamily: 'var(--font-heebo), Heebo, sans-serif' }}
    >
      <body className="min-h-full flex flex-col bg-[var(--bg)] text-[var(--text)]">
        <AuthProvider>
          <TopNav />
          <main className="min-h-screen flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  )
}

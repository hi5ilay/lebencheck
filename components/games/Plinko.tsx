'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { updateBalance } from '@/lib/updateBalance'

const BET_OPTIONS = [1, 5, 10, 25, 50, 100]
const BUCKET_MULTIPLIERS = [0.5, 1, 2, 3, 5, 3, 2, 1, 0.5]
const ROWS = 8
const CANVAS_W = 400
const CANVAS_H = 500
const PEG_RADIUS = 4.5
const BALL_RADIUS = 7
const GRAVITY = 0.25
const MAX_BALLS = 5

interface Peg {
  x: number
  y: number
}

interface Ball {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  row: number        // which peg row we are heading toward
  col: number        // which column index within the row
  landed: boolean
  bucketIndex: number
  color: string
  winFlash: boolean
  winFlashTimer: number
}

function buildPegs(): Peg[] {
  const pegs: Peg[] = []
  const topPad = 60
  const bottomPad = 80
  const rowSpacing = (CANVAS_H - topPad - bottomPad) / (ROWS - 1)

  for (let r = 0; r < ROWS; r++) {
    const numPegs = r + 2 // row 0 → 2 pegs, row 7 → 9 pegs
    const totalW = (numPegs - 1) * 44
    const startX = (CANVAS_W - totalW) / 2
    const y = topPad + r * rowSpacing
    for (let c = 0; c < numPegs; c++) {
      pegs.push({ x: startX + c * 44, y })
    }
  }
  return pegs
}

const PEGS = buildPegs()

function getPegRow(r: number): Peg[] {
  const start = r * (r + 2) - r // sum of 2..r+1 = (r+2)(r+1)/2 - 1
  // Actually recompute properly
  let idx = 0
  for (let i = 0; i < r; i++) idx += i + 2
  const count = r + 2
  return PEGS.slice(idx, idx + count)
}

const BALL_COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#A855F7', '#EF4444']

let ballIdCounter = 0

function createBall(id: number, colorIdx: number): Ball {
  const jitter = (Math.random() - 0.5) * 6
  return {
    id,
    x: CANVAS_W / 2 + jitter,
    y: 20,
    vx: (Math.random() - 0.5) * 0.5,
    vy: 0,
    row: 0,
    col: 0,
    landed: false,
    bucketIndex: -1,
    color: BALL_COLORS[colorIdx % BALL_COLORS.length],
    winFlash: false,
    winFlashTimer: 0,
  }
}

export function Plinko() {
  const { user, balance, setLocalBalance } = useAuth()
  const [bet, setBet] = useState(10)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<Ball[]>([])
  const rafRef = useRef<number | null>(null)
  const [activeBalls, setActiveBalls] = useState(0)
  const [lastWin, setLastWin] = useState<string | null>(null)
  const balanceRef = useRef(balance)
  const betRef = useRef(bet)

  useEffect(() => { balanceRef.current = balance }, [balance])
  useEffect(() => { betRef.current = bet }, [bet])

  // Compute bucket x positions
  const bucketW = CANVAS_W / BUCKET_MULTIPLIERS.length
  const bucketXs = BUCKET_MULTIPLIERS.map((_, i) => bucketW * i + bucketW / 2)

  const getBucketForBall = (ball: Ball): number => {
    // find closest bucket center
    let best = 0
    let bestDist = Infinity
    bucketXs.forEach((bx, i) => {
      const d = Math.abs(ball.x - bx)
      if (d < bestDist) { bestDist = d; best = i }
    })
    return best
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Background
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#0d0d0d'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // Pegs
    PEGS.forEach((peg) => {
      ctx.beginPath()
      ctx.arc(peg.x, peg.y, PEG_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff99'
      ctx.fill()
      ctx.shadowColor = '#ffffff44'
      ctx.shadowBlur = 6
      ctx.fill()
      ctx.shadowBlur = 0
    })

    // Buckets
    BUCKET_MULTIPLIERS.forEach((mult, i) => {
      const x = i * bucketW
      const y = CANVAS_H - 56
      const isHigh = mult >= 3
      const isMid = mult >= 2

      // bucket bg
      const grad = ctx.createLinearGradient(x, y, x, CANVAS_H - 8)
      grad.addColorStop(0, isHigh ? '#10B98133' : isMid ? '#F59E0B22' : '#EF444422')
      grad.addColorStop(1, isHigh ? '#10B98166' : isMid ? '#F59E0B44' : '#EF444444')
      ctx.fillStyle = grad
      ctx.fillRect(x + 2, y, bucketW - 4, 48)

      ctx.strokeStyle = isHigh ? '#10B98188' : isMid ? '#F59E0B88' : '#EF444488'
      ctx.lineWidth = 1
      ctx.strokeRect(x + 2, y, bucketW - 4, 48)

      // label
      ctx.fillStyle = isHigh ? '#10B981' : isMid ? '#F59E0B' : '#EF4444'
      ctx.font = 'bold 11px Heebo, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`×${mult}`, x + bucketW / 2, y + 30)
    })

    // Balls
    ballsRef.current.forEach((ball) => {
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2)

      const flash = ball.winFlash && Math.floor(ball.winFlashTimer / 3) % 2 === 0
      const color = flash ? '#ffffff' : ball.color

      const grad = ctx.createRadialGradient(
        ball.x - 2, ball.y - 2, 1,
        ball.x, ball.y, BALL_RADIUS
      )
      grad.addColorStop(0, color + 'ff')
      grad.addColorStop(1, color + '88')
      ctx.fillStyle = grad
      ctx.shadowColor = color
      ctx.shadowBlur = 12
      ctx.fill()
      ctx.shadowBlur = 0
    })
  }, [bucketW])

  const updateBalls = useCallback(() => {
    const toRemove: number[] = []

    ballsRef.current.forEach((ball) => {
      if (ball.landed) {
        if (ball.winFlash) {
          ball.winFlashTimer++
          if (ball.winFlashTimer > 20) ball.winFlash = false
        }
        return
      }

      ball.vy += GRAVITY
      ball.x += ball.vx
      ball.y += ball.vy

      // Clamp x to canvas
      if (ball.x < BALL_RADIUS) { ball.x = BALL_RADIUS; ball.vx = Math.abs(ball.vx) }
      if (ball.x > CANVAS_W - BALL_RADIUS) { ball.x = CANVAS_W - BALL_RADIUS; ball.vx = -Math.abs(ball.vx) }

      // Check peg collisions
      for (const peg of PEGS) {
        const dx = ball.x - peg.x
        const dy = ball.y - peg.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < PEG_RADIUS + BALL_RADIUS) {
          const nx = dx / dist
          const ny = dy / dist
          const dot = ball.vx * nx + ball.vy * ny
          ball.vx = (ball.vx - 2 * dot * nx) * 0.7
          ball.vy = (ball.vy - 2 * dot * ny) * 0.7
          // Push out
          ball.x = peg.x + nx * (PEG_RADIUS + BALL_RADIUS + 0.5)
          ball.y = peg.y + ny * (PEG_RADIUS + BALL_RADIUS + 0.5)
          // Add slight random bias toward center
          const center = CANVAS_W / 2
          const toCenter = center - ball.x
          ball.vx += (Math.random() > 0.55 ? Math.sign(toCenter) : -Math.sign(toCenter)) * 0.5
          break
        }
      }

      // Check if landed in bucket zone
      if (ball.y >= CANVAS_H - 65) {
        ball.landed = true
        ball.vy = 0
        ball.vx = 0
        const bucketIdx = getBucketForBall(ball)
        ball.bucketIndex = bucketIdx
        ball.y = CANVAS_H - 45
        ball.x = bucketXs[bucketIdx]
        ball.winFlash = true
        ball.winFlashTimer = 0

        const mult = BUCKET_MULTIPLIERS[bucketIdx]
        const win = +(betRef.current * mult).toFixed(2)
        const newBal = Math.max(0, balanceRef.current + win)
        balanceRef.current = newBal
        setLocalBalance(newBal)
        if (user) updateBalance(user.id, win)
        setLastWin(`₪${win.toFixed(2)} (×${mult})`)

        // Remove ball after flash
        setTimeout(() => {
          ballsRef.current = ballsRef.current.filter((b) => b.id !== ball.id)
          setActiveBalls(ballsRef.current.length)
        }, 1500)
      }
    })
  }, [user, setLocalBalance, bucketXs, getBucketForBall]) // eslint-disable-line react-hooks/exhaustive-deps

  const gameLoop = useCallback(() => {
    updateBalls()
    draw()
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [updateBalls, draw])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [gameLoop])

  const addBall = useCallback(async () => {
    if (!user) return
    if (balanceRef.current < betRef.current) return
    if (ballsRef.current.length >= MAX_BALLS) return

    const newBal = balanceRef.current - betRef.current
    balanceRef.current = newBal
    setLocalBalance(newBal)
    await updateBalance(user.id, -betRef.current)

    const id = ++ballIdCounter
    const colorIdx = ballsRef.current.length
    const ball = createBall(id, colorIdx)
    ballsRef.current = [...ballsRef.current, ball]
    setActiveBalls(ballsRef.current.length)
    setLastWin(null)
  }, [user, setLocalBalance])

  return (
    <div className="w-full max-w-lg mx-auto select-none">
      <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        {/* Canvas */}
        <div className="flex justify-center p-3">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="rounded-xl border border-[#1a1a1a]"
            style={{ maxWidth: '100%' }}
          />
        </div>

        {/* Win display */}
        <div className="h-7 flex items-center justify-center">
          {lastWin && (
            <p className="text-emerald-400 font-bold text-sm animate-pulse">
              זכית {lastWin}!
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          <div className="mb-3">
            <p className="text-gray-400 text-xs mb-1.5">סכום הימור לכדור</p>
            <div className="flex gap-2 flex-wrap">
              {BET_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    bet === b
                      ? 'bg-[#F59E0B] text-black shadow-lg shadow-amber-500/20'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white'
                  }`}
                >
                  ₪{b}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              יתרה:{' '}
              <span className="text-[#F59E0B] font-bold">₪{balance.toFixed(2)}</span>
            </span>
            <span className="text-sm text-gray-600">
              כדורים פעילים: {activeBalls}/{MAX_BALLS}
            </span>
            <button
              onClick={addBall}
              disabled={!user || balance < bet || activeBalls >= MAX_BALLS}
              className="mr-auto px-5 py-2 bg-[#F59E0B] hover:bg-amber-400 text-black font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              הוסף כדור
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

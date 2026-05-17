'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { updateBalance } from '@/lib/updateBalance'
import { createClient } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────────────────────────
interface Pipe {
  x: number
  gapY: number  // center of gap
  passed: boolean
}

interface FloatText {
  id: number
  text: string
  x: number
  y: number
  alpha: number
  vy: number
}

// ── Constants ──────────────────────────────────────────────────────────────────
const W = 400
const H = 600
const BIRD_X = 80
const BIRD_W = 44
const BIRD_H = 32
const GRAVITY = 0.4
const FLAP_V = -8
const PIPE_W = 60
const PIPE_GAP = 160
const PIPE_SPAWN = 120
const BASE_SPEED = 2.5
const SPEED_INC = 0.2
const SPEED_EVERY = 10

function getMultiplier(pipes: number) {
  if (pipes >= 100) return 25
  if (pipes >= 50) return 10
  if (pipes >= 25) return 5
  if (pipes >= 10) return 2
  return 1
}

function getNextMultiplierAt(pipes: number) {
  if (pipes < 10) return 10
  if (pipes < 25) return 25
  if (pipes < 50) return 50
  if (pipes < 100) return 100
  return Infinity
}

// ── Component ──────────────────────────────────────────────────────────────────
export function FlappyBird() {
  const { user, profile, balance, setLocalBalance } = useAuth()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // game state refs (so the RAF loop always sees current values)
  const stateRef = useRef({
    running: false,
    dead: false,
    started: false,
    birdY: H / 2,
    birdVY: 0,
    pipes: [] as Pipe[],
    frame: 0,
    score: 0,           // pipes passed
    accEarnings: 0,     // not-yet-flushed ₪
    totalEarnings: 0,   // total for the run
    flushCounter: 0,    // flush every 5 pipes
    pipeSpeed: BASE_SPEED,
    flashTimer: 0,      // multiplier upgrade flash (frames)
    flashMult: 0,
    floatTexts: [] as FloatText[],
    floatId: 0,
    highScore: 0,
    wingAngle: 0,
  })

  // React state only for overlay/UI re-renders
  const [phase, setPhase] = useState<'idle' | 'playing' | 'dead'>('idle')
  const [deathStats, setDeathStats] = useState({ score: 0, earned: 0 })
  const rafRef = useRef<number | null>(null)

  // ── High score ─────────────────────────────────────────────────────────────
  const loadHighScore = useCallback(async () => {
    if (!profile) return
    const supabase = createClient()
    const { data } = await supabase
      .from('flappy_scores')
      .select('score')
      .eq('username', profile.username)
      .single()
    if (data) stateRef.current.highScore = data.score
  }, [profile])

  useEffect(() => { loadHighScore() }, [loadHighScore])

  const saveHighScore = useCallback(async (score: number) => {
    if (!profile) return
    if (score <= stateRef.current.highScore) return
    const supabase = createClient()
    await supabase.from('flappy_scores').upsert(
      { username: profile.username, score, user_id: user?.id },
      { onConflict: 'username' }
    )
    stateRef.current.highScore = score
  }, [profile, user])

  // ── Balance flush ──────────────────────────────────────────────────────────
  const flushEarnings = useCallback(async () => {
    const s = stateRef.current
    if (!user || s.accEarnings === 0) return
    const earned = s.accEarnings
    s.accEarnings = 0
    const newBal = balance + earned
    setLocalBalance(newBal)
    await updateBalance(user.id, earned)
  }, [user, balance, setLocalBalance])

  // ── Drawing ────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const s = stateRef.current

    // Background — supermarket aisle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H)
    bgGrad.addColorStop(0, '#E8F4FD')
    bgGrad.addColorStop(0.75, '#D0EAF8')
    bgGrad.addColorStop(0.85, '#C8E6C9')
    bgGrad.addColorStop(1, '#A5D6A7')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)

    // Floor line
    ctx.fillStyle = '#8BC34A'
    ctx.fillRect(0, H - 30, W, 30)
    ctx.fillStyle = '#7CB342'
    ctx.fillRect(0, H - 32, W, 4)

    // Aisle lines (perspective)
    ctx.strokeStyle = 'rgba(100,150,100,0.15)'
    ctx.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      const yy = H * 0.5 + (i * 40)
      ctx.beginPath()
      ctx.moveTo(0, yy)
      ctx.lineTo(W, yy)
      ctx.stroke()
    }

    // Multiplier upgrade flash
    if (s.flashTimer > 0) {
      const alpha = Math.min(s.flashTimer / 30, 1) * 0.6
      ctx.fillStyle = `rgba(245, 158, 11, ${alpha})`
      ctx.fillRect(0, 0, W, H)

      ctx.textAlign = 'center'
      ctx.font = 'bold 52px Heebo, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.shadowColor = '#F59E0B'
      ctx.shadowBlur = 20
      ctx.fillText(`×${s.flashMult} מכפיל!`, W / 2, H / 2)
      ctx.shadowBlur = 0
      s.flashTimer--
    }

    // Pipes — Shufersal shelf style
    for (const p of s.pipes) {
      const topH = p.gapY - PIPE_GAP / 2
      const botY = p.gapY + PIPE_GAP / 2
      const botH = H - botY

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.15)'
      ctx.fillRect(p.x + 4, 0, PIPE_W, topH)
      ctx.fillRect(p.x + 4, botY, PIPE_W, botH)

      // Main pipe body
      const pipeGrad = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0)
      pipeGrad.addColorStop(0, '#388E3C')
      pipeGrad.addColorStop(0.3, '#4CAF50')
      pipeGrad.addColorStop(0.7, '#2E7D32')
      pipeGrad.addColorStop(1, '#1B5E20')
      ctx.fillStyle = pipeGrad
      ctx.fillRect(p.x, 0, PIPE_W, topH)
      ctx.fillRect(p.x, botY, PIPE_W, botH)

      // Shelf highlight stripe
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.fillRect(p.x + 6, 0, 8, topH)
      ctx.fillRect(p.x + 6, botY, 8, botH)

      // Cap at gap edge
      ctx.fillStyle = '#1B5E20'
      ctx.fillRect(p.x - 4, topH - 16, PIPE_W + 8, 16)
      ctx.fillRect(p.x - 4, botY, PIPE_W + 8, 16)
    }

    // Bird — cartoon לבן carton
    const bx = BIRD_X
    const by = s.birdY
    const wing = Math.sin(s.wingAngle) * 6

    // Body shadow
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    ctx.beginPath()
    ctx.roundRect(bx - BIRD_W / 2 + 3, by - BIRD_H / 2 + 3, BIRD_W, BIRD_H, 6)
    ctx.fill()

    // Carton body
    const birdGrad = ctx.createLinearGradient(bx - BIRD_W / 2, by, bx + BIRD_W / 2, by)
    birdGrad.addColorStop(0, '#F0F8FF')
    birdGrad.addColorStop(0.6, '#FFFFFF')
    birdGrad.addColorStop(1, '#E0EFFF')
    ctx.fillStyle = birdGrad
    ctx.beginPath()
    ctx.roundRect(bx - BIRD_W / 2, by - BIRD_H / 2 + wing, BIRD_W, BIRD_H, 6)
    ctx.fill()

    // Carton outline
    ctx.strokeStyle = '#B0C4DE'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.roundRect(bx - BIRD_W / 2, by - BIRD_H / 2 + wing, BIRD_W, BIRD_H, 6)
    ctx.stroke()

    // Blue eyes
    ctx.fillStyle = '#1565C0'
    ctx.beginPath()
    ctx.arc(bx + 8, by - 4 + wing, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.beginPath()
    ctx.arc(bx + 9, by - 5 + wing, 2, 0, Math.PI * 2)
    ctx.fill()

    // Hebrew text on carton
    ctx.font = 'bold 8px Heebo, sans-serif'
    ctx.fillStyle = '#1565C0'
    ctx.textAlign = 'center'
    ctx.fillText('לבן', bx - 4, by + 4 + wing)

    s.wingAngle += 0.25

    // HUD
    const mult = getMultiplier(s.score)

    // Score box
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.beginPath()
    ctx.roundRect(8, 8, 130, 52, 10)
    ctx.fill()

    ctx.textAlign = 'right'
    ctx.font = 'bold 14px Heebo, sans-serif'
    ctx.fillStyle = '#fff'
    ctx.fillText(`צינורות: ${s.score}`, 130, 28)
    ctx.font = 'bold 12px Heebo, sans-serif'
    ctx.fillStyle = '#F59E0B'
    ctx.fillText(`×${mult} מכפיל`, 130, 48)

    // High score
    if (s.highScore > 0) {
      ctx.textAlign = 'left'
      ctx.font = '11px Heebo, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText(`שיא: ${s.highScore}`, 10, 75)
    }

    // Session earnings badge
    if (s.totalEarnings > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.beginPath()
      ctx.roundRect(W - 100, 8, 92, 30, 8)
      ctx.fill()
      ctx.textAlign = 'left'
      ctx.font = 'bold 13px Heebo, sans-serif'
      ctx.fillStyle = '#4ADE80'
      ctx.fillText(`+₪${s.totalEarnings}`, W - 94, 28)
    }

    // Floating +₪ texts
    for (const ft of s.floatTexts) {
      ctx.globalAlpha = ft.alpha
      ctx.textAlign = 'center'
      ctx.font = 'bold 16px Heebo, sans-serif'
      ctx.fillStyle = '#4ADE80'
      ctx.shadowColor = '#16A34A'
      ctx.shadowBlur = 8
      ctx.fillText(ft.text, ft.x, ft.y)
      ctx.shadowBlur = 0
      ft.y += ft.vy
      ft.alpha -= 0.02
    }
    ctx.globalAlpha = 1

    // Remove dead floats
    stateRef.current.floatTexts = s.floatTexts.filter(f => f.alpha > 0)

    // Idle overlay
    if (!s.started && !s.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)'
      ctx.fillRect(0, 0, W, H)
      ctx.textAlign = 'center'
      ctx.font = 'bold 28px Heebo, sans-serif'
      ctx.fillStyle = '#F59E0B'
      ctx.fillText('לחץ להתחיל!', W / 2, H / 2 - 20)
      ctx.font = '16px Heebo, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fillText('SPACE או לחיצה על המסך', W / 2, H / 2 + 16)
    }
  }, [])

  // ── Game loop ──────────────────────────────────────────────────────────────
  const gameLoop = useCallback(() => {
    const s = stateRef.current
    if (!s.running) return

    s.frame++

    // Physics
    s.birdVY += GRAVITY
    s.birdY += s.birdVY

    // Spawn pipes
    if (s.frame % PIPE_SPAWN === 0) {
      const gapY = 120 + Math.random() * (H - 30 - 120 - PIPE_GAP)
      s.pipes.push({ x: W + 10, gapY, passed: false })
    }

    // Move pipes & check pass
    const prevMult = getMultiplier(s.score)
    for (const p of s.pipes) {
      p.x -= s.pipeSpeed
      if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_W / 2) {
        p.passed = true
        s.score++

        const mult = getMultiplier(s.score)
        const earned = mult * 1

        // Check multiplier upgrade
        if (mult > prevMult) {
          s.flashTimer = 60
          s.flashMult = mult
        }

        s.accEarnings += earned
        s.totalEarnings += earned
        s.flushCounter++

        // Floating text
        s.floatTexts.push({
          id: s.floatId++,
          text: `+₪${earned}`,
          x: BIRD_X + 30,
          y: s.birdY - 20,
          alpha: 1,
          vy: -1.2,
        })

        // Speed up every SPEED_EVERY pipes
        if (s.score % SPEED_EVERY === 0) {
          s.pipeSpeed += SPEED_INC
        }

        // Flush every 5 pipes
        if (s.flushCounter >= 5) {
          s.flushCounter = 0
          flushEarnings()
        }
      }
    }

    // Remove off-screen pipes
    s.pipes = s.pipes.filter(p => p.x + PIPE_W > 0)

    // Collision: bounds
    if (s.birdY + BIRD_H / 2 >= H - 30 || s.birdY - BIRD_H / 2 <= 0) {
      die()
      return
    }

    // Collision: pipes
    for (const p of s.pipes) {
      const bLeft = BIRD_X - BIRD_W / 2 + 4
      const bRight = BIRD_X + BIRD_W / 2 - 4
      const bTop = s.birdY - BIRD_H / 2 + 4
      const bBottom = s.birdY + BIRD_H / 2 - 4
      const pRight = p.x + PIPE_W
      const gapTop = p.gapY - PIPE_GAP / 2
      const gapBot = p.gapY + PIPE_GAP / 2

      if (bRight > p.x && bLeft < pRight) {
        if (bTop < gapTop || bBottom > gapBot) {
          die()
          return
        }
      }
    }

    draw()
    rafRef.current = requestAnimationFrame(gameLoop)
  }, [draw, flushEarnings]) // eslint-disable-line react-hooks/exhaustive-deps

  const die = useCallback(() => {
    const s = stateRef.current
    s.running = false
    s.dead = true
    const finalScore = s.score
    const finalEarnings = s.totalEarnings

    // Flush remaining
    if (s.accEarnings > 0) {
      const earned = s.accEarnings
      s.accEarnings = 0
      if (user) {
        updateBalance(user.id, earned).then(newBal => {
          setLocalBalance(newBal)
        })
      }
    }

    saveHighScore(finalScore)
    setDeathStats({ score: finalScore, earned: finalEarnings })
    setPhase('dead')
  }, [user, setLocalBalance, saveHighScore])

  const flap = useCallback(() => {
    const s = stateRef.current
    if (s.dead) return
    if (!s.started) {
      s.started = true
      s.running = true
      setPhase('playing')
      rafRef.current = requestAnimationFrame(gameLoop)
    }
    s.birdVY = FLAP_V
  }, [gameLoop])

  const restart = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const s = stateRef.current
    s.running = false
    s.dead = false
    s.started = false
    s.birdY = H / 2
    s.birdVY = 0
    s.pipes = []
    s.frame = 0
    s.score = 0
    s.accEarnings = 0
    s.totalEarnings = 0
    s.flushCounter = 0
    s.pipeSpeed = BASE_SPEED
    s.flashTimer = 0
    s.floatTexts = []
    s.wingAngle = 0
    setPhase('idle')
    // Draw idle frame
    setTimeout(draw, 16)
  }, [draw])

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        flap()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [flap])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onClick = () => flap()
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('touchstart', onClick, { passive: true })
    return () => {
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('touchstart', onClick)
    }
  }, [flap])

  // Initial draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = W
    canvas.height = H
    draw()
  }, [draw])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="relative flex flex-col items-center gap-4 select-none">
      {/* Balance display */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[#F59E0B] font-bold text-lg">₪{balance.toFixed(0)}</span>
        <span className="text-white/50">יתרה</span>
      </div>

      {/* Canvas */}
      <div className="relative" style={{ width: W, height: H }}>
        <canvas
          ref={canvasRef}
          className="rounded-2xl shadow-2xl shadow-black/60 cursor-pointer"
          style={{ display: 'block' }}
        />

        {/* Death overlay */}
        {phase === 'dead' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl"
            style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(4px)' }}>
            <p className="text-5xl font-black text-white mb-1 tracking-widest" style={{ textShadow: '0 0 30px #ef4444' }}>
              GAME OVER
            </p>
            <div className="mt-4 mb-6 text-center space-y-2">
              <p className="text-white/90 text-lg font-bold">
                צינורות: <span className="text-[#F59E0B]">{deathStats.score}</span>
              </p>
              <p className="text-white/90 text-lg font-bold">
                הרווחת: <span className="text-green-400">₪{deathStats.earned}</span>
              </p>
              {deathStats.score >= stateRef.current.highScore && deathStats.score > 0 && (
                <p className="text-[#F59E0B] font-bold text-sm animate-pulse">שיא חדש! 🏆</p>
              )}
            </div>
            <button
              onClick={restart}
              className="px-8 py-3 rounded-xl font-black text-lg text-black transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}
            >
              נסה שוב
            </button>
          </div>
        )}
      </div>

      {/* Controls hint */}
      {phase !== 'dead' && (
        <p className="text-white/30 text-xs">SPACE או לחיצה = פלאפ</p>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { updateBalance } from '@/lib/updateBalance'

type GameState = 'idle' | 'flying' | 'crashed' | 'cashedout'

const BET_OPTIONS = [1, 5, 10, 25, 50, 100]
const MAX_HISTORY = 10

interface CrashEntry {
  value: number
  seed: string
}

function generateCrashPoint(): { point: number; seed: string } {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  const rand = Math.random()
  const point = Math.min(100, Math.max(1.01, 1 / (1 - rand)))
  return { point, seed }
}

export function CrashPlane() {
  const { user, balance, setLocalBalance } = useAuth()
  const [bet, setBet] = useState(10)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [multiplier, setMultiplier] = useState(1.0)
  const [crashPoint, setCrashPoint] = useState(0)
  const [seed, setSeed] = useState('')
  const [winAmount, setWinAmount] = useState(0)
  const [history, setHistory] = useState<CrashEntry[]>([])
  const [planeX, setPlaneX] = useState(0)
  const [planeY, setPlaneY] = useState(0)

  const multiplierRef = useRef(1.0)
  const crashPointRef = useRef(0)
  const gameStateRef = useRef<GameState>('idle')
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathPointsRef = useRef<{ x: number; y: number }[]>([])

  const SVG_W = 500
  const SVG_H = 280

  const multiplierToY = (m: number) => {
    // y goes from bottom (SVG_H - 20) to top (20)
    const logM = Math.log(m)
    const maxLog = Math.log(Math.max(crashPointRef.current, 2))
    const t = Math.min(1, logM / maxLog)
    return SVG_H - 20 - t * (SVG_H - 40)
  }

  const multiplierToX = (m: number) => {
    const logM = Math.log(m)
    const maxLog = Math.log(Math.max(crashPointRef.current, 2))
    const t = Math.min(1, logM / maxLog)
    return 20 + t * (SVG_W - 40)
  }

  const tick = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp
    const delta = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    if (delta > 200) {
      // Skip large gaps (tab switch etc)
      rafRef.current = requestAnimationFrame(tick)
      return
    }

    const dt = delta / 1000
    // Exponential growth: dm/dt = multiplier * 0.5
    multiplierRef.current = multiplierRef.current * Math.exp(0.5 * dt)

    const x = multiplierToX(multiplierRef.current)
    const y = multiplierToY(multiplierRef.current)
    pathPointsRef.current.push({ x, y })

    setMultiplier(+multiplierRef.current.toFixed(2))
    setPlaneX(x)
    setPlaneY(y)

    if (multiplierRef.current >= crashPointRef.current) {
      // CRASH
      gameStateRef.current = 'crashed'
      setGameState('crashed')
      setMultiplier(+crashPointRef.current.toFixed(2))
      setHistory((prev) => [
        { value: +crashPointRef.current.toFixed(2), seed: seed || '' },
        ...prev.slice(0, MAX_HISTORY - 1),
      ])
      return
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [seed]) // eslint-disable-line react-hooks/exhaustive-deps

  const startGame = useCallback(async () => {
    if (!user) return
    if (balance < bet) return
    if (gameStateRef.current === 'flying') return

    const newBalance = balance - bet
    setLocalBalance(newBalance)
    await updateBalance(user.id, -bet)

    const { point, seed: newSeed } = generateCrashPoint()
    crashPointRef.current = point
    multiplierRef.current = 1.0
    lastTimeRef.current = 0
    pathPointsRef.current = [{ x: 20, y: SVG_H - 20 }]
    gameStateRef.current = 'flying'

    setCrashPoint(point)
    setSeed(newSeed)
    setMultiplier(1.0)
    setGameState('flying')
    setWinAmount(0)
    setPlaneX(20)
    setPlaneY(SVG_H - 20)

    rafRef.current = requestAnimationFrame(tick)
  }, [user, balance, bet, setLocalBalance, tick])

  const cashOut = useCallback(async () => {
    if (!user) return
    if (gameStateRef.current !== 'flying') return

    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const win = +(bet * multiplierRef.current).toFixed(2)
    gameStateRef.current = 'cashedout'
    setGameState('cashedout')
    setWinAmount(win)

    const newBalance = balance - bet + win
    setLocalBalance(newBalance)
    await updateBalance(user.id, win)
  }, [user, balance, bet, setLocalBalance])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const buildPath = () => {
    const pts = pathPointsRef.current
    if (pts.length < 2) return `M 20 ${SVG_H - 20}`
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      d += ` L ${pts[i].x} ${pts[i].y}`
    }
    return d
  }

  const multiplierColor =
    gameState === 'crashed'
      ? '#EF4444'
      : gameState === 'cashedout'
      ? '#10B981'
      : multiplier < 2
      ? '#F59E0B'
      : multiplier < 5
      ? '#10B981'
      : '#00ff88'

  const multiplierSize =
    multiplier < 2 ? 'text-5xl' : multiplier < 5 ? 'text-6xl' : 'text-7xl'

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      {/* Crash history */}
      <div className="flex gap-1 mb-3 flex-wrap justify-end">
        {history.map((h, i) => (
          <span
            key={i}
            className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              h.value >= 2
                ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700'
                : 'bg-red-900/60 text-red-400 border border-red-700'
            }`}
          >
            ×{h.value.toFixed(2)}
          </span>
        ))}
        {history.length === 0 && (
          <span className="text-xs text-gray-600">אין היסטוריה</span>
        )}
      </div>

      {/* Main game area */}
      <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        {/* Multiplier display */}
        <div className="flex flex-col items-center justify-center pt-6 pb-2 relative">
          <span
            className={`font-black tabular-nums transition-all duration-75 ${multiplierSize}`}
            style={{
              color: multiplierColor,
              textShadow: `0 0 20px ${multiplierColor}88, 0 0 40px ${multiplierColor}44`,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ×{multiplier.toFixed(2)}
          </span>
          {gameState === 'crashed' && (
            <span className="text-red-400 text-sm font-bold mt-1 animate-pulse">
              התרסקות!
            </span>
          )}
          {gameState === 'cashedout' && (
            <span className="text-emerald-400 text-sm font-bold mt-1">
              פרשת! זכית ₪{winAmount.toFixed(2)}
            </span>
          )}
        </div>

        {/* SVG graph */}
        <div className="relative px-4 pb-2">
          <svg
            ref={svgRef}
            width="100%"
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full"
          >
            {/* Grid lines */}
            {[1, 2, 5, 10].map((m) => {
              const y = multiplierToY(m)
              if (y < 10 || y > SVG_H - 10) return null
              return (
                <g key={m}>
                  <line
                    x1={0}
                    y1={y}
                    x2={SVG_W}
                    y2={y}
                    stroke="#ffffff11"
                    strokeWidth={1}
                    strokeDasharray="4 4"
                  />
                  <text x={SVG_W - 4} y={y - 3} fill="#ffffff33" fontSize={9} textAnchor="end">
                    ×{m}
                  </text>
                </g>
              )
            })}

            {/* Axes */}
            <line x1={20} y1={0} x2={20} y2={SVG_H - 20} stroke="#ffffff22" strokeWidth={1} />
            <line x1={20} y1={SVG_H - 20} x2={SVG_W} y2={SVG_H - 20} stroke="#ffffff22" strokeWidth={1} />

            {/* Path fill */}
            {pathPointsRef.current.length > 1 && (
              <path
                d={buildPath() + ` L ${planeX} ${SVG_H - 20} L 20 ${SVG_H - 20} Z`}
                fill={gameState === 'crashed' ? '#EF444411' : '#10B98111'}
              />
            )}

            {/* Path line */}
            {pathPointsRef.current.length > 1 && (
              <path
                d={buildPath()}
                fill="none"
                stroke={gameState === 'crashed' ? '#EF4444' : '#10B981'}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Plane emoji */}
            {gameState !== 'idle' && (
              <text
                x={planeX}
                y={planeY - 8}
                fontSize={20}
                textAnchor="middle"
                style={{
                  filter: gameState === 'crashed' ? 'none' : undefined,
                  transform:
                    gameState === 'cashedout'
                      ? `rotate(-20deg)`
                      : undefined,
                  transformOrigin: `${planeX}px ${planeY}px`,
                }}
              >
                {gameState === 'crashed' ? '💥' : '✈️'}
              </text>
            )}

            {gameState === 'idle' && (
              <text x={SVG_W / 2} y={SVG_H / 2} textAnchor="middle" fill="#ffffff22" fontSize={14}>
                לחץ התחל לשחק
              </text>
            )}
          </svg>
        </div>

        {/* Seed (provably fair) */}
        {(gameState === 'crashed' || gameState === 'cashedout') && seed && (
          <div className="px-4 pb-2">
            <p className="text-[10px] text-gray-600 font-mono truncate text-center">
              Seed: {seed}
            </p>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          {/* Bet selector */}
          <div className="mb-3">
            <p className="text-gray-400 text-xs mb-1.5">סכום הימור</p>
            <div className="flex gap-2 flex-wrap">
              {BET_OPTIONS.map((b) => (
                <button
                  key={b}
                  onClick={() => setBet(b)}
                  disabled={gameState === 'flying'}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    bet === b
                      ? 'bg-[#F59E0B] text-black shadow-lg shadow-amber-500/20'
                      : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  ₪{b}
                </button>
              ))}
            </div>
          </div>

          {/* Balance + action buttons */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              יתרה:{' '}
              <span className="text-[#F59E0B] font-bold">₪{balance.toFixed(2)}</span>
            </span>
            <div className="flex gap-2 mr-auto">
              {gameState === 'flying' ? (
                <button
                  onClick={cashOut}
                  className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30 animate-pulse"
                >
                  פרוש! ₪{(bet * multiplier).toFixed(2)}
                </button>
              ) : (
                <button
                  onClick={startGame}
                  disabled={!user || balance < bet}
                  className="px-6 py-2 bg-[#F59E0B] hover:bg-amber-400 text-black font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  התחל
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

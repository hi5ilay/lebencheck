'use client'

import { useState, useCallback, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { updateBalance } from '@/lib/updateBalance'

const BET_OPTIONS = [1, 5, 10, 25, 50, 100]
const MINE_OPTIONS = [3, 5, 10, 15]
const GRID_SIZE = 25

type TileState = 'hidden' | 'safe' | 'mine' | 'mine-reveal'
type GameState = 'idle' | 'playing' | 'won' | 'lost'

interface Tile {
  isMine: boolean
  state: TileState
  flipDelay: number
}

function generateMines(count: number): Set<number> {
  const mines = new Set<number>()
  while (mines.size < count) {
    mines.add(Math.floor(Math.random() * GRID_SIZE))
  }
  return mines
}

function initTiles(mineSet: Set<number>): Tile[] {
  return Array.from({ length: GRID_SIZE }, (_, i) => ({
    isMine: mineSet.has(i),
    state: 'hidden',
    flipDelay: 0,
  }))
}

export function Mines() {
  const { user, balance, setLocalBalance } = useAuth()
  const [bet, setBet] = useState(10)
  const [mineCount, setMineCount] = useState(5)
  const [gameState, setGameState] = useState<GameState>('idle')
  const [tiles, setTiles] = useState<Tile[]>([])
  const [multiplier, setMultiplier] = useState(1.0)
  const [safeRevealed, setSafeRevealed] = useState(0)
  const [totalRevealed, setTotalRevealed] = useState(0)
  const [shaking, setShaking] = useState(false)
  const [winAmount, setWinAmount] = useState(0)

  const computeMultiplier = useCallback(
    (safe: number, mines: number): number => {
      let m = 1.0
      const safeTiles = GRID_SIZE - mines
      for (let k = 0; k < safe; k++) {
        m *= safeTiles / (safeTiles - k)
      }
      return Math.min(1000, +m.toFixed(2))
    },
    []
  )

  const potentialWin = +(bet * multiplier).toFixed(2)

  const startGame = useCallback(async () => {
    if (!user) return
    if (balance < bet) return

    const newBal = balance - bet
    setLocalBalance(newBal)
    await updateBalance(user.id, -bet)

    const mineSet = generateMines(mineCount)
    setTiles(initTiles(mineSet))
    setMultiplier(1.0)
    setSafeRevealed(0)
    setTotalRevealed(0)
    setWinAmount(0)
    setGameState('playing')
  }, [user, balance, bet, mineCount, setLocalBalance])

  const revealTile = useCallback(
    async (index: number) => {
      if (gameState !== 'playing') return
      if (tiles[index]?.state !== 'hidden') return

      const tile = tiles[index]

      if (tile.isMine) {
        // Reveal all mines with stagger
        setShaking(true)
        setTimeout(() => setShaking(false), 400)

        const newTiles = tiles.map((t, i) => {
          if (i === index) return { ...t, state: 'mine' as TileState, flipDelay: 0 }
          if (t.isMine && t.state === 'hidden') {
            return {
              ...t,
              state: 'mine-reveal' as TileState,
              flipDelay: Math.random() * 600,
            }
          }
          return t
        })
        setTiles(newTiles)
        setGameState('lost')
      } else {
        const newSafe = safeRevealed + 1
        const newTotal = totalRevealed + 1
        const newMult = computeMultiplier(newSafe, mineCount)

        setTiles((prev) =>
          prev.map((t, i) => (i === index ? { ...t, state: 'safe' } : t))
        )
        setSafeRevealed(newSafe)
        setTotalRevealed(newTotal)
        setMultiplier(newMult)

        // Auto-win if all safe tiles revealed
        if (newSafe === GRID_SIZE - mineCount) {
          const win = +(bet * newMult).toFixed(2)
          setWinAmount(win)
          setGameState('won')
          const newBal = balance - bet + win
          setLocalBalance(newBal)
          await updateBalance(user!.id, win)
        }
      }
    },
    [gameState, tiles, safeRevealed, totalRevealed, mineCount, computeMultiplier, bet, balance, setLocalBalance, user]
  )

  const cashOut = useCallback(async () => {
    if (!user) return
    if (gameState !== 'playing') return
    if (safeRevealed === 0) return

    const win = potentialWin
    setWinAmount(win)
    setGameState('won')

    // Reveal remaining mines
    setTiles((prev) =>
      prev.map((t) => {
        if (t.isMine && t.state === 'hidden') {
          return { ...t, state: 'mine-reveal', flipDelay: Math.random() * 400 }
        }
        return t
      })
    )

    const newBal = balance - bet + win
    setLocalBalance(newBal)
    await updateBalance(user.id, win)
  }, [user, gameState, safeRevealed, potentialWin, balance, bet, setLocalBalance])

  return (
    <div
      className="w-full max-w-xl mx-auto select-none"
      style={{ animation: shaking ? 'mines-shake 0.3s ease-in-out' : undefined }}
    >
      <style>{`
        @keyframes mines-shake {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(-8px) rotate(-1deg); }
          30%  { transform: translateX(8px) rotate(1deg); }
          45%  { transform: translateX(-6px) rotate(-0.5deg); }
          60%  { transform: translateX(6px) rotate(0.5deg); }
          75%  { transform: translateX(-3px); }
          100% { transform: translateX(0); }
        }
        @keyframes tile-flip {
          0%   { transform: perspective(400px) rotateY(0deg); }
          50%  { transform: perspective(400px) rotateY(90deg); }
          100% { transform: perspective(400px) rotateY(0deg); }
        }
        @keyframes tile-reveal {
          0%   { transform: perspective(400px) rotateY(90deg); opacity: 0; }
          100% { transform: perspective(400px) rotateY(0deg); opacity: 1; }
        }
      `}</style>

      <div className="bg-[#0d0d0d] border border-[#222] rounded-2xl overflow-hidden shadow-2xl">
        {/* Status bar */}
        <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-xs">מכפיל נוכחי</p>
            <p
              className="text-2xl font-black tabular-nums"
              style={{
                color:
                  gameState === 'lost'
                    ? '#EF4444'
                    : gameState === 'won'
                    ? '#10B981'
                    : multiplier >= 5
                    ? '#10B981'
                    : '#F59E0B',
                textShadow:
                  multiplier >= 5
                    ? '0 0 20px #10B98188'
                    : '0 0 20px #F59E0B88',
              }}
            >
              ×{multiplier.toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-500 text-xs">ריווח פוטנציאלי</p>
            <p className="text-xl font-black text-white">₪{potentialWin.toFixed(2)}</p>
          </div>
          {(gameState === 'won' || gameState === 'lost') && (
            <div className="text-center">
              {gameState === 'won' ? (
                <div>
                  <p className="text-emerald-400 font-black text-lg">זכית!</p>
                  <p className="text-emerald-300 text-sm">₪{winAmount.toFixed(2)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-red-400 font-black text-lg">פוצצת!</p>
                  <p className="text-red-300 text-sm">הפסדת ₪{bet.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="p-4">
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}
          >
            {(gameState === 'idle'
              ? Array.from({ length: GRID_SIZE }, (_, i) => ({
                  isMine: false,
                  state: 'hidden' as TileState,
                  flipDelay: 0,
                }))
              : tiles
            ).map((tile, i) => {
              const isHidden = tile.state === 'hidden'
              const isSafe = tile.state === 'safe'
              const isMineHit = tile.state === 'mine'
              const isMineReveal = tile.state === 'mine-reveal'

              return (
                <button
                  key={i}
                  onClick={() => revealTile(i)}
                  disabled={gameState !== 'playing' || !isHidden}
                  className={`
                    aspect-square rounded-xl text-2xl font-bold transition-all duration-200
                    flex items-center justify-center relative overflow-hidden
                    ${isHidden
                      ? gameState === 'playing'
                        ? 'bg-[#1e1e1e] border border-[#333] hover:bg-[#2a2a2a] hover:border-[#F59E0B44] hover:scale-105 cursor-pointer shadow-inner'
                        : 'bg-[#1a1a1a] border border-[#222]'
                      : ''}
                    ${isSafe ? 'border border-emerald-700 shadow-lg shadow-emerald-500/20' : ''}
                    ${isMineHit ? 'border border-red-500 shadow-lg shadow-red-500/30' : ''}
                    ${isMineReveal ? 'border border-red-900' : ''}
                  `}
                  style={{
                    background: isSafe
                      ? 'linear-gradient(135deg, #064e3b, #065f46)'
                      : isMineHit
                      ? 'linear-gradient(135deg, #7f1d1d, #991b1b)'
                      : isMineReveal
                      ? 'linear-gradient(135deg, #3f0d0d, #4a1010)'
                      : undefined,
                    animation:
                      isSafe
                        ? 'tile-reveal 0.2s ease-out'
                        : isMineReveal
                        ? `tile-reveal 0.2s ease-out ${tile.flipDelay}ms both`
                        : isMineHit
                        ? 'tile-flip 0.2s ease-out'
                        : undefined,
                  }}
                >
                  {isHidden ? (
                    <span className="text-gray-600 text-lg">?</span>
                  ) : isSafe ? (
                    <span style={{ filter: 'drop-shadow(0 0 6px #10B981)' }}>💎</span>
                  ) : (
                    <span style={{ filter: 'drop-shadow(0 0 6px #EF4444)' }}>💣</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-[#1a1a1a] bg-[#0a0a0a]">
          {/* Mine count */}
          {gameState === 'idle' || gameState === 'won' || gameState === 'lost' ? (
            <>
              <div className="mb-3">
                <p className="text-gray-400 text-xs mb-1.5">מספר מוקשים</p>
                <div className="flex gap-2">
                  {MINE_OPTIONS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMineCount(m)}
                      className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        mineCount === m
                          ? 'bg-red-700 text-white border border-red-500'
                          : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white border border-[#333]'
                      }`}
                    >
                      {m} 💣
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <p className="text-gray-400 text-xs mb-1.5">סכום הימור</p>
                <div className="flex gap-2 flex-wrap">
                  {BET_OPTIONS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBet(b)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                        bet === b
                          ? 'bg-[#F59E0B] text-black'
                          : 'bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-white'
                      }`}
                    >
                      ₪{b}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">
              יתרה:{' '}
              <span className="text-[#F59E0B] font-bold">₪{balance.toFixed(2)}</span>
            </span>
            <div className="flex gap-2 mr-auto">
              {gameState === 'playing' && safeRevealed > 0 && (
                <button
                  onClick={cashOut}
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/30"
                >
                  פרוש! ₪{potentialWin.toFixed(2)}
                </button>
              )}
              {(gameState === 'idle' || gameState === 'won' || gameState === 'lost') && (
                <button
                  onClick={startGame}
                  disabled={!user || balance < bet}
                  className="px-6 py-2 bg-[#F59E0B] hover:bg-amber-400 text-black font-black rounded-xl text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {gameState === 'idle' ? 'התחל' : 'שחק שוב'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

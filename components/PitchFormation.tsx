"use client"

import { useState } from "react"

type LineupPlayer = {
  player: { id: number; name: string; number: number; pos: string; grid: string | null }
}

type PitchFormationProps = {
  teamName: string
  teamLogo: string
  formation: string
  players: LineupPlayer[]
  coach: string
  flip?: boolean
}

function PlayerAvatar({ id, number }: { id: number; number: number }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div className="w-9 h-9 rounded-full bg-gray-900 border-2 border-green-500 flex items-center justify-center text-[11px] font-bold text-green-400">
        {number}
      </div>
    )
  }

  return (
    <div className="relative w-9 h-9">
      <img
        src={`https://media.api-sports.io/football/players/${id}.png`}
        alt=""
        onError={() => setFailed(true)}
        className="w-9 h-9 rounded-full object-cover border-2 border-green-500 bg-gray-800"
      />
      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gray-900 border border-green-500 text-[8px] font-bold text-green-400 flex items-center justify-center">
        {number}
      </span>
    </div>
  )
}

export default function PitchFormation({
  teamName,
  teamLogo,
  formation,
  players,
  coach,
  flip = false,
}: PitchFormationProps) {
  const withPos = players
    .filter((p) => p.player.grid)
    .map((p) => {
      const [row, col] = p.player.grid!.split(":").map(Number)
      return { ...p, row, col }
    })

  const rows = [...new Set(withPos.map((p) => p.row))].sort((a, b) => a - b)

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <img src={teamLogo} alt="" className="w-5 h-5" />
        <span className="text-sm font-medium">{teamName}</span>
      </div>
      <p className="text-xs text-gray-500 mb-3">
        포메이션 {formation} · 감독 {coach}
      </p>

      <div className="relative w-full aspect-[3/4] bg-green-800/40 rounded-lg border border-green-700/50 overflow-hidden">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(255,255,255,0.03)_0px,rgba(255,255,255,0.03)_20px,transparent_20px,transparent_40px)]" />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/20" />
        <div
          className={`absolute left-1/2 -translate-x-1/2 w-1/3 h-[10%] border border-white/20 ${
            flip ? "top-0" : "bottom-0"
          }`}
        />

        {rows.map((rowNum) => {
          const rowPlayers = withPos
            .filter((p) => p.row === rowNum)
            .sort((a, b) => a.col - b.col)

          const rowFrac = (rowNum - 0.5) / rows.length
          const topPct = flip ? rowFrac * 90 + 5 : 95 - rowFrac * 90

          return rowPlayers.map((p, i) => {
            const colFrac = (i + 1) / (rowPlayers.length + 1)
            return (
              <div
                key={p.player.number}
                className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${colFrac * 100}%`, top: `${topPct}%` }}
              >
                <PlayerAvatar id={p.player.id} number={p.player.number} />
                <span className="text-[9px] text-gray-300 mt-1 max-w-[56px] truncate text-center leading-tight">
                  {p.player.name.split(" ").pop()}
                </span>
              </div>
            )
          })
        })}
      </div>
    </div>
  )
}
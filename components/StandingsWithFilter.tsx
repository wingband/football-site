"use client"

import { useState } from "react"
import Link from "next/link"
import type { StandingRow, TeamSplit } from "@/lib/leagueData"

type Mode = "all" | "home" | "away"
const MODES: { key: Mode; label: string }[] = [
  { key: "all", label: "모두" },
  { key: "home", label: "홈" },
  { key: "away", label: "원정" },
]

function qualColor(description: string | null | undefined): string | null {
  if (!description) return null
  const d = description.toLowerCase()
  if (d.includes("champions league")) return "bg-blue-500"
  if (d.includes("europa")) return "bg-orange-400"
  if (d.includes("conference")) return "bg-green-500"
  if (d.includes("relegation")) return "bg-live-red"
  return null
}

function splitOf(row: StandingRow, mode: Mode): TeamSplit {
  if (mode === "home" && row.home) return row.home
  if (mode === "away" && row.away) return row.away
  return row.all
}

export default function StandingsWithFilter({
  standings,
  highlightTeamIds = [],
  nextOpponent = {},
  showFilter = true,
}: {
  standings: StandingRow[][]
  highlightTeamIds?: number[]
  nextOpponent?: Record<number, string>
  showFilter?: boolean
}) {
  const [mode, setMode] = useState<Mode>("all")

  if (!standings || standings.length === 0) {
    return <p className="text-floodlight/40 text-sm py-4">순위표 정보를 불러올 수 없습니다.</p>
  }

  const hasNext = Object.keys(nextOpponent).length > 0

  return (
    <div>
      {showFilter && (
        <div className="flex gap-2 mb-4">
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                mode === m.key
                  ? "bg-floodlight text-pitch-night"
                  : "bg-turf-line/40 text-floodlight/60 hover:text-floodlight"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {standings.map((group, gi) => {
        // 홈/원정 모드에서는 해당 성적 기준으로 재정렬 (승점 = 승*3+무)
        const rows =
          mode === "all"
            ? group
            : [...group].sort((a, b) => {
                const sa = splitOf(a, mode)
                const sb = splitOf(b, mode)
                const pa = sa.win * 3 + sa.draw
                const pb = sb.win * 3 + sb.draw
                if (pb !== pa) return pb - pa
                return (sb.goals.for - sb.goals.against) - (sa.goals.for - sa.goals.against)
              })

        const legends = new Map<string, string>()
        for (const row of group) {
          const color = qualColor(row.description)
          if (color && row.description && !legends.has(row.description)) {
            legends.set(row.description, color)
          }
        }

        return (
          <div key={gi} className="mb-6">
            {standings.length > 1 && (
              <div className="px-2 py-2 text-sm font-medium border-b border-turf-line/60">
                {group[0]?.group}
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="text-floodlight/40 text-xs border-b border-turf-line/60">
                  <th className="text-left pl-2 pr-1 py-2 w-9">#</th>
                  <th className="text-left px-1 py-2">팀</th>
                  <th className="px-1 py-2 w-10 text-center">경기</th>
                  <th className="px-1 py-2 w-8 text-center hidden sm:table-cell">승</th>
                  <th className="px-1 py-2 w-8 text-center hidden sm:table-cell">무</th>
                  <th className="px-1 py-2 w-8 text-center hidden sm:table-cell">패</th>
                  <th className="px-1 py-2 w-12 text-center">+/-</th>
                  <th className="px-1 py-2 w-14 text-center hidden sm:table-cell">득실</th>
                  <th className="px-1 py-2 w-12 text-center">승점</th>
                  {hasNext && <th className="px-1 py-2 w-10 text-center">다음</th>}
                </tr>
              </thead>
              <tbody className="font-data">
                {rows.map((row, idx) => {
                  const s = splitOf(row, mode)
                  const points = mode === "all" ? row.points : s.win * 3 + s.draw
                  const diff = mode === "all" ? row.goalsDiff : s.goals.for - s.goals.against
                  const rank = mode === "all" ? row.rank : idx + 1
                  const color = mode === "all" ? qualColor(row.description) : null
                  const highlighted = highlightTeamIds.includes(row.team.id)

                  return (
                    <tr
                      key={row.team.id}
                      className={`border-b border-turf-line/30 last:border-b-0 hover:bg-turf-line/30 ${
                        highlighted ? "bg-score-amber/10" : ""
                      }`}
                    >
                      <td className="pl-2 pr-1 py-2.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-[3px] h-4 rounded-full shrink-0 ${color ?? "bg-transparent"}`} />
                          <span className="text-floodlight/50">{rank}</span>
                        </span>
                      </td>
                      <td className="px-1 py-2.5 font-sans">
                        <Link
                          href={`/teams/${row.team.id}`}
                          className="flex items-center gap-2 hover:text-score-amber"
                        >
                          <img src={row.team.logo} alt="" className="w-5 h-5 shrink-0" />
                          <span className={`truncate ${highlighted ? "font-semibold text-floodlight" : ""}`}>
                            {row.team.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-1 py-2.5 text-center text-floodlight/70">{s.played}</td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60 hidden sm:table-cell">{s.win}</td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60 hidden sm:table-cell">{s.draw}</td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60 hidden sm:table-cell">{s.lose}</td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60">
                        {diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td className="px-1 py-2.5 text-center text-floodlight/50 hidden sm:table-cell">
                        {s.goals.for}-{s.goals.against}
                      </td>
                      <td className="px-1 py-2.5 text-center font-bold text-floodlight">{points}</td>
                      {hasNext && (
                        <td className="px-1 py-2.5">
                          <span className="flex justify-center">
                            {nextOpponent[row.team.id] ? (
                              <img src={nextOpponent[row.team.id]} alt="" className="w-4 h-4" />
                            ) : null}
                          </span>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {mode === "all" && legends.size > 0 && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 px-2">
                {[...legends.entries()].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-1.5 text-[11px] text-floodlight/50">
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    {label}
                  </span>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

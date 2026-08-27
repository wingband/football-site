import Link from "next/link"
import Logo from "@/components/Logo"

type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  description?: string | null
  all: {
    played: number
    win: number
    draw: number
    lose: number
  }
}

// 진출권/강등권 설명 → 색상 매핑 (FotMob 스타일)
function qualColor(description: string | null | undefined): string | null {
  if (!description) return null
  const d = description.toLowerCase()
  if (d.includes("champions league")) return "bg-blue-500"
  if (d.includes("europa")) return "bg-orange-400"
  if (d.includes("conference")) return "bg-green-500"
  if (d.includes("relegation")) return "bg-live-red"
  return null
}

export default function StandingsTable({
  standings,
  highlightTeamIds = [],
}: {
  standings: StandingRow[][]
  highlightTeamIds?: number[]
}) {
  if (!standings || standings.length === 0) {
    return <p className="text-floodlight/40 text-sm py-4">순위표 정보를 불러올 수 없습니다.</p>
  }

  return (
    <>
      {standings.map((group, gi) => {
        // 이 그룹에 등장하는 진출권 종류를 모아 범례 구성
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
                  <th className="px-1 py-2 w-12 text-center">승점</th>
                </tr>
              </thead>
              <tbody className="font-data">
                {group.map((row) => {
                  const color = qualColor(row.description)
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
                          <span
                            className={`w-[3px] h-4 rounded-full shrink-0 ${color ?? "bg-transparent"}`}
                          />
                          <span className="text-floodlight/50">{row.rank}</span>
                        </span>
                      </td>
                      <td className="px-1 py-2.5 font-sans">
                        <Link
                          href={`/teams/${row.team.id}`}
                          className="flex items-center gap-2 hover:text-score-amber"
                        >
                          <Logo src={row.team.logo} alt="" className="w-5 h-5 shrink-0" />
                          <span className={`truncate ${highlighted ? "font-semibold text-floodlight" : ""}`}>
                            {row.team.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-1 py-2.5 text-center text-floodlight/70">{row.all.played}</td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60 hidden sm:table-cell">
                        {row.all.win}
                      </td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60 hidden sm:table-cell">
                        {row.all.draw}
                      </td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60 hidden sm:table-cell">
                        {row.all.lose}
                      </td>
                      <td className="px-1 py-2.5 text-center text-floodlight/60">
                        {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                      </td>
                      <td className="px-1 py-2.5 text-center font-bold text-floodlight">{row.points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* 진출권/강등권 범례 */}
            {legends.size > 0 && (
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
    </>
  )
}

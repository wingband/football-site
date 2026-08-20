import Link from "next/link"

type StandingRow = {
  rank: number
  team: { id: number; name: string; logo: string }
  points: number
  goalsDiff: number
  group: string
  all: {
    played: number
    win: number
    draw: number
    lose: number
  }
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
      {standings.map((group, gi) => (
        <div key={gi} className="bg-turf/40 border-l-2 border-score-amber overflow-hidden mb-6">
          {standings.length > 1 && (
            <div className="px-4 py-2 bg-turf-line/30 text-sm font-medium border-b border-turf-line/60">
              {group[0]?.group}
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-floodlight/40 text-xs border-b border-turf-line/60">
                <th className="text-left px-3 py-2 w-8">#</th>
                <th className="text-left px-2 py-2">팀</th>
                <th className="px-2 py-2 w-10">경기</th>
                <th className="px-2 py-2 w-10">승</th>
                <th className="px-2 py-2 w-10">무</th>
                <th className="px-2 py-2 w-10">패</th>
                <th className="px-2 py-2 w-14">득실</th>
                <th className="px-2 py-2 w-12 text-score-amber font-data">승점</th>
              </tr>
            </thead>
            <tbody className="font-data">
              {group.map((row) => (
                <tr
                  key={row.team.id}
                  className={`border-b border-turf-line/40 last:border-b-0 hover:bg-turf-line/30 ${
                    highlightTeamIds.includes(row.team.id) ? "bg-score-amber/10" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-floodlight/40">{row.rank}</td>
                  <td className="px-2 py-2 font-sans">
                    <div className="flex items-center gap-2">
                      <img src={row.team.logo} alt="" className="w-5 h-5" />
                      <Link
                        href={`/teams/${row.team.id}`}
                        className="truncate hover:text-score-amber hover:underline"
                      >
                        {row.team.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center text-floodlight/70">{row.all.played}</td>
                  <td className="px-2 py-2 text-center text-floodlight/70">{row.all.win}</td>
                  <td className="px-2 py-2 text-center text-floodlight/70">{row.all.draw}</td>
                  <td className="px-2 py-2 text-center text-floodlight/70">{row.all.lose}</td>
                  <td className="px-2 py-2 text-center text-floodlight/50">
                    {row.goalsDiff > 0 ? `+${row.goalsDiff}` : row.goalsDiff}
                  </td>
                  <td className="px-2 py-2 text-center font-bold text-floodlight">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  )
}

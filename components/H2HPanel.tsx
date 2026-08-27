import Link from "next/link"
import { matchHref } from "@/lib/slug"
import Logo from "@/components/Logo"

type H2HMatch = {
  fixture: { id: number; date: string }
  teams: {
    home: { name: string; logo?: string; winner: boolean | null }
    away: { name: string; logo?: string; winner: boolean | null }
  }
  goals: { home: number | null; away: number | null }
  league?: { name: string; logo?: string }
}

// 현재 경기의 홈/원정팀 기준으로 통산 승/무/패 집계
function buildSummary(matches: H2HMatch[], teamAName: string, teamBName: string) {
  let aWins = 0
  let bWins = 0
  let draws = 0

  for (const m of matches) {
    if (m.goals.home === null || m.goals.away === null) continue
    if (m.goals.home === m.goals.away) {
      draws++
      continue
    }
    const winnerName = m.goals.home > m.goals.away ? m.teams.home.name : m.teams.away.name
    if (winnerName === teamAName) aWins++
    else if (winnerName === teamBName) bWins++
  }
  return { aWins, bWins, draws, total: aWins + bWins + draws }
}

export default function H2HPanel({
  matches,
  currentFixtureId,
  homeTeamName,
  awayTeamName,
  homeTeamLogo,
  awayTeamLogo,
}: {
  matches: H2HMatch[]
  currentFixtureId: number
  homeTeamName: string
  awayTeamName: string
  homeTeamLogo: string
  awayTeamLogo: string
}) {
  if (matches.length === 0) {
    return <p className="text-floodlight/40 text-sm py-6 text-center">상대전적 정보가 없습니다.</p>
  }

  const { aWins, bWins, draws, total } = buildSummary(matches, homeTeamName, awayTeamName)
  const sorted = [...matches].sort(
    (x, y) => new Date(y.fixture.date).getTime() - new Date(x.fixture.date).getTime()
  )

  return (
    <div>
      {/* 통산 전적 요약 */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Logo src={homeTeamLogo} alt="" className="w-6 h-6" />
            <span className="font-data font-bold text-score-amber">{aWins}승</span>
          </div>
          <span className="font-data text-floodlight/50 text-sm">{draws}무</span>
          <div className="flex items-center gap-2">
            <span className="font-data font-bold text-floodlight/90">{bWins}승</span>
            <Logo src={awayTeamLogo} alt="" className="w-6 h-6" />
          </div>
        </div>
        {total > 0 && (
          <div className="flex h-2 overflow-hidden rounded-full">
            <div className="bg-score-amber" style={{ width: `${(aWins / total) * 100}%` }} />
            <div className="bg-floodlight/25" style={{ width: `${(draws / total) * 100}%` }} />
            <div className="bg-floodlight/70" style={{ width: `${(bWins / total) * 100}%` }} />
          </div>
        )}
        <p className="text-center text-[11px] text-floodlight/40 mt-2">최근 {total}경기 기준</p>
      </div>

      {/* 과거 경기 리스트 */}
      <div className="divide-y divide-turf-line/30">
        {sorted.map((m) => {
          const finished = m.goals.home !== null && m.goals.away !== null
          const homeWon = finished && m.goals.home! > m.goals.away!
          const awayWon = finished && m.goals.away! > m.goals.home!
          const isCurrent = m.fixture.id === currentFixtureId

          const row = (
            <div className="py-3">
              <p className="text-[11px] text-floodlight/40 mb-1.5 text-center">
                {new Date(m.fixture.date).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
                {m.league?.name ? ` · ${m.league.name}` : ""}
                {isCurrent ? " · 이번 경기" : ""}
              </p>
              <div className="flex items-center justify-center gap-3 text-sm">
                <span
                  className={`flex-1 text-right truncate ${homeWon ? "text-floodlight font-medium" : awayWon ? "text-floodlight/40" : "text-floodlight/70"}`}
                >
                  {m.teams.home.name}
                </span>
                <span className="shrink-0 px-2.5 py-1 rounded bg-turf-line/50 font-data font-medium text-floodlight">
                  {m.goals.home ?? "-"} - {m.goals.away ?? "-"}
                </span>
                <span
                  className={`flex-1 truncate ${awayWon ? "text-floodlight font-medium" : homeWon ? "text-floodlight/40" : "text-floodlight/70"}`}
                >
                  {m.teams.away.name}
                </span>
              </div>
            </div>
          )

          return isCurrent ? (
            <div key={m.fixture.id}>{row}</div>
          ) : (
            <Link
              key={m.fixture.id}
              href={matchHref(m)}
              className="block hover:bg-turf-line/20 transition-colors"
            >
              {row}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

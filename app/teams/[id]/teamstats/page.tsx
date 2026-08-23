import Link from "next/link"
import type { Metadata } from "next"
import { getTeamInfo, getTeamCurrentLeague, getTeamSeasonStats } from "@/lib/teamData"
import { getLeagueStandings } from "@/lib/leagueData"

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "팀 통계를 찾을 수 없습니다" }
  return {
    title: `${info.team.name} 팀 통계`,
    description: `${info.team.name}의 시즌 종합 통계, 득실점, 클린시트, 연승 기록을 확인하세요.`,
  }
}

type Row = { id: number; name: string; logo: string; value: number }

function RankCard({ title, rows, teamId, unit }: { title: string; rows: Row[]; teamId: number; unit?: string }) {
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      <div className="divide-y divide-turf-line/30">
        {rows.map((r, i) => (
          <Link key={r.id} href={`/teams/${r.id}`}
            className={`flex items-center gap-3 py-2 hover:bg-turf-line/20 transition-colors -mx-1 px-1 ${r.id === teamId ? "bg-score-amber/10" : ""}`}>
            <span className="text-xs text-floodlight/40 w-4 text-center shrink-0">{i + 1}</span>
            <img src={r.logo} alt="" className="w-6 h-6 shrink-0" />
            <span className={`text-sm flex-1 truncate ${r.id === teamId ? "font-semibold" : ""}`}>{r.name}</span>
            <span className="font-data font-bold bg-score-amber/15 text-score-amber px-2 py-0.5 rounded-full shrink-0">
              {r.value}{unit}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-turf/30 border border-turf-line/30 rounded p-3 text-center">
      <p className="font-data font-bold text-xl text-score-amber">{value}</p>
      <p className="text-[11px] text-floodlight/50 mt-1">{label}</p>
      {sub && <p className="text-[10px] text-floodlight/30">{sub}</p>}
    </div>
  )
}

export default async function TeamStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return <p className="text-floodlight/40 pt-4">팀 정보를 찾을 수 없습니다.</p>

  const league = await getTeamCurrentLeague(id)
  const [standings, seasonStats] = await Promise.all([
    league ? getLeagueStandings(String(league.id), league.season) : Promise.resolve(null),
    league ? getTeamSeasonStats(id, league.id, league.season) : Promise.resolve(null),
  ])

  const allRows = standings?.league.standings.flat() ?? []
  const withPlayed = allRows.filter((r) => r.all.played > 0)
  const teamId = Number(id)

  const goalsForRows: Row[] = [...withPlayed]
    .sort((a, b) => b.all.goals.for / b.all.played - a.all.goals.for / a.all.played)
    .slice(0, 5)
    .map((r) => ({ id: r.team.id, name: r.team.name, logo: r.team.logo, value: Number((r.all.goals.for / r.all.played).toFixed(1)) }))

  const goalsAgainstRows: Row[] = [...withPlayed]
    .sort((a, b) => a.all.goals.against / a.all.played - b.all.goals.against / b.all.played)
    .slice(0, 5)
    .map((r) => ({ id: r.team.id, name: r.team.name, logo: r.team.logo, value: Number((r.all.goals.against / r.all.played).toFixed(1)) }))

  // 폼 스트링 파싱 (최근 5경기)
  const formStr = seasonStats?.form ?? ""
  const recentForm = formStr.slice(-5).split("")

  return (
    <>
      {league && (
        <p className="text-xs text-floodlight/40 mb-4">
          {league.name} {league.season} 시즌
        </p>
      )}

      {/* 팀 시즌 종합 통계 (/teams/statistics) */}
      {seasonStats && (
        <div className="space-y-6 mb-8">

          {/* 최근 폼 */}
          {recentForm.length > 0 && (
            <div>
              <p className="text-xs text-floodlight/40 uppercase mb-2 tracking-wide">최근 폼</p>
              <div className="flex gap-1.5">
                {recentForm.map((r, i) => (
                  <span key={i} className={`w-7 h-7 flex items-center justify-center rounded text-xs font-bold ${
                    r === "W" ? "bg-green-600 text-white" : r === "D" ? "bg-floodlight/20 text-floodlight" : "bg-red-700 text-white"
                  }`}>{r}</span>
                ))}
              </div>
            </div>
          )}

          {/* 승패무 */}
          <div>
            <p className="text-xs text-floodlight/40 uppercase mb-2 tracking-wide">시즌 성적</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBlock label="승" value={seasonStats.fixtures.wins.total} sub={`홈 ${seasonStats.fixtures.wins.home} / 원정 ${seasonStats.fixtures.wins.away}`} />
              <StatBlock label="무" value={seasonStats.fixtures.draws.total} sub={`홈 ${seasonStats.fixtures.draws.home} / 원정 ${seasonStats.fixtures.draws.away}`} />
              <StatBlock label="패" value={seasonStats.fixtures.loses.total} sub={`홈 ${seasonStats.fixtures.loses.home} / 원정 ${seasonStats.fixtures.loses.away}`} />
            </div>
          </div>

          {/* 득실점 */}
          <div>
            <p className="text-xs text-floodlight/40 uppercase mb-2 tracking-wide">득실점</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-xs text-floodlight/40 mb-2">득점</p>
                <p className="font-data font-bold text-2xl text-score-amber">{seasonStats.goals.for.total.total}</p>
                <p className="text-xs text-floodlight/40 mt-1">경기당 {seasonStats.goals.for.average.total}</p>
                <div className="mt-2 text-[11px] text-floodlight/40 space-y-0.5">
                  <div className="flex justify-between"><span>홈</span><span className="font-data">{seasonStats.goals.for.total.home} (평균 {seasonStats.goals.for.average.home})</span></div>
                  <div className="flex justify-between"><span>원정</span><span className="font-data">{seasonStats.goals.for.total.away} (평균 {seasonStats.goals.for.average.away})</span></div>
                </div>
              </div>
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-xs text-floodlight/40 mb-2">실점</p>
                <p className="font-data font-bold text-2xl text-floodlight/80">{seasonStats.goals.against.total.total}</p>
                <p className="text-xs text-floodlight/40 mt-1">경기당 {seasonStats.goals.against.average.total}</p>
                <div className="mt-2 text-[11px] text-floodlight/40 space-y-0.5">
                  <div className="flex justify-between"><span>홈</span><span className="font-data">{seasonStats.goals.against.total.home} (평균 {seasonStats.goals.against.average.home})</span></div>
                  <div className="flex justify-between"><span>원정</span><span className="font-data">{seasonStats.goals.against.total.away} (평균 {seasonStats.goals.against.average.away})</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* 클린시트 / 무득점 / 페널티 */}
          <div>
            <p className="text-xs text-floodlight/40 uppercase mb-2 tracking-wide">세부 기록</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBlock label="클린시트" value={seasonStats.clean_sheet.total} sub={`홈 ${seasonStats.clean_sheet.home} / 원정 ${seasonStats.clean_sheet.away}`} />
              <StatBlock label="무득점 경기" value={seasonStats.failed_to_score.total} sub={`홈 ${seasonStats.failed_to_score.home} / 원정 ${seasonStats.failed_to_score.away}`} />
              {seasonStats.penalty.total > 0 && (
                <>
                  <StatBlock label="PK 성공" value={`${seasonStats.penalty.scored.total}/${seasonStats.penalty.total}`} sub={seasonStats.penalty.scored.percentage} />
                  <StatBlock label="PK 실패" value={seasonStats.penalty.missed.total} sub={seasonStats.penalty.missed.percentage} />
                </>
              )}
            </div>
          </div>

          {/* 최고 기록 */}
          <div>
            <p className="text-xs text-floodlight/40 uppercase mb-2 tracking-wide">최고 기록</p>
            <div className="grid grid-cols-3 gap-3">
              <StatBlock label="최다 연승" value={`${seasonStats.biggest.streak.wins}연승`} />
              <StatBlock label="최다 연무" value={`${seasonStats.biggest.streak.draws}연무`} />
              <StatBlock label="최다 연패" value={`${seasonStats.biggest.streak.loses}연패`} />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {seasonStats.biggest.wins.home && (
                <div className="bg-turf/30 border border-turf-line/30 rounded p-3">
                  <p className="text-[11px] text-floodlight/40">홈 최대 승리</p>
                  <p className="font-data font-bold text-lg text-score-amber mt-1">{seasonStats.biggest.wins.home}</p>
                </div>
              )}
              {seasonStats.biggest.wins.away && (
                <div className="bg-turf/30 border border-turf-line/30 rounded p-3">
                  <p className="text-[11px] text-floodlight/40">원정 최대 승리</p>
                  <p className="font-data font-bold text-lg text-score-amber mt-1">{seasonStats.biggest.wins.away}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 리그 내 팀 비교 */}
      {allRows.length > 0 && (
        <div>
          <p className="text-xs text-floodlight/40 uppercase mb-3 tracking-wide">리그 내 비교</p>
          <div className="grid sm:grid-cols-2 gap-4">
            <RankCard title="경기당 득점 상위 5팀" rows={goalsForRows} teamId={teamId} />
            <RankCard title="경기당 실점 하위 5팀" rows={goalsAgainstRows} teamId={teamId} />
          </div>
        </div>
      )}

      {!seasonStats && allRows.length === 0 && (
        <p className="text-floodlight/40 text-sm py-6">팀 통계 정보가 없습니다.</p>
      )}
    </>
  )
}

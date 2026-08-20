import Link from "next/link"
import type { Metadata } from "next"
import { getTeamInfo, getTeamCurrentLeague } from "@/lib/teamData"
import { getLeagueStandings } from "@/lib/leagueData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "팀 통계를 찾을 수 없습니다" }
  return {
    title: `${info.team.name} 팀 통계`,
    description: `${info.team.name}의 경기당 득점, 실점을 리그 내 다른 팀들과 비교해보세요.`,
  }
}

type Row = { id: number; name: string; logo: string; value: number }

function RankCard({ title, rows, teamId, unit }: { title: string; rows: Row[]; teamId: number; unit?: string }) {
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      <div className="divide-y divide-turf-line/30">
        {rows.map((r, i) => (
          <Link
            key={r.id}
            href={`/teams/${r.id}`}
            className={`flex items-center gap-3 py-2 hover:bg-turf-line/20 transition-colors -mx-1 px-1 ${
              r.id === teamId ? "bg-score-amber/10" : ""
            }`}
          >
            <span className="text-xs text-floodlight/40 w-4 text-center shrink-0">{i + 1}</span>
            <img src={r.logo} alt="" className="w-6 h-6 shrink-0" />
            <span className={`text-sm flex-1 truncate ${r.id === teamId ? "font-semibold" : ""}`}>{r.name}</span>
            <span className="font-data font-bold bg-score-amber/15 text-score-amber px-2 py-0.5 rounded-full shrink-0">
              {r.value}
              {unit}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function TeamStatsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return <p className="text-floodlight/40 pt-4">팀 정보를 찾을 수 없습니다.</p>
  }

  const league = await getTeamCurrentLeague(id)
  const standings = league ? await getLeagueStandings(String(league.id), league.season) : null
  const allRows = standings?.league.standings.flat() ?? []

  const withPlayed = allRows.filter((r) => r.all.played > 0)

  const goalsForRows: Row[] = [...withPlayed]
    .sort((a, b) => b.all.goals.for / b.all.played - a.all.goals.for / a.all.played)
    .slice(0, 5)
    .map((r) => ({
      id: r.team.id,
      name: r.team.name,
      logo: r.team.logo,
      value: Number((r.all.goals.for / r.all.played).toFixed(1)),
    }))

  const goalsAgainstRows: Row[] = [...withPlayed]
    .sort((a, b) => a.all.goals.against / a.all.played - b.all.goals.against / b.all.played)
    .slice(0, 5)
    .map((r) => ({
      id: r.team.id,
      name: r.team.name,
      logo: r.team.logo,
      value: Number((r.all.goals.against / r.all.played).toFixed(1)),
    }))

  const teamId = Number(id)

  return (
    <>
{league && (
          <p className="text-xs text-floodlight/40 mb-4">
            {league.name} {league.season} 시즌 · 리그 전체 팀 비교
          </p>
        )}

        {allRows.length === 0 ? (
          <p className="text-floodlight/40 text-sm py-6">팀 통계 정보가 없습니다.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <RankCard title="경기당 득점" rows={goalsForRows} teamId={teamId} />
            <RankCard title="경기당 실점" rows={goalsAgainstRows} teamId={teamId} />
          </div>
        )}

        <p className="text-[11px] text-floodlight/30 mt-6">
          FotMob 평점, 평균 점유율, 클린시트, 관중 수, xG 등은 API 데이터에 없어 제공하지 않습니다.
        </p>
    </>
  )
}

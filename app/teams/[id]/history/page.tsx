import type { Metadata } from "next"
import TeamHeader from "@/components/TeamHeader"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getTeamInfo, getTeamCurrentLeague, getTeamCoach, getHistoricalRank } from "@/lib/teamData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "기록을 찾을 수 없습니다" }
  return {
    title: `${info.team.name} 기록`,
    description: `${info.team.name}의 최근 시즌별 리그 순위 변화를 확인하세요.`,
  }
}

const SEASONS_BACK = 6

export default async function TeamHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return (
      <main className="min-h-screen bg-pitch-night text-floodlight p-8 font-sans">
        <p className="text-floodlight/40">팀 정보를 찾을 수 없습니다.</p>
      </main>
    )
  }

  const league = await getTeamCurrentLeague(id)
  const coach = await getTeamCoach(id, info.team.id)

  const seasons = league
    ? Array.from({ length: SEASONS_BACK }, (_, i) => league.season - (SEASONS_BACK - 1 - i))
    : []

  const ranks = league
    ? await Promise.all(seasons.map((s) => getHistoricalRank(league.id, info.team.id, s)))
    : []

  const validRanks = ranks.filter((r): r is number => r !== null)
  const maxRank = validRanks.length > 0 ? Math.max(...validRanks) : 1

  return (
    <main className="min-h-screen bg-pitch-night text-floodlight font-sans">
      <div className="max-w-4xl mx-auto pb-16 px-4">
        <TeamHeader teamId={id} name={info.team.name} country={info.team.country} logo={info.team.logo} active="history" />

        {coach && (
          <section className="bg-turf/40 border border-turf-line/40 rounded-md p-4 mb-6">
            <p className="text-sm font-medium mb-3">감독</p>
            <div className="flex items-center gap-3">
              <PlayerAvatar
                src={coach.photo}
                alt={coach.name}
                className="w-10 h-10 rounded-full object-cover bg-turf-line text-xs shrink-0"
              />
              <div>
                <p className="text-sm">{coach.name}</p>
                {coach.nationality && <p className="text-xs text-floodlight/40">{coach.nationality}</p>}
              </div>
            </div>
          </section>
        )}

        {seasons.length > 0 && validRanks.length > 0 && (
          <section className="bg-turf/40 border border-turf-line/40 rounded-md p-5">
            <p className="text-sm font-medium mb-6">과거 순위</p>
            <div className="flex items-end justify-between gap-2 h-40">
              {seasons.map((season, i) => {
                const rank = ranks[i]
                // 순위가 높을수록(1위) 막대가 길게 — maxRank 기준 역산
                const heightPct = rank ? ((maxRank - rank + 1) / maxRank) * 100 : 0
                return (
                  <div key={season} className="flex-1 flex flex-col items-center justify-end h-full">
                    {rank && (
                      <span className="text-xs font-data font-bold text-score-amber mb-1">{rank}</span>
                    )}
                    <div
                      className={`w-full rounded-t ${rank ? "bg-score-amber/70" : "bg-transparent"}`}
                      style={{ height: `${heightPct}%`, minHeight: rank ? "4px" : "0" }}
                    />
                    <span className="text-[10px] text-floodlight/40 mt-2 whitespace-nowrap">
                      {String(season).slice(2)}/{String(season + 1).slice(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {(!league || validRanks.length === 0) && (
          <p className="text-floodlight/40 text-sm py-6">과거 순위 정보를 찾을 수 없습니다.</p>
        )}

        <p className="text-[11px] text-floodlight/30 mt-6">
          트로피 수, 감독별 시즌 승률은 API 데이터에 없어 제공하지 않습니다.
        </p>
      </div>
    </main>
  )
}

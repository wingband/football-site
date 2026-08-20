import Link from "next/link"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import { getTeamInfo, getTeamCurrentLeague, getTeamPlayerStats, type TeamPlayerSeasonStat } from "@/lib/teamData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "플레이어 통계를 찾을 수 없습니다" }
  return {
    title: `${info.team.name} 플레이어 통계`,
    description: `${info.team.name} 선수단의 득점, 도움, 평점, 출전 시간 순위를 확인하세요.`,
  }
}

type Row = { id: number; name: string; photo: string; value: number }

function toRows(
  players: TeamPlayerSeasonStat[],
  pick: (p: TeamPlayerSeasonStat) => number | null
): Row[] {
  return players
    .map((p) => ({
      id: p.player.id,
      name: p.player.name,
      photo: p.player.photo,
      value: pick(p) ?? 0,
    }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
}

function LeaderCard({ title, rows, unit }: { title: string; rows: Row[]; unit?: string }) {
  return (
    <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
      <p className="text-sm font-medium mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-floodlight/40 text-xs">데이터가 없습니다.</p>
      ) : (
        <div className="divide-y divide-turf-line/30">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/players/${r.id}`}
              className="flex items-center gap-3 py-2 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
            >
              <PlayerAvatar src={r.photo} alt={r.name} className="w-8 h-8 rounded-full object-cover bg-turf-line text-[10px] shrink-0" />
              <span className="text-sm flex-1 truncate">{r.name}</span>
              <span className="font-data font-bold bg-score-amber/15 text-score-amber px-2 py-0.5 rounded-full shrink-0">
                {r.value}
                {unit}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default async function TeamPlayerStatsPage({
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
  const players = league ? await getTeamPlayerStats(id, league.season) : []

  const goals = toRows(players, (p) => p.statistics[0]?.goals?.total ?? null)
  const assists = toRows(players, (p) => p.statistics[0]?.goals?.assists ?? null)
  const ratings = toRows(players, (p) => Number(p.statistics[0]?.games?.rating) || null)
  const minutes = toRows(players, (p) => p.statistics[0]?.games?.minutes ?? null)

  return (
    <>
{league && (
          <p className="text-xs text-floodlight/40 mb-4">
            {league.name} {league.season} 시즌
          </p>
        )}

        {players.length === 0 ? (
          <p className="text-floodlight/40 text-sm py-6">
            선수 통계 정보가 없습니다.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <LeaderCard title="득점" rows={goals} />
            <LeaderCard title="도움" rows={assists} />
            <LeaderCard title="평점" rows={ratings} />
            <LeaderCard title="출전 시간" rows={minutes} unit="분" />
          </div>
        )}

        <p className="text-[11px] text-floodlight/30 mt-6">
          xG, 태클, 가로채기 등 세부 지표는 API 데이터 한계로 제공하지 않습니다.
        </p>
    </>
  )
}

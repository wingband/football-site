import Link from "next/link"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import SeasonDropdown from "@/components/SeasonDropdown"
import { getSeasonYear } from "@/lib/season"
import Logo from "@/components/Logo"
import {
  getLeagueStandings,
  getLeagueTopScorers,
  getLeagueTopAssists,
  type ScorerEntry,
} from "@/lib/leagueData"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const euroSeason = getSeasonYear("England")
  let data = await getLeagueStandings(id, euroSeason)
  if (!data) data = await getLeagueStandings(id, new Date().getFullYear())

  if (!data) return { title: "플레이어 통계" }

  return {
    title: `${data.league.name} 플레이어 통계`,
    description: `${data.league.name} 선수들의 득점, 도움, 평점, 출전 시간 순위를 확인하세요.`,
  }
}

type Row = { id: number; name: string; photo: string; teamName: string; teamLogo: string; value: string | number }

function LeaderCard({ title, rows }: { title: string; rows: Row[] }) {
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
              className="flex items-center gap-2.5 py-2 hover:bg-turf-line/20 transition-colors -mx-1 px-1"
            >
              <PlayerAvatar src={r.photo} alt={r.name} className="w-8 h-8 rounded-full object-cover bg-turf-line text-[10px] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{r.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Logo src={r.teamLogo} alt="" className="w-3 h-3" />
                  <span className="text-[11px] text-floodlight/40 truncate">{r.teamName}</span>
                </div>
              </div>
              <span className="font-data font-bold bg-score-amber/15 text-score-amber px-2 py-0.5 rounded-full shrink-0 text-sm">
                {r.value}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function buildPool(scorers: ScorerEntry[], assists: ScorerEntry[]) {
  const pool = new Map<number, ScorerEntry>()
  for (const s of [...scorers, ...assists]) pool.set(s.player.id, s)
  return [...pool.values()]
}

export default async function LeaguePlayerStatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ season?: string }>
}) {
  const { id } = await params
  const { season: seasonParam } = await searchParams

  let data: Awaited<ReturnType<typeof getLeagueStandings>> = null
  let selectedSeason: number

  if (seasonParam) {
    selectedSeason = Number(seasonParam)
    data = await getLeagueStandings(id, selectedSeason)
  } else {
    const euroSeason = getSeasonYear("England")
    data = await getLeagueStandings(id, euroSeason)
    selectedSeason = euroSeason
    if (!data) {
      const calendarSeason = new Date().getFullYear()
      data = await getLeagueStandings(id, calendarSeason)
      selectedSeason = calendarSeason
    }
  }

  const displaySeason = data?.league.season ?? selectedSeason

  const [scorers, assists] = data
    ? await Promise.all([getLeagueTopScorers(id, displaySeason), getLeagueTopAssists(id, displaySeason)])
    : [[], []]

  const pool = buildPool(scorers, assists)

  const goalRows: Row[] = [...scorers]
    .sort((a, b) => (b.statistics[0]?.goals.total ?? 0) - (a.statistics[0]?.goals.total ?? 0))
    .slice(0, 5)
    .map((s) => ({
      id: s.player.id,
      name: s.player.name,
      photo: s.player.photo,
      teamName: s.statistics[0]?.team.name ?? "",
      teamLogo: s.statistics[0]?.team.logo ?? "",
      value: s.statistics[0]?.goals.total ?? 0,
    }))

  const assistRows: Row[] = [...assists]
    .sort((a, b) => (b.statistics[0]?.goals.assists ?? 0) - (a.statistics[0]?.goals.assists ?? 0))
    .slice(0, 5)
    .map((s) => ({
      id: s.player.id,
      name: s.player.name,
      photo: s.player.photo,
      teamName: s.statistics[0]?.team.name ?? "",
      teamLogo: s.statistics[0]?.team.logo ?? "",
      value: s.statistics[0]?.goals.assists ?? 0,
    }))

  const gaRows: Row[] = pool
    .map((s) => ({
      id: s.player.id,
      name: s.player.name,
      photo: s.player.photo,
      teamName: s.statistics[0]?.team.name ?? "",
      teamLogo: s.statistics[0]?.team.logo ?? "",
      value: (s.statistics[0]?.goals.total ?? 0) + (s.statistics[0]?.goals.assists ?? 0),
    }))
    .sort((a, b) => Number(b.value) - Number(a.value))
    .slice(0, 5)

  const ratingRows: Row[] = pool
    .filter((s) => s.statistics[0]?.games.rating)
    .sort((a, b) => Number(b.statistics[0].games.rating) - Number(a.statistics[0].games.rating))
    .slice(0, 5)
    .map((s) => ({
      id: s.player.id,
      name: s.player.name,
      photo: s.player.photo,
      teamName: s.statistics[0]?.team.name ?? "",
      teamLogo: s.statistics[0]?.team.logo ?? "",
      value: s.statistics[0]?.games.rating ?? "-",
    }))

  return (
    <>
      <div className="flex justify-end mb-4">
        <SeasonDropdown currentSeason={displaySeason} />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <LeaderCard title="득점" rows={goalRows} />
        <LeaderCard title="도움" rows={assistRows} />
        <LeaderCard title="득점 + 도움" rows={gaRows} />
        <LeaderCard title="평점" rows={ratingRows} />
      </div>

      <p className="text-[11px] text-floodlight/30 mt-6 leading-relaxed">
        출전 시간, xG, xGOT, 90분당 지표, 큰 기회 만듦 등 세부 지표는 API 데이터에 없어 제공하지 않습니다.
        위 순위는 득점왕·도움왕 명단을 기반으로 한 것이라, 그 명단 밖의 선수는 포함되지 않을 수 있습니다.
      </p>
    </>
  )
}

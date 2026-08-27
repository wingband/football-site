export const dynamic = 'force-dynamic'

import Link from "next/link"
import { matchHref } from "@/lib/slug"
import type { Metadata } from "next"
import PlayerAvatar from "@/components/PlayerAvatar"
import StandingsWithFilter from "@/components/StandingsWithFilter"
import {
  getTeamInfo,
  getTeamSeasonFixtures,
  getTeamInjuries,
  getTeamCoach,
  getTeamCurrentLeague,
  getTeamNews,
  type TeamFixture,
} from "@/lib/teamData"
import { getLeagueStandings, getLeagueFixturesByMode, buildNextOpponentMap } from "@/lib/leagueData"
import Logo from "@/components/Logo"

const FINISHED_CODES = ["FT", "AET", "PEN"]

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const info = await getTeamInfo(id)
  if (!info) return { title: "팀 정보를 찾을 수 없습니다" }
  return {
    title: `${info.team.name} 팀 개요`,
    description: `${info.team.name}의 최근 경기, 다음 경기, 리그 순위, 감독, 부상 명단, 뉴스를 확인하세요.`,
  }
}

// 팀 기록: 최근 5경기 결과 배지 (FotMob 스타일)
function RecentFormBadges({ fixtures, teamId }: { fixtures: TeamFixture[]; teamId: number }) {
  const finished = fixtures
    .filter((f) => FINISHED_CODES.includes(f.fixture.status.short))
    .sort((a, b) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
    .slice(0, 5)
    .reverse()

  if (finished.length === 0) {
    return <p className="text-floodlight/40 text-xs">최근 경기 기록이 없습니다.</p>
  }

  return (
    <div className="flex gap-3">
      {finished.map((fx) => {
        const isHome = fx.teams.home.id === teamId
        const own = isHome ? fx.goals.home : fx.goals.away
        const opp = isHome ? fx.goals.away : fx.goals.home
        const opponent = isHome ? fx.teams.away : fx.teams.home
        const color =
          own === null || opp === null
            ? "bg-floodlight/15"
            : own > opp
              ? "bg-green-600 text-white"
              : own < opp
                ? "bg-red-500/80 text-white"
                : "bg-floodlight/30 text-floodlight"

        return (
          <Link key={fx.fixture.id} href={matchHref(fx)} className="flex flex-col items-center gap-2">
            <span className={`px-2.5 py-1 rounded font-data text-sm font-bold ${color}`}>
              {fx.goals.home ?? "-"} - {fx.goals.away ?? "-"}
            </span>
            <Logo src={opponent.logo} alt="" className="w-6 h-6" />
          </Link>
        )
      })}
    </div>
  )
}

export default async function TeamOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const info = await getTeamInfo(id)

  if (!info) {
    return <p className="text-floodlight/40 pt-4">팀 정보를 찾을 수 없습니다.</p>
  }

  const teamLeague = await getTeamCurrentLeague(id)
  const season = teamLeague?.season ?? new Date().getFullYear()

  const [fixtures, injuries, coach, news, standingsData, leagueUpcoming] = await Promise.all([
    getTeamSeasonFixtures(id, season),
    getTeamInjuries(id, season),
    getTeamCoach(id, info.team.id),
    getTeamNews(info.team.name),
    teamLeague ? getLeagueStandings(String(teamLeague.id), season) : Promise.resolve(null),
    teamLeague ? getLeagueFixturesByMode(String(teamLeague.id), season, "next", 10) : Promise.resolve([]),
  ])

  const nextOpponent = buildNextOpponentMap(leagueUpcoming)

  const upcoming = fixtures
    .filter((f) => !FINISHED_CODES.includes(f.fixture.status.short))
    .sort((a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime())
  const nextFixture = upcoming[0] ?? null

  // 부상 명단 중복 제거 (같은 선수가 여러 건으로 잡히는 경우)
  const uniqueInjuries = [...new Map(injuries.map((i) => [i.player.id, i])).values()]

  return (
    <>
        {/* 상단: 팀 기록 + 다음 경기 */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
            <p className="text-sm font-medium mb-3">팀 기록</p>
            <RecentFormBadges fixtures={fixtures} teamId={info.team.id} />
          </div>

          {nextFixture && (
            <Link
              href={matchHref(nextFixture)}
              className="bg-turf/40 border border-turf-line/40 rounded-md p-4 hover:bg-turf-line/20 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">다음 경기</p>
                {nextFixture.league?.name && (
                  <span className="text-xs text-floodlight/40">{nextFixture.league.name}</span>
                )}
              </div>
              <div className="flex items-center justify-around">
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <Logo src={nextFixture.teams.home.logo} alt="" className="w-9 h-9" />
                  <span className="text-xs truncate">{nextFixture.teams.home.name}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-data text-score-amber">
                    {new Date(nextFixture.fixture.date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="text-[11px] text-floodlight/40">
                    {new Date(nextFixture.fixture.date).toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
                  </span>
                </div>
                <div className="flex flex-col items-center gap-1.5 min-w-0">
                  <Logo src={nextFixture.teams.away.logo} alt="" className="w-9 h-9" />
                  <span className="text-xs truncate">{nextFixture.teams.away.name}</span>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* 리그 순위표 */}
          <div>
            {standingsData && standingsData.league.standings.length > 0 ? (
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  {teamLeague?.name}
                </p>
                <StandingsWithFilter
                  standings={standingsData.league.standings}
                  highlightTeamIds={[info.team.id]}
                  nextOpponent={nextOpponent}
                  showFilter={false}
                />
              </div>
            ) : (
              <p className="text-floodlight/40 text-sm">순위표 정보가 없습니다.</p>
            )}
          </div>

          {/* 우측: 감독 / 부상 / 경기장 */}
          <div className="space-y-4">
            {coach && (
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-sm font-medium mb-3">감독</p>
                <div className="flex items-center gap-3">
                  <PlayerAvatar
                    src={coach.photo}
                    alt={coach.name}
                    className="w-11 h-11 rounded-full object-cover bg-turf-line text-sm shrink-0"
                  />
                  <div>
                    <p className="text-sm">{coach.name}</p>
                    <p className="text-xs text-floodlight/40">{coach.nationality}</p>
                  </div>
                </div>
              </div>
            )}

            {uniqueInjuries.length > 0 && (
              <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
                <p className="text-sm font-medium mb-3">부상/결장 명단</p>
                <div className="space-y-3">
                  {uniqueInjuries.slice(0, 8).map((inj) => (
                    <div key={inj.player.id} className="flex items-center gap-3">
                      <PlayerAvatar
                        src={inj.player.photo}
                        alt={inj.player.name}
                        className="w-8 h-8 rounded-full object-cover bg-turf-line text-xs shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-sm truncate">{inj.player.name}</p>
                        <p className="text-[11px] text-floodlight/40">{inj.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-turf/40 border border-turf-line/40 rounded-md p-4">
              <p className="text-sm font-medium mb-3">경기장</p>
              <p className="text-sm">{info.venue?.name}</p>
              <p className="text-xs text-floodlight/40 mt-0.5">{info.venue?.city}</p>
              <div className="flex justify-between text-xs mt-3">
                <span className="text-floodlight/50">수용 능력</span>
                <span className="font-data">{info.venue?.capacity?.toLocaleString?.() ?? "-"}</span>
              </div>
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-floodlight/50">창단</span>
                <span className="font-data">{info.team.founded}년</span>
              </div>
            </div>
          </div>
        </div>

        {/* 뉴스 */}
        {news.length > 0 && (
          <section className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display uppercase tracking-wide text-sm text-floodlight/70">뉴스</h2>
              <Link href={`/teams/${id}/news`} className="text-xs text-floodlight/40 hover:text-score-amber">
                전체 보기 →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {news.slice(0, 4).map((a, i) => (
                <a
                  key={i}
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 items-start hover:bg-turf-line/20 transition-colors p-1 -m-1"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-floodlight/90 leading-snug line-clamp-2">{a.title}</p>
                    <p className="text-xs text-floodlight/40 mt-1">
                      {a.source_name} · {new Date(a.pubDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                  {a.image_url && (
                    <img src={a.image_url} alt="" className="w-24 h-16 object-cover shrink-0 rounded" />
                  )}
                </a>
              ))}
            </div>
          </section>
        )}
    </>
  )
}
